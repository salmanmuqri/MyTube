import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getVideoDetail, likeVideo, getComments, getSimilarVideos, recordWatchProgress, subscribe, checkSubscription, incrementView } from '../api/services';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import VideoCard from '../components/VideoCard';
import CommentSection from '../components/CommentSection';
import { FiThumbsUp, FiEye, FiUserPlus, FiUserCheck, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const viewCounted = useRef(false);
  const progressTimer = useRef(null);
  const lastProgress = useRef(null);

  useEffect(() => {
    setLoading(true);
    viewCounted.current = false;
    loadVideo();
    loadComments();
    loadSimilar();
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      sendProgress();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVideo = async () => {
    try {
      const { data } = await getVideoDetail(id);
      setVideo(data);
      setLiked(data.is_liked || false);
      setLikesCount(data.likes_count);
      setSubCount(data.uploader_subscribers || 0);
      if (user && data.uploader !== user.id) {
        checkSubscription(data.uploader).then(({ data: d }) => setSubscribed(d.subscribed)).catch(() => {});
      }
    } catch {
      toast.error('Video not found');
    }
    setLoading(false);
  };

  const loadComments = async () => {
    try {
      const { data } = await getComments(id);
      setComments(data.results || data);
    } catch { /* ignore */ }
  };

  const loadSimilar = async () => {
    try {
      const { data } = await getSimilarVideos(id);
      setSimilar(data.results || data);
    } catch { /* ignore */ }
  };

  const handleLike = async () => {
    if (!user) { toast.error('Please login to like'); return; }
    try {
      const { data } = await likeVideo(id);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch { toast.error('Failed to like'); }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Please login to subscribe'); return; }
    try {
      const { data } = await subscribe(video.uploader);
      setSubscribed(data.subscribed);
      setSubCount(data.subscribers_count);
    } catch { toast.error('Failed'); }
  };

  const sendProgress = useCallback(() => {
    if (!user || !lastProgress.current) return;
    const { currentTime, percentage } = lastProgress.current;
    recordWatchProgress({
      video: id,
      watch_duration: Math.floor(currentTime),
      watch_percentage: Math.min(100, Math.floor(percentage)),
    }).catch(() => {});
  }, [id, user]);

  const handleTimeUpdate = useCallback(({ currentTime, duration, percentage }) => {
    lastProgress.current = { currentTime, duration, percentage };
    if (!viewCounted.current && currentTime > 3) {
      viewCounted.current = true;
      incrementView(id).catch(() => {});
    }
    if (!progressTimer.current && user) {
      progressTimer.current = setInterval(() => sendProgress(), 10000);
    }
  }, [id, user, sendProgress]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

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

  const hlsUrl = video.hls_path ? `/media/${video.hls_path}` : null;

  return (
    <div className="min-h-screen bg-olive-950">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Player */}
          <div className="bg-black rounded-xl overflow-hidden">
            {video.status === 'READY' && hlsUrl ? (
              <VideoPlayer src={hlsUrl} onTimeUpdate={handleTimeUpdate} onEnded={sendProgress} />
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

          {/* Video info */}
          <h1 className="text-olive-100 text-xl font-medium mt-4">{video.title}</h1>

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

          {/* Description */}
          {video.description && (
            <div className="mt-4 bg-olive-900 rounded-xl p-4">
              <p className="text-olive-300 text-sm whitespace-pre-wrap">{video.description}</p>
              <div className="flex items-center gap-2 mt-2 text-olive-600 text-xs">
                {video.category_name && <span className="bg-olive-800 px-2 py-0.5 rounded">{video.category_name}</span>}
                {video.tags?.map(t => <span key={t.id} className="bg-olive-800 px-2 py-0.5 rounded">#{t.name}</span>)}
                <span>{timeAgo(video.created_at)}</span>
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentSection videoId={id} comments={comments} onCommentAdded={loadComments} />
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <h3 className="text-olive-300 font-medium mb-3 text-sm">Similar Videos</h3>
          <div className="space-y-3">
            {similar.length > 0 ? (
              similar.map((v) => <VideoCard key={v.id} video={v} />)
            ) : (
              <p className="text-olive-600 text-sm">No similar videos yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
