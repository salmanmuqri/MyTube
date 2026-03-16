from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Video, Category, Tag, Like, Comment, Playlist, PlaylistVideo
from .serializers import (
    VideoListSerializer, VideoDetailSerializer, VideoUploadSerializer,
    VideoUpdateSerializer, CommentSerializer, CategorySerializer, TagSerializer,
    PlaylistSerializer, PlaylistDetailSerializer, PlaylistVideoSerializer
)
from .tasks import process_video_celery


class VideoUploadView(generics.CreateAPIView):
    serializer_class = VideoUploadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        video = serializer.save()
        # Dispatch to the dedicated Celery worker (survives Gunicorn recycling)
        process_video_celery.delay(str(video.id))
        return Response(VideoListSerializer(video).data, status=status.HTTP_201_CREATED)


class VideoListView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'uploader']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'views_count', 'likes_count', 'trending_score']

    def get_queryset(self):
        qs = Video.objects.select_related('uploader', 'category').prefetch_related('tags')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(uploader__username__icontains=search)
            )
        cat = self.request.query_params.get('cat')
        if cat:
            qs = qs.filter(category__slug=cat)
        status_filter = self.request.query_params.get('video_status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(status='READY')
        return qs


class VideoDetailView(generics.RetrieveAPIView):
    queryset = Video.objects.select_related('uploader', 'category').prefetch_related('tags')
    serializer_class = VideoDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'


class VideoDeleteView(generics.DestroyAPIView):
    queryset = Video.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Video.objects.filter(uploader=self.request.user)


class VideoUpdateView(generics.UpdateAPIView):
    serializer_class = VideoUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    http_method_names = ['patch']

    def get_queryset(self):
        return Video.objects.filter(uploader=self.request.user)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class MyVideosView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Video.objects.filter(uploader=self.request.user).select_related('uploader', 'category')


class TrendingVideosView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (Video.objects.filter(status='READY')
                .select_related('uploader', 'category')
                .order_by('-trending_score', '-views_count')[:50])


class LikeVideoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        like, created = Like.objects.get_or_create(user=request.user, video=video)
        if not created:
            like.delete()
            video.likes_count = max(0, video.likes_count - 1)
            video.save(update_fields=['likes_count'])
            return Response({'liked': False, 'likes_count': video.likes_count})
        video.likes_count += 1
        video.save(update_fields=['likes_count'])
        return Response({'liked': True, 'likes_count': video.likes_count}, status=status.HTTP_201_CREATED)


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return (Comment.objects.filter(video_id=self.kwargs['video_id'], parent__isnull=True)
                .select_related('user').prefetch_related('replies__user'))

    def perform_create(self, serializer):
        video = get_object_or_404(Video, id=self.kwargs['video_id'])
        serializer.save(user=self.request.user, video=video)
        video.comments_count += 1
        video.save(update_fields=['comments_count'])


class CommentDeleteView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Comment.objects.filter(user=self.request.user)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class IncrementViewView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        video.views_count += 1
        video.save(update_fields=['views_count'])
        return Response({'views_count': video.views_count})


class SearchSuggestionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response({'titles': [], 'channels': []})
        titles = list(
            Video.objects.filter(title__icontains=q, status='READY')
            .values_list('title', flat=True).distinct()[:6]
        )
        from users.models import User
        channels = list(
            User.objects.filter(username__icontains=q)
            .values('id', 'username', 'avatar', 'subscribers_count')[:4]
        )
        return Response({'titles': titles, 'channels': channels})


class PlaylistListCreateView(generics.ListCreateAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Playlist.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PublicPlaylistsView(generics.ListAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Playlist.objects.filter(owner_id=user_id, is_public=True).order_by('-created_at')


class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlaylistDetailSerializer
    lookup_field = 'id'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.method == 'GET':
            return Playlist.objects.filter(Q(is_public=True) | Q(owner=self.request.user if self.request.user.is_authenticated else None))
        return Playlist.objects.filter(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class PlaylistAddVideoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, playlist_id):
        playlist = get_object_or_404(Playlist, id=playlist_id, owner=request.user)
        video_id = request.data.get('video')
        if not video_id:
            return Response({'error': 'video id required'}, status=status.HTTP_400_BAD_REQUEST)
        video = get_object_or_404(Video, id=video_id, status='READY')
        if PlaylistVideo.objects.filter(playlist=playlist, video=video).exists():
            return Response({'error': 'Video already in playlist'}, status=status.HTTP_400_BAD_REQUEST)
        position = PlaylistVideo.objects.filter(playlist=playlist).count()
        pv = PlaylistVideo.objects.create(playlist=playlist, video=video, position=position)
        return Response(PlaylistVideoSerializer(pv).data, status=status.HTTP_201_CREATED)


class PlaylistRemoveVideoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, playlist_id, video_id):
        playlist = get_object_or_404(Playlist, id=playlist_id, owner=request.user)
        pv = get_object_or_404(PlaylistVideo, playlist=playlist, video_id=video_id)
        pv.delete()
        # reorder remaining
        for i, item in enumerate(PlaylistVideo.objects.filter(playlist=playlist).order_by('position')):
            item.position = i
            item.save(update_fields=['position'])
        return Response(status=status.HTTP_204_NO_CONTENT)
