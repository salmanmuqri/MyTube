import { useState, useEffect } from 'react';
import { getTrendingVideos } from '../api/services';
import VideoCard from '../components/VideoCard';
import { FiTrendingUp } from 'react-icons/fi';

export default function TrendingPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrendingVideos()
      .then(({ data }) => setVideos(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-olive-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-olive-200 text-xl font-bold flex items-center gap-2 mb-6">
          <FiTrendingUp className="text-olive-400" /> Trending
        </h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-olive-800 rounded-xl" />
                <div className="mt-2 h-3 bg-olive-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-olive-600 text-center py-20">No trending videos yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
