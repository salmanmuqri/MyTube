import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMyVideos, updateVideo, deleteVideo } from '../api/services';
import VideoCard from '../components/VideoCard';
import { FiFilm, FiUpload, FiEdit2, FiTrash2, FiX, FiSave, FiLoader, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { normalizeToArray } from '../utils/normalize';

/* ─── Edit Modal ────────────────────────────────────────────── */
function EditModal({ video, onClose, onSave }) {
  const [form, setForm] = useState({
    title: video.title || '',
    description: video.description || '',
    category_name: video.category_name || '',
    tags: (video.tags || []).map(t => t.name).join(', '),
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const pickThumb = (file) => {
    if (!file) return;
    setThumbnail(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category_name', form.category_name.trim());
      const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      tagList.forEach(t => fd.append('tag_names', t));
      if (thumbnail) fd.append('thumbnail', thumbnail);
      const { data } = await updateVideo(video.id, fd);
      toast.success('Video updated!');
      // Merge response back — serializer returns title/description/thumbnail
      onSave({
        ...video,
        title: form.title.trim(),
        description: form.description.trim(),
        category_name: form.category_name.trim() || null,
        tags: tagList.map(name => ({ name })),
        ...(data.thumbnail ? { thumbnail: data.thumbnail } : {}),
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-white font-semibold text-lg">Edit Video</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Thumbnail preview + picker */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Thumbnail</label>
            <div className="flex gap-3 items-center">
              <div className="w-28 h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 shrink-0">
                {thumbPreview ? (
                  <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
                ) : video.thumbnail ? (
                  <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <FiFilm size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {thumbnail ? 'Change image' : 'Replace thumbnail'}
                </button>
                {thumbnail && (
                  <p className="text-xs text-slate-400 mt-1 truncate max-w-[180px]">{thumbnail.name}</p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => pickThumb(e.target.files[0])}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Video title"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              placeholder="Describe your video…"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Category</label>
            <input
              type="text"
              value={form.category_name}
              onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Technology, Gaming, Education…"
              maxLength={100}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              Tags <span className="text-slate-500 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. react, javascript, tutorial"
            />
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                  <span key={i} className="bg-indigo-600/30 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-600/40">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><FiLoader className="animate-spin" size={15} /> Saving…</>
              ) : (
                <><FiSave size={15} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Status badge ──────────────────────────────────────────── */
function StatusBadge({ status: s }) {
  if (s === 'READY') return null;
  if (s === 'PROCESSING') return (
    <span className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-600/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm z-10 shadow">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse shrink-0" />
      Processing…
    </span>
  );
  return (
    <span className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full z-10 shadow">
      <FiAlertCircle size={11} /> Failed
    </span>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function MyVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchVideos = () =>
    getMyVideos()
      .then(({ data }) => setVideos(normalizeToArray(data)))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchVideos();
  }, []);

  // Poll every 8 seconds while any video is still processing
  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'PROCESSING');
    if (!hasProcessing) return;
    const id = setInterval(() => {
      getMyVideos()
        .then(({ data }) => setVideos(normalizeToArray(data)))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [videos]);

  const handleSave = (updated) => {
    setVideos(vs => vs.map(v => v.id === updated.id ? updated : v));
    setEditingVideo(null);
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    setDeletingId(video.id);
    try {
      await deleteVideo(video.id);
      setVideos(vs => vs.filter(v => v.id !== video.id));
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-olive-950 px-4 py-8 max-w-7xl mx-auto">
      {editingVideo && (
        <EditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
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
            <div
              key={video.id}
              className="card-enter group/card relative"
              style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
            >
              {/* Status badge for non-ready videos */}
              <StatusBadge status={video.status} />

              {/* Edit / Delete action bar — appears on hover */}
              <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                <button
                  onClick={() => setEditingVideo(video)}
                  title="Edit video"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900/90 hover:bg-indigo-600 text-white backdrop-blur-sm transition-colors shadow"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(video)}
                  disabled={deletingId === video.id}
                  title="Delete video"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900/90 hover:bg-red-600 text-white backdrop-blur-sm transition-colors shadow disabled:opacity-50"
                >
                  {deletingId === video.id
                    ? <FiLoader size={14} className="animate-spin" />
                    : <FiTrash2 size={14} />}
                </button>
              </div>

              {/* Dim overlay + lock for videos still processing */}
              {video.status !== 'READY' && (
                <div className="absolute inset-0 rounded-[14px] bg-black/40 z-10 pointer-events-none" />
              )}

              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
