import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyVideos } from '../api/services';
import VideoCard from '../components/VideoCard';
import { FiFilm, FiUpload } from 'react-icons/fi';

export default function MyVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyVideos()
      .then(({ data }) => setVideos(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-olive-950 px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olive-700/50 flex items-center justify-center">
            <FiFilm size={22} className="text-olive-400" />
          </div>
          <div>
            <h1 className="text-olive-100 text-2xl font-bold">My Videos</h1>
            <p className="text-olive-300/60 text-sm">{videos.length} video{videos.length !== 1 ? 's' : ''} uploaded</p>
          </div>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 bg-olive-500 hover:bg-olive-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_14px_rgba(99,102,241,0.3)]"
        >
          <FiUpload size={16} /> Upload New
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-[14px] overflow-hidden">
              <div className="aspect-video skeleton-green" />
              <div className="p-3 flex gap-2.5">
                <div className="w-8 h-8 rounded-full skeleton-green shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 skeleton-green rounded w-3/4" />
                  <div className="h-2 skeleton-green rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-24">
          <FiFilm size={56} className="text-olive-700 mx-auto mb-4" />
          <p className="text-olive-200 text-xl font-semibold">No videos yet</p>
          <p className="text-olive-300/50 text-sm mt-2 mb-6">Upload your first video to get started</p>
          <Link to="/upload" className="inline-flex items-center gap-2 bg-olive-500 hover:bg-olive-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            <FiUpload size={18} /> Upload a Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, i) => (
            <div key={video.id} className="card-enter" style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}>
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
