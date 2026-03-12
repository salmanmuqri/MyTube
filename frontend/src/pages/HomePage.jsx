import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVideos, getCategories } from '../api/services';
import VideoCard from '../components/VideoCard';
import Aurora from '../components/ui/Aurora';

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [selectedCat, setSelectedCat] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const search = searchParams.get('search') || '';

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    setVideos([]);
    fetchVideos(1);
  }, [search, selectedCat, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVideos = async (p) => {
    setLoading(true);
    try {
      const params = { page: p, ordering: sortBy };
      if (search) params.search = search;
      if (selectedCat) params.cat = selectedCat;
      const { data } = await getVideos(params);
      const results = data.results || data;
      if (p === 1) {
        setVideos(results);
      } else {
        setVideos((prev) => [...prev, ...results]);
      }
      setHasMore(!!data.next);
    } catch {
      if (p === 1) setVideos([]);
    }
    setLoading(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchVideos(next);
    }
  };

  return (
    <div className="relative min-h-screen bg-olive-950 overflow-x-hidden">
      {/* Aurora background */}
      <Aurora />

      {/* Category / filter bar — seamless with navbar */}
      <div className="border-b border-olive-700/20 bg-olive-950/90 backdrop-blur-sm sticky z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCat('')}
            className={`cat-chip shrink-0 ${!selectedCat ? 'cat-chip-active' : 'cat-chip-default'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.slug)}
              className={`cat-chip shrink-0 ${selectedCat === cat.slug ? 'cat-chip-active' : 'cat-chip-default'}`}
            >
              {cat.name}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ml-auto shrink-0 bg-olive-800/60 text-olive-300 text-sm rounded-full px-3 py-1 border border-olive-700/30 focus:outline-none transition-colors"
          >
            <option value="-created_at">Newest</option>
            <option value="-views_count">Most Viewed</option>
            <option value="-likes_count">Most Liked</option>
            <option value="-trending_score">Trending</option>
          </select>
        </div>
      </div>

      {search && (
        <div className="max-w-7xl mx-auto px-4 pt-4 relative z-10">
          <h2 className="text-olive-400 text-lg">
            Results for: <span className="text-olive-100 font-semibold">"{search}"</span>
          </h2>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {loading && videos.length === 0 ? (
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
          <div className="text-center py-20">
            <p className="text-olive-300 text-lg">No videos found</p>
            <p className="text-olive-300/50 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video, i) => (
                <div
                  key={video.id}
                  className="card-enter"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
                >
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-olive-700/40 hover:bg-olive-600/50 border border-olive-600/30 hover:border-olive-500/50 text-olive-200 px-8 py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all duration-200 shadow-[0_0_16px_rgba(99,102,241,0.12)]"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
