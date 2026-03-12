import uuid
from django.db import models
from django.conf import settings


class UserPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preference')
    preference_vector = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Preferences for {self.user.username}'


class RecommendationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendation_logs')
    video = models.ForeignKey('videos.Video', on_delete=models.CASCADE, related_name='recommendation_logs')
    score = models.FloatField(default=0)
    algorithm = models.CharField(max_length=50, default='content_based')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score']

    def __str__(self):
        return f'{self.user.username} -> {self.video.title} ({self.score})'
