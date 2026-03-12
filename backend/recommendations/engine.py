import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class ContentBasedRecommender:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), stop_words='english')
        self.tfidf_matrix = None
        self.video_ids = []

    def _build_features(self, videos):
        features = []
        self.video_ids = []
        for v in videos:
            tags = ' '.join(v.tags.values_list('name', flat=True))
            category = v.category.name if v.category else ''
            text = f'{v.title} {v.title} {v.description} {tags} {category}'
            features.append(text)
            self.video_ids.append(str(v.id))
        return features

    def fit(self, videos):
        features = self._build_features(videos)
        if not features:
            return
        self.tfidf_matrix = self.vectorizer.fit_transform(features)

    def recommend_for_user(self, user, watched_videos, all_videos, n=20):
        if not watched_videos:
            return []

        self.fit(all_videos)
        if self.tfidf_matrix is None:
            return []

        watched_ids = set(str(v.id) for v in watched_videos)
        watched_indices = [i for i, vid in enumerate(self.video_ids) if vid in watched_ids]

        if not watched_indices:
            return []

        user_profile = np.asarray(self.tfidf_matrix[watched_indices].mean(axis=0))
        similarities = cosine_similarity(user_profile, self.tfidf_matrix).flatten()

        scored = []
        for i, score in enumerate(similarities):
            if self.video_ids[i] not in watched_ids:
                scored.append((self.video_ids[i], float(score)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:n]

    def similar_videos(self, video_id, all_videos, n=10):
        self.fit(all_videos)
        if self.tfidf_matrix is None:
            return []

        video_id_str = str(video_id)
        if video_id_str not in self.video_ids:
            return []

        idx = self.video_ids.index(video_id_str)
        similarities = cosine_similarity(self.tfidf_matrix[idx:idx+1], self.tfidf_matrix).flatten()

        scored = []
        for i, score in enumerate(similarities):
            if self.video_ids[i] != video_id_str:
                scored.append((self.video_ids[i], float(score)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:n]
