import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubscriptions, getSubscriptionFeed } from '../api/services';
import VideoCard from '../components/VideoCard';
import { MdSubscriptions } from 'react-icons/md';
import { FiUsers } from 'react-icons/fi';
import { normalizeToArray } from '../utils/normalize';

export default function SubscriptionsPage() {
  const [channels, setChannels] = useState([]);
  const [feed, setFeed]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getSubscriptions().then(({ data }) => setChannels(normalizeToArray(data))),
      getSubscriptionFeed().then(({ data }) => setFeed(normalizeToArray(data))),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-olive-950 px-4 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-olive-700/50 flex items-center justify-center">
          <MdSubscriptions size={22} className="text-olive-400" />
        </div>
        <div>
          <h1 className="text-olive-100 text-2xl font-bold">Subscriptions</h1>
          <p className="text-olive-300/60 text-sm">{channels.length} channel{channels.length !== 1 ? 's' : ''} you follow</p>
        </div>
      </div>

      {/* Channel strip */}
      {channels.length > 0 && (
        <section className="mb-10">
          <h2 className="text-olive-200 text-sm font-semibold uppercase tracking-wider mb-4">Channels</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {channels.map((s) => (
              <Link
                key={s.id}
                to={`/channel/${s.channel}`}
                className="shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 rounded-full bg-olive-700 border-2 border-olive-600/40 group-hover:border-olive-500 flex items-center justify-center text-olive-200 text-xl font-bold uppercase overflow-hidden transition-colors">
                  {s.channel_avatar
                    ? <img src={s.channel_avatar} alt="" className="w-full h-full object-cover" />
                    : s.channel_name?.[0]}
                </div>
                <span className="text-olive-300 text-xs font-medium truncate w-20 text-center group-hover:text-olive-100 transition-colors">
                  {s.channel_name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Feed */}
      <section>
        <h2 className="text-olive-200 text-sm font-semibold uppercase tracking-wider mb-4">Latest from Subscriptions</h2>

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
        ) : feed.length === 0 ? (
          <div className="text-center py-20">
            <FiUsers size={48} className="text-olive-700 mx-auto mb-4" />
            <p className="text-olive-300 text-lg">No videos yet</p>
            <p className="text-olive-300/50 text-sm mt-1">
              {channels.length === 0
                ? 'Subscribe to channels to see their videos here.'
                : 'Subscribed channels haven\'t uploaded recently.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {feed.map((video, i) => (
              <div key={video.id} className="card-enter" style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
