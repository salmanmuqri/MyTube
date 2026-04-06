import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getVideoDetail,
  likeVideo,
  getComments,
  getSimilarVideos,
  recordWatchProgress,
  subscribe,
  checkSubscription,
  incrementView,
  getPlaylist,
} from '../api/services';
import { toAbsoluteMediaUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import VideoCard from '../components/VideoCard';
import CommentSection from '../components/CommentSection';
import {
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiList,
  FiShare2,
  FiThumbsUp,
  FiUserCheck,
  FiUserPlus,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { normalizeToArray } from '../utils/normalize';

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n?.toString() || '0';
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function WatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const playlistId = searchParams.get('playlist');

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);

  const viewCounted = useRef(false);
  const progressTimer = useRef(null);
  const lastProgress = useRef(null);

  const sendProgress = useCallback(() => {
    if (!user || !lastProgress.current) return;
    const { currentTime, percentage } = lastProgress.current;
    recordWatchProgress({
      video: id,
      watch_duration: Math.floor(currentTime),
      watch_percentage: Math.min(100, Math.floor(percentage)),
    }).catch(() => {});
  }, [id, user]);

  useEffect(() => {
    setLoading(true);
    viewCounted.current = false;

    const loadVideo = async () => {
      try {
        const { data } = await getVideoDetail(id);
        setVideo(data);
        setLiked(data.is_liked || false);
        setLikesCount(data.likes_count);
        setSubCount(data.uploader_subscribers || 0);
        if (user && data.uploader !== user.id) {
          checkSubscription(data.uploader)
            .then(({ data: subscription }) => setSubscribed(subscription.subscribed))
            .catch(() => {});
        }
      } catch {
        toast.error('Video not found');
      } finally {
        setLoading(false);
      }
    };

    const loadComments = async () => {
      try {
        const { data } = await getComments(id);
        setComments(normalizeToArray(data));
      } catch {
        // Ignore comment fetch failures here.
      }
    };

    const loadSimilar = async () => {
      try {
        const { data } = await getSimilarVideos(id);
        setSimilar(normalizeToArray(data));
      } catch {
        // Ignore similar-video fetch failures here.
      }
    };

    loadVideo();
    loadComments();
    loadSimilar();

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      sendProgress();
    };
  }, [id, sendProgress, user]);

  useEffect(() => {
    if (!playlistId) {
      setPlaylist(null);
      setPlaylistLoading(false);
      return;
    }

    setPlaylistLoading(true);
    getPlaylist(playlistId)
      .then(({ data }) => setPlaylist(data))
      .catch(() => setPlaylist(null))
      .finally(() => setPlaylistLoading(false));
  }, [playlistId]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like');
      return;
    }
    try {
      const { data } = await likeVideo(id);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch {
      toast.error('Failed to like');
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }
    try {
      const { data } = await subscribe(video.uploader);
      setSubscribed(data.subscribed);
      setSubCount(data.subscribers_count);
    } catch {
      toast.error('Failed');
    }
  };

  const handleTimeUpdate = useCallback(({ currentTime, duration, percentage }) => {
    lastProgress.current = { currentTime, duration, percentage };
    if (!viewCounted.current && currentTime > 3) {
      viewCounted.current = true;
      incrementView(id).catch(() => {});
    }
    if (!progressTimer.current && user) {
      progressTimer.current = setInterval(() => sendProgress(), 10000);
    }
  }, [id, sendProgress, user]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const queueVideos = playlist?.videos || [];
  const currentQueueIndex = queueVideos.findIndex((item) => String(item.id) === String(id));
  const previousQueueVideo = currentQueueIndex > 0 ? queueVideos[currentQueueIndex - 1] : null;
  const nextQueueVideo = currentQueueIndex >= 0 ? queueVideos[currentQueueIndex + 1] : null;

  const goToQueuedVideo = useCallback((videoId) => {
    if (!playlistId) {
      navigate(`/watch/${videoId}`);
      return;
    }
    navigate(`/watch/${videoId}?playlist=${playlistId}`);
  }, [navigate, playlistId]);

  const handleEnded = useCallback(() => {
    sendProgress();
    if (autoplayNext && nextQueueVideo) {
      goToQueuedVideo(nextQueueVideo.id);
    }
  }, [autoplayNext, goToQueuedVideo, nextQueueVideo, sendProgress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-olive-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center text-olive-400">
        Video not found
      </div>
    );
  }

  const hlsUrl = toAbsoluteMediaUrl(video.hls_path);
  const thumbnailUrl = toAbsoluteMediaUrl(video.thumbnail);

  return (
    <div className="min-h-screen bg-olive-950">
      <div className={`mx-auto px-4 py-4 flex flex-col gap-6 ${theaterMode ? 'max-w-[1500px]' : 'max-w-7xl lg:flex-row'}`}>
        <div className="flex-1 min-w-0">
          <div className={`bg-black overflow-hidden transition-all duration-300 ${theaterMode ? 'rounded-2xl shadow-[0_30px_120px_rgba(0,0,0,0.5)]' : 'rounded-xl'}`}>
            {video.status === 'READY' && hlsUrl ? (
              <VideoPlayer
                src={hlsUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                thumbnail={thumbnailUrl}
                theaterMode={theaterMode}
                onTheaterModeChange={setTheaterMode}
              />
            ) : video.status === 'PROCESSING' ? (
              <div className="aspect-video flex items-center justify-center bg-olive-900">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-olive-400">Video is processing...</p>
                  <p className="text-olive-600 text-sm mt-1">This may take a few minutes</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-olive-900">
                <p className="text-red-400">Video processing failed</p>
              </div>
            )}
          </div>

          <h1 className="text-olive-100 text-xl font-medium mt-4">{video.title}</h1>

          {playlist && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                to={`/playlists/${playlist.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-olive-700/40 bg-olive-900/70 px-3 py-1 text-sm text-olive-300 hover:border-olive-500/40 hover:text-olive-100 transition-colors"
              >
                <FiList size={14} /> Playing from {playlist.name}
              </Link>
              <button
                onClick={() => setAutoplayNext((value) => !value)}
                className={`rounded-full px-3 py-1 text-sm transition-colors border ${autoplayNext ? 'border-olive-500/40 bg-olive-500/15 text-olive-200' : 'border-olive-700/40 bg-olive-900/70 text-olive-400'}`}
              >
                Autoplay next: {autoplayNext ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => previousQueueVideo && goToQueuedVideo(previousQueueVideo.id)}
                disabled={!previousQueueVideo}
                className="inline-flex items-center gap-1 rounded-full border border-olive-700/40 bg-olive-900/70 px-3 py-1 text-sm text-olive-300 transition-colors enabled:hover:border-olive-500/40 enabled:hover:text-olive-100 disabled:opacity-40"
              >
                <FiChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => nextQueueVideo && goToQueuedVideo(nextQueueVideo.id)}
                disabled={!nextQueueVideo}
                className="inline-flex items-center gap-1 rounded-full border border-olive-700/40 bg-olive-900/70 px-3 py-1 text-sm text-olive-300 transition-colors enabled:hover:border-olive-500/40 enabled:hover:text-olive-100 disabled:opacity-40"
              >
                Next <FiChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-olive-700 flex items-center justify-center text-olive-200 font-bold uppercase">
                {video.uploader_name?.[0]}
              </div>
              <div>
                <p className="text-olive-200 font-medium text-sm">{video.uploader_name}</p>
                <p className="text-olive-500 text-xs">{formatNumber(subCount)} subscribers</p>
              </div>
              {user && video.uploader !== user.id && (
                <button
                  onClick={handleSubscribe}
                  className={`ml-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                    subscribed
                      ? 'bg-olive-800 text-olive-300 hover:bg-olive-700'
                      : 'bg-olive-500 text-white hover:bg-olive-400'
                  }`}
                >
                  {subscribed ? <><FiUserCheck size={14} /> Subscribed</> : <><FiUserPlus size={14} /> Subscribe</>}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                  liked ? 'bg-olive-500 text-white' : 'bg-olive-800 text-olive-300 hover:bg-olive-700'
                }`}
              >
                <FiThumbsUp size={14} /> {formatNumber(likesCount)}
              </button>
              <span className="flex items-center gap-1 px-3 py-1.5 bg-olive-800 rounded-full text-olive-300 text-sm">
                <FiEye size={14} /> {formatNumber(video.views_count)}
              </span>
              <button onClick={handleShare} className="flex items-center gap-1 px-3 py-1.5 bg-olive-800 rounded-full text-olive-300 text-sm hover:bg-olive-700">
                <FiShare2 size={14} /> Share
              </button>
            </div>
          </div>

          {video.description && (
            <div className="mt-4 bg-olive-900 rounded-xl p-4">
              <p className="text-olive-300 text-sm whitespace-pre-wrap">{video.description}</p>
              <div className="flex items-center gap-2 mt-2 text-olive-600 text-xs flex-wrap">
                {video.category_name && <span className="bg-olive-800 px-2 py-0.5 rounded">{video.category_name}</span>}
                {video.tags?.map((tag) => <span key={tag.id || tag.name} className="bg-olive-800 px-2 py-0.5 rounded">#{tag.name}</span>)}
                <span>{timeAgo(video.created_at)}</span>
              </div>
            </div>
          )}

          <CommentSection videoId={id} comments={comments} onCommentAdded={() => {
            getComments(id)
              .then(({ data }) => setComments(normalizeToArray(data)))
              .catch(() => {});
          }} />
        </div>

        <div className={theaterMode ? 'grid gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]' : 'lg:w-80 xl:w-96 shrink-0 space-y-6'}>
          {playlistId && (
            <section className="rounded-2xl border border-olive-700/20 bg-olive-900/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-olive-100 font-medium text-sm">Queue</h3>
                  <p className="text-olive-400 text-xs">
                    {playlistLoading ? 'Loading playlist...' : playlist ? `${queueVideos.length} videos in ${playlist.name}` : 'Playlist unavailable'}
                  </p>
                </div>
                {playlist && nextQueueVideo && autoplayNext && (
                  <span className="text-[11px] rounded-full bg-olive-500/15 px-2 py-1 text-olive-300 border border-olive-500/20">
                    Up next: {nextQueueVideo.title}
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                {playlist && queueVideos.length > 0 ? queueVideos.map((item, index) => {
                  const active = String(item.id) === String(id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => goToQueuedVideo(item.id)}
                      className={`w-full text-left rounded-xl border p-2 transition-colors ${active ? 'border-olive-500/40 bg-olive-500/10' : 'border-olive-700/20 bg-olive-950/40 hover:border-olive-500/30 hover:bg-olive-900/60'}`}
                    >
                      <div className="flex gap-3">
                        <div className="w-20 shrink-0">
                          <div className="aspect-video overflow-hidden rounded-lg bg-olive-800">
                            {item.thumbnail ? (
                              <img src={toAbsoluteMediaUrl(item.thumbnail)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-olive-600">
                                <FiList size={16} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-olive-500">
                            <span className="font-mono">{index + 1}</span>
                            {active && <span className="rounded-full bg-olive-500/20 px-2 py-0.5 text-olive-300">Now playing</span>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-olive-100">{item.title}</p>
                          <p className="mt-1 text-xs text-olive-400">{item.uploader_name}</p>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <p className="text-sm text-olive-500">No queue available.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-olive-300 font-medium mb-3 text-sm">Similar Videos</h3>
            <div className="space-y-3">
              {similar.length > 0 ? (
                similar.map((item) => <VideoCard key={item.id} video={item} />)
              ) : (
                <p className="text-olive-600 text-sm">No similar videos yet</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
