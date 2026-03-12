from rest_framework import serializers
from .models import WatchHistory


class WatchProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchHistory
        fields = ['video', 'watch_duration', 'watch_percentage']


class WatchHistorySerializer(serializers.ModelSerializer):
    video_title = serializers.CharField(source='video.title', read_only=True)
    video_thumbnail = serializers.ImageField(source='video.thumbnail', read_only=True)
    video_id = serializers.UUIDField(source='video.id', read_only=True)

    class Meta:
        model = WatchHistory
        fields = ['id', 'video_id', 'video_title', 'video_thumbnail',
                  'watch_duration', 'watch_percentage', 'created_at', 'updated_at']
