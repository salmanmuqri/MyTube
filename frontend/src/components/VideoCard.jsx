import { Link } from 'react-router-dom';
import { FiEye, FiThumbsUp, FiPlay } from 'react-icons/fi';
import SpotlightCard from './ui/SpotlightCard';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function VideoCard({ video }) {
  const thumbnailUrl = video.thumbnail
    ? (video.thumbnail.startsWith('http') || video.thumbnail.startsWith('/')
        ? video.thumbnail
        : `/media/${video.thumbnail}`)
    : null;

  return (
    <Link to={`/watch/${video.id}`} className="group block">
      <SpotlightCard className="vc-root" spotlightColor="rgba(99,102,241,0.10)">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-olive-800">
              <span className="text-olive-600 text-5xl opacity-30">▶</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
            <FiPlay className="text-white/0 group-hover:text-white/90 transition-all duration-300 scale-50 group-hover:scale-100 drop-shadow-lg" size={40} />
          </div>

          {/* Duration badge */}
          {video.duration > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded font-medium">
              {formatDuration(video.duration)}
            </span>
          )}

          {/* Category badge */}
          {video.category_name && (
            <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-olive-800/90 text-olive-400 border border-olive-600/30 font-medium backdrop-blur-sm">
              {video.category_name}
            </span>
          )}

          {video.status === 'PROCESSING' && (
            <div className="absolute inset-0 bg-olive-950/80 flex items-center justify-center">
              <span className="text-olive-400 text-sm font-medium animate-pulse">Processing...</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3 flex gap-2.5">
          <Link
            to={`/channel/${video.uploader}`}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-olive-700 border-2 border-olive-600/40 group-hover:border-olive-500/60 flex items-center justify-center text-olive-200 text-xs font-bold uppercase shrink-0 transition-colors duration-300 overflow-hidden"
          >
            {video.uploader_avatar
              ? <img src={video.uploader_avatar} className="w-full h-full object-cover" alt="" />
              : video.uploader_name?.[0]?.toUpperCase() || '?'
            }
          </Link>
          <div className="min-w-0 flex-1">
            <h3 className="text-olive-100 text-sm font-medium line-clamp-2 group-hover:text-olive-50 transition-colors duration-200 leading-snug">
              {video.title}
            </h3>
            <Link
              to={`/channel/${video.uploader}`}
              onClick={(e) => e.stopPropagation()}
              className="text-olive-400 text-xs mt-0.5 font-medium truncate block hover:text-olive-300 transition-colors"
            >
              {video.uploader_name}
            </Link>
            <div className="flex items-center gap-3 text-olive-300/50 text-xs mt-1">
              <span className="flex items-center gap-1"><FiEye size={10} /> {video.views_count ?? 0}</span>
              <span className="flex items-center gap-1"><FiThumbsUp size={10} /> {video.likes_count ?? 0}</span>
              <span className="ml-auto">{timeAgo(video.created_at)}</span>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}
