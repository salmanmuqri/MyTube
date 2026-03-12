import uuid
from django.db import models
from django.conf import settings


class WatchHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watch_history')
    video = models.ForeignKey('videos.Video', on_delete=models.CASCADE, related_name='watch_history')
    watch_duration = models.FloatField(default=0)
    watch_percentage = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'video')
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user.username} watched {self.video.title} ({self.watch_percentage:.0f}%)'
