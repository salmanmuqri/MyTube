import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from . import admin_views


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),

    # App APIs
    path('api/users/', include('users.urls')),
    path('api/videos/', include('videos.urls')),
    path('api/recommendations/', include('recommendations.urls')),
    path('api/analytics/', include('analytics_app.urls')),

    # Admin API
    path('api/admin-panel/dashboard/', admin_views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/admin-panel/activity/', admin_views.AdminActivityView.as_view(), name='admin-activity'),
    path('api/admin-panel/users/', admin_views.AdminUserListView.as_view(), name='admin-users'),
    path('api/admin-panel/users/<uuid:user_id>/', admin_views.AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('api/admin-panel/videos/', admin_views.AdminVideoListView.as_view(), name='admin-videos'),
    path('api/admin-panel/videos/<uuid:video_id>/', admin_views.AdminVideoDetailView.as_view(), name='admin-video-detail'),
    path('api/admin-panel/categories/', admin_views.AdminCategoryListView.as_view(), name='admin-categories'),
    path('api/admin-panel/categories/<uuid:cat_id>/', admin_views.AdminCategoryDetailView.as_view(), name='admin-category-detail'),
    path('api/admin-panel/trigger-trending/', admin_views.AdminTriggerTrendingView.as_view(), name='admin-trigger-trending'),
    path('api/admin-panel/trigger-retrain/', admin_views.AdminTriggerRetrainView.as_view(), name='admin-trigger-retrain'),
]

if settings.DEBUG or os.environ.get('ENABLE_MEDIA_SERVING', 'False').lower() in ('true', '1'):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
