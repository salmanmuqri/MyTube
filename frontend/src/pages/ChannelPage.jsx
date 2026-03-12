import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserDetail, subscribe, checkSubscription, getVideos } from '../api/services';
import VideoCard from '../components/VideoCard';
import { FiUserPlus, FiUserCheck, FiFilm, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function ChannelPage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [subLoading, setSubLoading] = useState(false);

  const isOwnChannel = me?.id === userId;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUserDetail(userId).then(({ data }) => {
        setChannel(data);
        setSubCount(data.subscribers_count || 0);
      }),
      getVideos({ uploader: userId, ordering: '-created_at' }).then(({ data }) => {
        setVideos(data.results || data);
      }),
    ])
      .catch(() => toast.error('Failed to load channel'))
      .finally(() => setLoading(false));

    if (me && !isOwnChannel) {
      checkSubscription(userId)
        .then(({ data }) => setSubscribed(data.subscribed))
        .catch(() => {});
    }
  }, [userId, me, isOwnChannel]);

  const handleSubscribe = async () => {
    if (!me) { toast.error('Sign in to subscribe'); return; }
    setSubLoading(true);
    try {
      await subscribe(userId);
      const newSub = !subscribed;
      setSubscribed(newSub);
      setSubCount((prev) => newSub ? prev + 1 : Math.max(0, prev - 1));
      toast.success(newSub ? 'Subscribed!' : 'Unsubscribed');
    } catch {
      toast.error('Failed');
    }
    setSubLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-olive-800 border-t-olive-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center text-olive-400">
        Channel not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-olive-950">
      {/* Channel banner */}
      <div className="h-32 sm:h-48 bg-gradient-to-br from-olive-900 via-olive-800 to-olive-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-10 w-40 h-40 bg-olive-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-olive-400 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Channel info */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end gap-4 -mt-10 mb-6">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-olive-800 border-4 border-olive-950 flex items-center justify-center text-olive-300 text-3xl font-bold uppercase overflow-hidden shrink-0 shadow-xl">
            {channel.avatar
              ? <img src={channel.avatar} alt={channel.username} className="w-full h-full object-cover" />
              : channel.username?.[0]
            }
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-olive-100 text-xl sm:text-2xl font-bold truncate">{channel.username}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-olive-500 text-sm">
              <span className="flex items-center gap-1"><FiUsers size={14} /> {formatNumber(subCount)} subscribers</span>
              <span className="flex items-center gap-1"><FiFilm size={14} /> {videos.length} videos</span>
            </div>
            {channel.bio && <p className="text-olive-400 text-sm mt-2 line-clamp-2 max-w-xl">{channel.bio}</p>}
          </div>

          {/* Subscribe button */}
          <div className="pb-1 shrink-0">
            {isOwnChannel ? (
              <Link
                to="/profile"
                className="bg-olive-800 hover:bg-olive-700 text-olive-300 px-5 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Manage Channel
              </Link>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={subLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  subscribed
                    ? 'bg-olive-800 hover:bg-olive-700 text-olive-300'
                    : 'bg-olive-500 hover:bg-olive-400 text-black'
                }`}
              >
                {subscribed ? <><FiUserCheck size={16} /> Subscribed</> : <><FiUserPlus size={16} /> Subscribe</>}
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-olive-800/50 mb-6" />

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20 text-olive-600">
            <FiFilm size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg">No videos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
