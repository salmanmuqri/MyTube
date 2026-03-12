from django.urls import path
from . import views

urlpatterns = [
    path('for-me/', views.RecommendationsForMeView.as_view(), name='recommendations-for-me'),
    path('similar/<uuid:video_id>/', views.SimilarVideosView.as_view(), name='similar-videos'),
    path('retrain/', views.RetrainView.as_view(), name='retrain-model'),
]
