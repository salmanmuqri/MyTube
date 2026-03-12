from rest_framework import serializers
from videos.serializers import VideoListSerializer
from .models import RecommendationLog


class RecommendationLogSerializer(serializers.ModelSerializer):
    video = VideoListSerializer(read_only=True)

    class Meta:
        model = RecommendationLog
        fields = ['id', 'video', 'score', 'algorithm', 'created_at']
