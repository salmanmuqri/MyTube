from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('<uuid:id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<uuid:user_id>/subscribe/', views.SubscribeView.as_view(), name='subscribe'),
    path('subscriptions/', views.SubscriptionListView.as_view(), name='subscription-list'),
    path('subscriptions/feed/', views.SubscriptionFeedView.as_view(), name='subscription-feed'),
    path('<uuid:user_id>/subscription-check/', views.SubscriptionCheckView.as_view(), name='subscription-check'),
]
