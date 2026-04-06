import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWatchHistory } from '../api/services';
import { toAbsoluteMediaUrl } from '../api/axios';
import { FiClock, FiPlay } from 'react-icons/fi';
import { normalizeToArray } from '../utils/normalize';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchHistory()
      .then(({ data }) => setHistory(normalizeToArray(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-olive-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-olive-200 text-xl font-bold flex items-center gap-2 mb-6">
          <FiClock className="text-olive-400" /> Watch History
        </h1>
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 bg-olive-900 rounded-lg p-3">
                <div className="w-40 h-24 bg-olive-800 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-olive-800 rounded w-3/4" />
                  <div className="h-3 bg-olive-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-olive-600 text-center py-20">No watch history yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <Link
                key={item.id}
                to={`/watch/${item.video_id}`}
                className="flex gap-4 bg-olive-900 hover:bg-olive-800 rounded-lg p-3 transition-colors group"
              >
                <div className="w-40 h-24 bg-olive-800 rounded overflow-hidden relative shrink-0">
                  {item.video_thumbnail ? (
                    <img
                      src={toAbsoluteMediaUrl(item.video_thumbnail)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-olive-600">
                      <FiPlay size={24} />
                    </div>
                  )}
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-olive-700">
                    <div className="h-full bg-olive-400" style={{ width: `${Math.min(100, item.watch_percentage)}%` }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-olive-200 text-sm font-medium line-clamp-2 group-hover:text-olive-100">
                    {item.video_title}
                  </h3>
                  <p className="text-olive-500 text-xs mt-1">
                    Watched {Math.round(item.watch_percentage)}% · {Math.round(item.watch_duration)}s
                  </p>
                  <p className="text-olive-600 text-xs mt-0.5">{timeAgo(item.updated_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
