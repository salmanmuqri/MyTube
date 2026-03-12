import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('videos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Playlist',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('is_public', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='playlists',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PlaylistVideo',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('playlist', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='playlist_videos',
                    to='videos.playlist',
                )),
                ('video', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='in_playlists',
                    to='videos.video',
                )),
            ],
            options={
                'ordering': ['position', 'added_at'],
                'unique_together': {('playlist', 'video')},
            },
        ),
    ]
