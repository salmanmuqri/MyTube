from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.VideoUploadView.as_view(), name='video-upload'),
    path('', views.VideoListView.as_view(), name='video-list'),
    path('my-videos/', views.MyVideosView.as_view(), name='my-videos'),
    path('trending/', views.TrendingVideosView.as_view(), name='trending-videos'),
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('tags/', views.TagListView.as_view(), name='tag-list'),
    path('<uuid:id>/', views.VideoDetailView.as_view(), name='video-detail'),
    path('<uuid:id>/delete/', views.VideoDeleteView.as_view(), name='video-delete'),
    path('<uuid:id>/update/', views.VideoUpdateView.as_view(), name='video-update'),
    path('<uuid:video_id>/like/', views.LikeVideoView.as_view(), name='video-like'),
    path('<uuid:video_id>/comments/', views.CommentListCreateView.as_view(), name='video-comments'),
    path('comments/<uuid:id>/delete/', views.CommentDeleteView.as_view(), name='comment-delete'),
    path('<uuid:video_id>/view/', views.IncrementViewView.as_view(), name='video-view'),
    path('search-suggestions/', views.SearchSuggestionsView.as_view(), name='search-suggestions'),
    path('playlists/', views.PlaylistListCreateView.as_view(), name='playlist-list-create'),
    path('playlists/user/<uuid:user_id>/', views.PublicPlaylistsView.as_view(), name='user-playlists'),
    path('playlists/<uuid:id>/', views.PlaylistDetailView.as_view(), name='playlist-detail'),
    path('playlists/<uuid:playlist_id>/add-video/', views.PlaylistAddVideoView.as_view(), name='playlist-add-video'),
    path('playlists/<uuid:playlist_id>/remove-video/<uuid:video_id>/', views.PlaylistRemoveVideoView.as_view(), name='playlist-remove-video'),
]
