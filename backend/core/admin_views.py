"""
Admin API views — all require IsAuthenticated + is_staff/is_superuser or role=='admin'
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') == 'admin')
        )


# ──────────────────────────────────────────────
# Dashboard Stats
# ──────────────────────────────────────────────
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from users.models import User
        from videos.models import Video
        from analytics_app.models import WatchHistory

        week_ago = timezone.now() - timedelta(days=7)

        total_users = User.objects.count()
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()
        total_videos = Video.objects.count()
        ready_videos = Video.objects.filter(status='READY').count()
        processing_videos = Video.objects.filter(status='PROCESSING').count()
        failed_videos = Video.objects.filter(status='FAILED').count()
        total_views = Video.objects.aggregate(t=Sum('views_count'))['t'] or 0
        total_likes = Video.objects.aggregate(t=Sum('likes_count'))['t'] or 0
        watch_events = WatchHistory.objects.count()
        recent_activity = WatchHistory.objects.filter(updated_at__gte=week_ago).count()

        return Response({
            'users': {
                'total': total_users,
                'new_this_week': new_users_week,
            },
            'videos': {
                'total': total_videos,
                'ready': ready_videos,
                'processing': processing_videos,
                'failed': failed_videos,
            },
            'engagement': {
                'total_views': total_views,
                'total_likes': total_likes,
                'watch_events': watch_events,
                'recent_watches': recent_activity,
            }
        })


# ──────────────────────────────────────────────
# User Management
# ──────────────────────────────────────────────
class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        from users.models import User
        qs = User.objects.order_by('-date_joined')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(email__icontains=search)
        return qs

    def list(self, request, *args, **kwargs):
        from users.models import User
        qs = User.objects.order_by('-date_joined')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(email__icontains=search)

        data = [
            {
                'id': str(u.id),
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'subscribers_count': u.subscribers_count,
                'video_count': u.videos.count(),
                'date_joined': u.date_joined.isoformat(),
            }
            for u in qs[:200]
        ]
        return Response({'count': len(data), 'results': data})


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        from users.models import User
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        allowed_fields = ['is_active', 'role', 'is_staff']
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response({
            'id': str(user.id),
            'username': user.username,
            'is_active': user.is_active,
            'role': user.role,
            'is_staff': user.is_staff,
        })

    def delete(self, request, user_id):
        from users.models import User
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        if user == request.user:
            return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
# Video Management
# ──────────────────────────────────────────────
class AdminVideoListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from videos.models import Video
        qs = Video.objects.select_related('uploader', 'category').order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(title__icontains=search)
        video_status = request.query_params.get('status')
        if video_status:
            qs = qs.filter(status=video_status)

        data = [
            {
                'id': str(v.id),
                'title': v.title,
                'uploader': v.uploader.username,
                'uploader_id': str(v.uploader.id),
                'status': v.status,
                'views_count': v.views_count,
                'likes_count': v.likes_count,
                'comments_count': v.comments_count,
                'duration': v.duration,
                'category': v.category.name if v.category else None,
                'thumbnail': v.thumbnail.url if v.thumbnail else None,
                'created_at': v.created_at.isoformat(),
            }
            for v in qs[:500]
        ]
        return Response({'count': len(data), 'results': data})


class AdminVideoDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, video_id):
        from videos.models import Video
        from django.shortcuts import get_object_or_404
        video = get_object_or_404(Video, id=video_id)
        allowed_fields = ['status', 'title', 'description']
        for field in allowed_fields:
            if field in request.data:
                setattr(video, field, request.data[field])
        video.save()
        return Response({'id': str(video.id), 'status': video.status, 'title': video.title})

    def delete(self, request, video_id):
        from videos.models import Video
        from django.shortcuts import get_object_or_404
        video = get_object_or_404(Video, id=video_id)
        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
# Category Management
# ──────────────────────────────────────────────
class AdminCategoryListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from videos.models import Category
        cats = Category.objects.annotate(video_count=Count('videos')).order_by('name')
        data = [{'id': str(c.id), 'name': c.name, 'slug': c.slug, 'video_count': c.video_count} for c in cats]
        return Response(data)

    def post(self, request):
        from videos.models import Category
        from django.utils.text import slugify
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Name required'}, status=status.HTTP_400_BAD_REQUEST)
        slug = slugify(name)
        cat, created = Category.objects.get_or_create(slug=slug, defaults={'name': name})
        return Response({'id': str(cat.id), 'name': cat.name, 'slug': cat.slug, 'created': created},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AdminCategoryDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, cat_id):
        from videos.models import Category
        from django.shortcuts import get_object_or_404
        cat = get_object_or_404(Category, id=cat_id)
        cat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
# Trigger tasks
# ──────────────────────────────────────────────
class AdminTriggerTrendingView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from videos.tasks import calculate_trending_scores
        calculate_trending_scores()
        return Response({'message': 'Trending scores recalculated'})


class AdminTriggerRetrainView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from recommendations.views import _recommender
        from videos.models import Video
        all_videos = list(Video.objects.filter(status='READY').select_related('category').prefetch_related('tags'))
        _recommender.fit(all_videos)
        return Response({'message': f'Model retrained on {len(all_videos)} videos'})


# ──────────────────────────────────────────────
# Recent activity
# ──────────────────────────────────────────────
class AdminActivityView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from videos.models import Video
        from users.models import User
        recent_videos = Video.objects.select_related('uploader').order_by('-created_at')[:10]
        recent_users = User.objects.order_by('-date_joined')[:10]
        return Response({
            'recent_videos': [
                {
                    'id': str(v.id), 'title': v.title,
                    'uploader': v.uploader.username, 'status': v.status,
                    'created_at': v.created_at.isoformat(),
                } for v in recent_videos
            ],
            'recent_users': [
                {
                    'id': str(u.id), 'username': u.username,
                    'email': u.email, 'date_joined': u.date_joined.isoformat(),
                } for u in recent_users
            ],
        })
