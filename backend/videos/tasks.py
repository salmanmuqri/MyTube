import logging
import os
import subprocess
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _run_ffprobe_duration(path):
    result = subprocess.run(
        [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', path,
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode == 0 and result.stdout.strip():
        return float(result.stdout.strip())
    return 0


def _ensure_media_dirs(video_id):
    media_root = settings.MEDIA_ROOT
    base_dirs = [
        media_root,
        os.path.join(media_root, 'originals'),
        os.path.join(media_root, 'thumbnails'),
        os.path.join(media_root, 'hls'),
        os.path.join(media_root, 'hls', str(video_id)),
    ]
    for path in base_dirs:
        os.makedirs(path, exist_ok=True)
    return os.path.join(media_root, 'hls', str(video_id))


def process_video_task(video_id):
    _do_process_video(video_id)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_video_celery(self, video_id):
    try:
        _do_process_video(video_id)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def calculate_trending_task():
    calculate_trending_scores()


def _do_process_video(video_id):
    from .models import Video

    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        logger.error('Video %s not found', video_id)
        return

    original_path = os.path.join(settings.MEDIA_ROOT, str(video.original_file))
    if not os.path.exists(original_path):
        logger.error('Original file missing for video %s at %s', video_id, original_path)
        video.status = 'FAILED'
        video.save(update_fields=['status'])
        return

    hls_dir = _ensure_media_dirs(video.id)
    source_size_bytes = os.path.getsize(original_path)
    source_size_gb = source_size_bytes / (1024 ** 3)
    is_large_source = source_size_gb >= 1.5
    successful_variants = 0

    try:
        duration = _run_ffprobe_duration(original_path)
        if duration:
            video.duration = duration

        thumb_path = os.path.join(settings.MEDIA_ROOT, 'thumbnails', f'{video.id}.jpg')
        subprocess.run(
            [
                'ffmpeg', '-y', '-i', original_path, '-ss', '00:00:02',
                '-vframes', '1',
                '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
                thumb_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if os.path.exists(thumb_path):
            video.thumbnail = f'thumbnails/{video.id}.jpg'

        result = subprocess.run(
            [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=height', '-of', 'default=noprint_wrappers=1:nokey=1',
                original_path,
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        source_height = int(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip().isdigit() else 9999

        qualities = [
            {'name': '1080p', 'height': 1080, 'bitrate': '5000k', 'audio': '192k'},
            {'name': '720p', 'height': 720, 'bitrate': '3000k', 'audio': '128k'},
            {'name': '480p', 'height': 480, 'bitrate': '1500k', 'audio': '128k'},
        ]
        qualities = [q for q in qualities if q['height'] <= source_height + 100] or [
            {'name': '480p', 'height': 480, 'bitrate': '1500k', 'audio': '128k'}
        ]

        # Large uploads can take excessively long with 3 full transcodes.
        # Keep one highest-quality rendition for reliability and quicker completion.
        if is_large_source and len(qualities) > 1:
            qualities = [qualities[0]]

        logger.info(
            'Processing video %s (%0.2f GB) with %s rendition(s): %s',
            video_id,
            source_size_gb,
            len(qualities),
            ', '.join(q['name'] for q in qualities),
        )

        master_lines = ['#EXTM3U', '#EXT-X-VERSION:3']

        for quality in qualities:
            quality_dir = os.path.join(hls_dir, quality['name'])
            os.makedirs(quality_dir, exist_ok=True)
            output_m3u8 = os.path.join(quality_dir, f'{quality["name"]}.m3u8')

            logger.info('Starting rendition %s for video %s', quality['name'], video_id)

            # For very large uploads, try remuxing first (copy video stream) to avoid hours of re-encoding.
            remux_cmd = [
                'ffmpeg', '-y', '-i', original_path,
                '-map', '0:v:0',
                '-map', '0:a:0?',
                '-sn',
                '-dn',
                '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', quality['audio'],
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', os.path.join(quality_dir, 'segment-%03d.ts'),
                output_m3u8,
            ]

            transcode_cmd = [
                'ffmpeg', '-y', '-i', original_path,
                '-map', '0:v:0',
                '-map', '0:a:0?',
                '-sn',
                '-dn',
                '-vf', f'scale=-2:{quality["height"]}',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                '-b:v', quality['bitrate'],
                '-c:a', 'aac', '-b:a', quality['audio'],
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', os.path.join(quality_dir, 'segment-%03d.ts'),
                output_m3u8,
            ]

            cmd = remux_cmd if is_large_source else transcode_cmd
            result = subprocess.run(cmd, capture_output=True, timeout=3600)

            if result.returncode != 0 and is_large_source:
                logger.warning(
                    'Remux failed for video %s quality %s, retrying with transcode fallback',
                    video_id,
                    quality['name'],
                )
                result = subprocess.run(transcode_cmd, capture_output=True, timeout=3600)

            if result.returncode != 0:
                logger.error(
                    'FFmpeg failed for video %s quality %s: %s',
                    video_id,
                    quality['name'],
                    result.stderr.decode(errors='ignore')[:800],
                )
                continue

            successful_variants += 1
            bandwidth = int(quality['bitrate'].replace('k', '')) * 1000
            resolution = (
                f'RESOLUTION=1920x{quality["height"]}' if quality['height'] == 1080 else
                f'RESOLUTION=1280x{quality["height"]}' if quality['height'] == 720 else
                f'RESOLUTION=854x{quality["height"]}'
            )
            master_lines.append(
                f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},{resolution},NAME="{quality["name"]}"'
            )
            master_lines.append(f'{quality["name"]}/{quality["name"]}.m3u8')

        if successful_variants == 0:
            raise RuntimeError('No HLS renditions were generated successfully')

        master_path = os.path.join(hls_dir, 'master.m3u8')
        with open(master_path, 'w', encoding='utf-8') as file_obj:
            file_obj.write('\n'.join(master_lines) + '\n')

        video.hls_path = f'hls/{video.id}/master.m3u8'
        video.status = 'READY'

        try:
            if os.path.exists(original_path):
                os.remove(original_path)
                video.original_file = ''
        except OSError:
            logger.warning('Could not remove original file for video %s', video_id, exc_info=True)

    except Exception as exc:
        logger.error('Video processing failed for %s: %s', video_id, exc, exc_info=True)
        video.status = 'FAILED'

    video.save()


def calculate_trending_scores():
    from analytics_app.models import WatchHistory
    from .models import Video

    week_ago = timezone.now() - timedelta(days=7)
    videos = Video.objects.filter(status='READY')

    for video in videos:
        recent_views = WatchHistory.objects.filter(video=video, updated_at__gte=week_ago).count()
        days_old = max(1, (timezone.now() - video.created_at).days)
        decay = 1 / (1 + days_old * 0.1)
        score = (
            video.views_count * 0.4 +
            video.likes_count * 0.3 +
            recent_views * decay * 0.3
        )
        video.trending_score = round(score, 2)

    Video.objects.bulk_update(videos, ['trending_score'])
    logger.info('Updated trending scores for %s videos', len(videos))
