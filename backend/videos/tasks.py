import os
import subprocess
import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def _run_ffprobe_duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', path],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode == 0 and result.stdout.strip():
        return float(result.stdout.strip())
    return 0


def process_video_task(video_id):
    """Process video inline (non-Celery path) — called via thread."""
    _do_process_video(video_id)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_video_celery(self, video_id):
    """Celery version — used when broker is available."""
    try:
        _do_process_video(video_id)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def calculate_trending_task():
    """Scheduled task: recalculate trending scores for all videos."""
    calculate_trending_scores()


def _do_process_video(video_id):
    """Core video processing logic shared by both paths."""
    from .models import Video

    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        logger.error(f'Video {video_id} not found')
        return

    original_path = os.path.join(settings.MEDIA_ROOT, str(video.original_file))
    if not os.path.exists(original_path):
        video.status = 'FAILED'
        video.save(update_fields=['status'])
        return

    hls_dir = os.path.join(settings.MEDIA_ROOT, 'hls', str(video.id))
    os.makedirs(hls_dir, exist_ok=True)

    try:
        # 1. Extract duration
        dur = _run_ffprobe_duration(original_path)
        if dur:
            video.duration = dur

        # 2. Generate thumbnail at 2-second mark
        thumb_path = os.path.join(settings.MEDIA_ROOT, 'thumbnails', f'{video.id}.jpg')
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        subprocess.run(
            ['ffmpeg', '-y', '-i', original_path, '-ss', '00:00:02',
             '-vframes', '1', '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
             thumb_path],
            capture_output=True, timeout=30
        )
        if os.path.exists(thumb_path):
            video.thumbnail = f'thumbnails/{video.id}.jpg'

        # 3. Transcode to HLS streams (skip qualities higher than source)
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
             '-show_entries', 'stream=height', '-of', 'default=noprint_wrappers=1:nokey=1',
             original_path],
            capture_output=True, text=True, timeout=15
        )
        source_height = int(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip().isdigit() else 9999

        qualities = [
            {'name': '1080p', 'height': 1080, 'bitrate': '5000k', 'audio': '192k'},
            {'name': '720p',  'height': 720,  'bitrate': '3000k', 'audio': '128k'},
            {'name': '480p',  'height': 480,  'bitrate': '1500k', 'audio': '128k'},
        ]
        # Only transcode to qualities <= source resolution
        qualities = [q for q in qualities if q['height'] <= source_height + 100]
        if not qualities:
            qualities = [{'name': '480p', 'height': 480, 'bitrate': '1500k', 'audio': '128k'}]

        master_lines = ['#EXTM3U', '#EXT-X-VERSION:3']

        for q in qualities:
            q_dir = os.path.join(hls_dir, q['name'])
            os.makedirs(q_dir, exist_ok=True)
            output_m3u8 = os.path.join(q_dir, f'{q["name"]}.m3u8')

            cmd = [
                'ffmpeg', '-y', '-i', original_path,
                '-vf', f'scale=-2:{q["height"]}',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-b:v', q['bitrate'],
                '-c:a', 'aac', '-b:a', q['audio'],
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', os.path.join(q_dir, 'segment-%03d.ts'),
                output_m3u8
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=3600)
            if result.returncode != 0:
                logger.error(f'FFmpeg failed for {q["name"]}: {result.stderr.decode()[:500]}')
                continue

            bandwidth = int(q['bitrate'].replace('k', '')) * 1000
            resolution = f'auto,RESOLUTION=1920x{q["height"]}' if q['height'] == 1080 else (
                f'auto,RESOLUTION=1280x{q["height"]}' if q['height'] == 720 else f'auto,RESOLUTION=854x{q["height"]}'
            )
            master_lines.append(f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},{resolution},NAME="{q["name"]}"')
            master_lines.append(f'{q["name"]}/{q["name"]}.m3u8')

        master_path = os.path.join(hls_dir, 'master.m3u8')
        with open(master_path, 'w') as f:
            f.write('\n'.join(master_lines) + '\n')

        video.hls_path = f'hls/{video.id}/master.m3u8'
        video.status = 'READY'

        # 5. Clean up original file
        try:
            if os.path.exists(original_path):
                os.remove(original_path)
                video.original_file = ''
        except OSError:
            pass  # Keep original if removal fails

    except Exception as e:
        logger.error(f'Video processing failed for {video_id}: {e}', exc_info=True)
        video.status = 'FAILED'

    video.save()


def calculate_trending_scores():
    """Recalculate trending scores for all READY videos."""
    from .models import Video
    from analytics_app.models import WatchHistory
    from django.utils import timezone
    from datetime import timedelta

    week_ago = timezone.now() - timedelta(days=7)
    videos = Video.objects.filter(status='READY')

    for video in videos:
        recent_views = WatchHistory.objects.filter(
            video=video, updated_at__gte=week_ago
        ).count()

        days_old = max(1, (timezone.now() - video.created_at).days)
        decay = 1 / (1 + days_old * 0.1)

        score = (
            video.views_count * 0.4 +
            video.likes_count * 0.3 +
            recent_views * decay * 0.3
        )
        video.trending_score = round(score, 2)

    Video.objects.bulk_update(videos, ['trending_score'])
    logger.info(f'Updated trending scores for {len(videos)} videos')



def process_video_task(video_id):
    """Process uploaded video: extract duration, generate thumbnail, create HLS streams."""
    from .models import Video

    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        logger.error(f'Video {video_id} not found')
        return

    original_path = os.path.join(settings.MEDIA_ROOT, str(video.original_file))
    if not os.path.exists(original_path):
        video.status = 'FAILED'
        video.save(update_fields=['status'])
        return

    hls_dir = os.path.join(settings.MEDIA_ROOT, 'hls', str(video.id))
    os.makedirs(hls_dir, exist_ok=True)

    try:
        # 1. Extract duration
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', original_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            video.duration = float(result.stdout.strip())

        # 2. Generate thumbnail at 2-second mark
        thumb_path = os.path.join(settings.MEDIA_ROOT, 'thumbnails', f'{video.id}.jpg')
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        subprocess.run(
            ['ffmpeg', '-y', '-i', original_path, '-ss', '00:00:02',
             '-vframes', '1', '-vf', 'scale=640:360', thumb_path],
            capture_output=True, timeout=30
        )
        if os.path.exists(thumb_path):
            video.thumbnail = f'thumbnails/{video.id}.jpg'

        # 3. Transcode to HLS streams
        qualities = [
            {'name': '1080p', 'height': 1080, 'bitrate': '5000k'},
            {'name': '720p', 'height': 720, 'bitrate': '3000k'},
            {'name': '480p', 'height': 480, 'bitrate': '1500k'},
        ]

        master_playlist_lines = ['#EXTM3U']

        for q in qualities:
            q_dir = os.path.join(hls_dir, q['name'])
            os.makedirs(q_dir, exist_ok=True)
            output_m3u8 = os.path.join(q_dir, f'{q["name"]}.m3u8')

            cmd = [
                'ffmpeg', '-y', '-i', original_path,
                '-vf', f'scale=-2:{q["height"]}',
                '-c:v', 'libx264', '-preset', 'fast',
                '-b:v', q['bitrate'],
                '-c:a', 'aac', '-b:a', '128k',
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', os.path.join(q_dir, 'segment-%03d.ts'),
                output_m3u8
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=3600)
            if result.returncode != 0:
                logger.error(f'FFmpeg failed for {q["name"]}: {result.stderr.decode()[:500]}')
                continue

            bandwidth = int(q['bitrate'].replace('k', '')) * 1000
            master_playlist_lines.append(
                f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION=auto,NAME="{q["name"]}"'
            )
            master_playlist_lines.append(f'{q["name"]}/{q["name"]}.m3u8')

        # 4. Write master playlist
        master_path = os.path.join(hls_dir, 'master.m3u8')
        with open(master_path, 'w') as f:
            f.write('\n'.join(master_playlist_lines) + '\n')

        video.hls_path = f'hls/{video.id}/master.m3u8'
        video.status = 'READY'

        # 5. Clean up original file
        if os.path.exists(original_path):
            os.remove(original_path)
            video.original_file = ''

    except Exception as e:
        logger.error(f'Video processing failed for {video_id}: {e}')
        video.status = 'FAILED'

    video.save()


def calculate_trending_scores():
    """Recalculate trending scores for all videos."""
    from .models import Video
    from analytics_app.models import WatchHistory
    from django.utils import timezone
    from datetime import timedelta

    week_ago = timezone.now() - timedelta(days=7)
    videos = Video.objects.filter(status='READY')

    for video in videos:
        recent_views = WatchHistory.objects.filter(
            video=video, updated_at__gte=week_ago
        ).count()

        days_old = max(1, (timezone.now() - video.created_at).days)
        decay = 1 / (1 + days_old * 0.1)

        score = (
            video.views_count * 0.4 +
            video.likes_count * 0.3 +
            recent_views * decay * 0.3
        )
        video.trending_score = round(score, 2)
        video.save(update_fields=['trending_score'])
