import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from videos.models import Video
from videos.serializers import VideoListSerializer
from analytics_app.models import WatchHistory
from .engine import ContentBasedRecommender

logger = logging.getLogger(__name__)
_recommender = ContentBasedRecommender()


class RecommendationsForMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        watched_entries = WatchHistory.objects.filter(user=request.user).select_related('video').order_by('-watch_percentage')[:20]
        watched_videos = [entry.video for entry in watched_entries if entry.video.status == 'READY']
        all_videos = list(Video.objects.filter(status='READY').select_related('category').prefetch_related('tags'))

        if not watched_videos or len(all_videos) < 2:
            # Cold start: return trending
            trending = Video.objects.filter(status='READY').order_by('-trending_score', '-views_count')[:20]
            serializer = VideoListSerializer(trending, many=True, context={'request': request})
            return Response(serializer.data)

        try:
            results = _recommender.recommend_for_user(request.user, watched_videos, all_videos, n=20)
            rec_ids = [r[0] for r in results]
            videos = Video.objects.filter(id__in=rec_ids).select_related('uploader', 'category')
            id_to_video = {str(v.id): v for v in videos}
            ordered = [id_to_video[vid] for vid in rec_ids if vid in id_to_video]
            serializer = VideoListSerializer(ordered, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.error(f'Recommendation error: {e}')
            trending = Video.objects.filter(status='READY').order_by('-trending_score', '-views_count')[:20]
            serializer = VideoListSerializer(trending, many=True, context={'request': request})
            return Response(serializer.data)


class SimilarVideosView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, video_id):
        all_videos = list(Video.objects.filter(status='READY').select_related('category').prefetch_related('tags'))
        try:
            results = _recommender.similar_videos(video_id, all_videos, n=10)
            sim_ids = [r[0] for r in results]
            videos = Video.objects.filter(id__in=sim_ids).select_related('uploader', 'category')
            id_to_video = {str(v.id): v for v in videos}
            ordered = [id_to_video[vid] for vid in sim_ids if vid in id_to_video]
            serializer = VideoListSerializer(ordered, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.error(f'Similar videos error: {e}')
            return Response([])


class RetrainView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        all_videos = list(Video.objects.filter(status='READY').select_related('category').prefetch_related('tags'))
        _recommender.fit(all_videos)
        return Response({'message': f'Model retrained with {len(all_videos)} videos'})
