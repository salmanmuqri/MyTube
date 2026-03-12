from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Avg, Count
from videos.models import Video
from .models import WatchHistory
from .serializers import WatchProgressSerializer, WatchHistorySerializer


class WatchProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = WatchProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        video = get_object_or_404(Video, id=serializer.validated_data['video'].id)

        history, created = WatchHistory.objects.update_or_create(
            user=request.user,
            video=video,
            defaults={
                'watch_duration': serializer.validated_data['watch_duration'],
                'watch_percentage': min(100, serializer.validated_data['watch_percentage']),
            }
        )
        if created:
            video.views_count += 1
            video.save(update_fields=['views_count'])

        return Response({'status': 'recorded', 'watch_percentage': history.watch_percentage})


class UserWatchHistoryView(generics.ListAPIView):
    serializer_class = WatchHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WatchHistory.objects.filter(user=self.request.user).select_related('video')


class UserStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats = WatchHistory.objects.filter(user=request.user).aggregate(
            total_watched=Count('id'),
            total_duration=Sum('watch_duration'),
            avg_completion=Avg('watch_percentage'),
        )
        return Response({
            'total_videos_watched': stats['total_watched'] or 0,
            'total_watch_duration_seconds': round(stats['total_duration'] or 0, 1),
            'average_completion_rate': round(stats['avg_completion'] or 0, 1),
        })


class VideoStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        stats = WatchHistory.objects.filter(video=video).aggregate(
            total_views=Count('id'),
            total_duration=Sum('watch_duration'),
            avg_completion=Avg('watch_percentage'),
        )
        return Response({
            'video_id': str(video.id),
            'total_views': stats['total_views'] or 0,
            'total_watch_duration': round(stats['total_duration'] or 0, 1),
            'average_completion_rate': round(stats['avg_completion'] or 0, 1),
        })
