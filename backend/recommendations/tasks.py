import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def train_recommendation_model():
    """Nightly task: retrain the recommendation model with latest data."""
    from recommendations.views import _recommender
    from videos.models import Video
    try:
        all_videos = list(Video.objects.filter(status='READY').select_related('category').prefetch_related('tags'))
        if len(all_videos) >= 2:
            _recommender.fit(all_videos)
            logger.info(f'Recommendation model retrained on {len(all_videos)} videos')
    except Exception as e:
        logger.error(f'Failed to retrain recommendation model: {e}', exc_info=True)
