import uuid
from django.db import models
from django.conf import settings


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Video(models.Model):
    STATUS_CHOICES = [
        ('PROCESSING', 'Processing'),
        ('READY', 'Ready'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='videos')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='videos')
    tags = models.ManyToManyField(Tag, blank=True, related_name='videos')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROCESSING')
    original_file = models.FileField(upload_to='originals/', max_length=500, blank=True, null=True)
    hls_path = models.CharField(max_length=500, blank=True, default='')
    thumbnail = models.ImageField(upload_to='thumbnails/', max_length=500, blank=True, null=True)
    duration = models.FloatField(default=0)
    views_count = models.PositiveIntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    trending_score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def hls_url(self):
        if self.hls_path:
            return f'{settings.MEDIA_URL}{self.hls_path}'
        return ''


class Like(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')

    def __str__(self):
        return f'{self.user.username} likes {self.video.title}'


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    text = models.TextField(max_length=2000)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username}: {self.text[:50]}'


class Playlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='playlists')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.owner.username})'

    @property
    def video_count(self):
        return self.playlist_videos.count()

    @property
    def thumbnail(self):
        first = self.playlist_videos.select_related('video').first()
        return first.video.thumbnail if first else None


class PlaylistVideo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name='playlist_videos')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='in_playlists')
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('playlist', 'video')
        ordering = ['position', 'added_at']

    def __str__(self):
        return f'{self.playlist.name} → {self.video.title}'
