import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addComment } from '../api/services';
import { FiSend, FiCornerDownRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentItem({ comment, videoId, onReplyAdded }) {
  const { user } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await addComment(videoId, { text: replyText, parent: comment.id });
      setReplyText('');
      setShowReply(false);
      onReplyAdded();
      toast.success('Reply added');
    } catch {
      toast.error('Failed to reply');
    }
  };

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-olive-700 flex items-center justify-center text-olive-200 text-xs font-bold uppercase shrink-0">
        {comment.username?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-olive-200 text-sm font-medium">{comment.username}</span>
          <span className="text-olive-600 text-xs">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-olive-300 text-sm mt-0.5 break-words">{comment.text}</p>
        {user && (
          <button onClick={() => setShowReply(!showReply)} className="text-olive-500 hover:text-olive-400 text-xs mt-1 flex items-center gap-1">
            <FiCornerDownRight size={12} /> Reply
          </button>
        )}
        {showReply && (
          <div className="flex gap-2 mt-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 bg-olive-900 border border-olive-700 rounded px-3 py-1 text-olive-100 text-sm placeholder-olive-600 focus:outline-none focus:border-olive-500"
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <button onClick={handleReply} className="text-olive-400 hover:text-olive-300"><FiSend size={14} /></button>
          </div>
        )}
        {comment.replies?.length > 0 && (
          <div className="mt-3 pl-4 border-l border-olive-800 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} videoId={videoId} onReplyAdded={onReplyAdded} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({ videoId, comments, onCommentAdded }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const safeComments = Array.isArray(comments) ? comments : [];

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      await addComment(videoId, { text });
      setText('');
      onCommentAdded();
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-olive-200 font-medium mb-4">{safeComments.length} Comments</h3>
      {user && (
        <div className="flex gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-olive-700 flex items-center justify-center text-olive-200 text-xs font-bold uppercase shrink-0">
            {user.username?.[0]}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-olive-900 border border-olive-700 rounded-lg px-4 py-2 text-olive-100 placeholder-olive-600 focus:outline-none focus:border-olive-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={handleSubmit} className="bg-olive-600 hover:bg-olive-500 text-white px-4 py-2 rounded-lg text-sm">
              <FiSend />
            </button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {safeComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} videoId={videoId} onReplyAdded={onCommentAdded} />
        ))}
      </div>
    </div>
  );
}
