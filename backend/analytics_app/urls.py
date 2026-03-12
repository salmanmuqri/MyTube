from django.urls import path
from . import views

urlpatterns = [
    path('watch-progress/', views.WatchProgressView.as_view(), name='watch-progress'),
    path('history/', views.UserWatchHistoryView.as_view(), name='watch-history'),
    path('user-stats/', views.UserStatsView.as_view(), name='user-stats'),
    path('video-stats/<uuid:video_id>/', views.VideoStatsView.as_view(), name='video-stats'),
]
