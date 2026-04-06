import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, getMyVideos, getUserStats, getSubscriptions, deleteVideo, updateVideo, getCategories } from '../api/services';
import { toAbsoluteMediaUrl } from '../api/axios';
import VideoCard from '../components/VideoCard';
import { FiEdit2, FiSave, FiFilm, FiUsers, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CountUp from '../components/ui/CountUp';
import { normalizeToArray } from '../utils/normalize';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(null);
  const [myVideos, setMyVideos] = useState([]);
  const [stats, setStats] = useState(null);
  const [subs, setSubs] = useState([]);
  const [tab, setTab] = useState('videos');
  const [saving, setSaving] = useState(false);

  // Video edit modal state
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getMyVideos().then(({ data }) => setMyVideos(normalizeToArray(data))).catch(() => {});
    getUserStats().then(({ data }) => setStats(data)).catch(() => {});
    getSubscriptions().then(({ data }) => setSubs(normalizeToArray(data))).catch(() => {});
    getCategories().then(({ data }) => setCategories(normalizeToArray(data))).catch(() => {});
  };

  const openEditModal = (video) => {
    setEditingVideo(video);
    setEditTitle(video.title || '');
    setEditDesc(video.description || '');
    setEditCategory(video.category_name || '');
    setEditTags(video.tags?.map((t) => t.name).join(', ') || '');
  };

  const handleEditSave = async () => {
    if (!editingVideo) return;
    setEditSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDesc);
      formData.append('category_name', editCategory);
      const tagList = editTags.split(',').map((t) => t.trim()).filter(Boolean);
      tagList.forEach((t) => formData.append('tag_names', t));
      await updateVideo(editingVideo.id, formData);
      toast.success('Video updated');
      setEditingVideo(null);
      loadData();
    } catch {
      toast.error('Failed to update video');
    }
    setEditSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return;
    try {
      await deleteVideo(id);
      setMyVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('bio', bio);
      if (avatar) formData.append('avatar', avatar);
      const { data } = await updateProfile(formData);
      setUser(data);
      localStorage.setItem('mytube_user', JSON.stringify(data));
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <>
    <div className="min-h-screen bg-olive-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-olive-800 to-olive-950 pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-olive-700 flex items-center justify-center text-olive-200 text-3xl font-bold uppercase shrink-0">
              {user.avatar ? (
                <img src={toAbsoluteMediaUrl(user.avatar)} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.username?.[0]
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    className="bg-olive-800 border border-olive-600 rounded px-3 py-1.5 text-olive-100 text-lg focus:outline-none" />
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
                    className="w-full bg-olive-800 border border-olive-600 rounded px-3 py-1.5 text-olive-200 text-sm focus:outline-none resize-none"
                    placeholder="Write a bio..." />
                  <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])}
                    className="text-olive-400 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                      className="bg-olive-600 hover:bg-olive-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                      <FiSave size={14} /> Save
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="bg-olive-800 text-olive-300 px-3 py-1 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-olive-100 text-2xl font-bold">{user.username}</h1>
                    <button onClick={() => setEditing(true)}
                      className="text-olive-500 hover:text-olive-400"><FiEdit2 size={16} /></button>
                  </div>
                  <p className="text-olive-400 text-sm">{user.email}</p>
                  {user.bio && <p className="text-olive-300 text-sm mt-1">{user.bio}</p>}
                  <div className="flex items-center gap-4 mt-2 text-olive-500 text-sm">
                    <span>{user.subscribers_count || 0} subscribers</span>
                    <span>{myVideos.length} videos</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-4xl mx-auto px-4 -mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card-green">
              <p className="text-olive-400 text-2xl font-bold">
                <CountUp end={stats.total_videos_watched} />
              </p>
              <p className="text-olive-300/50 text-xs mt-0.5">Videos Watched</p>
            </div>
            <div className="stat-card-green">
              <p className="text-olive-400 text-2xl font-bold">
                <CountUp end={Math.round(stats.total_watch_duration_seconds / 60)} />
              </p>
              <p className="text-olive-300/50 text-xs mt-0.5">Minutes Watched</p>
            </div>
            <div className="stat-card-green">
              <p className="text-olive-400 text-2xl font-bold">
                <CountUp end={Math.round(stats.average_completion_rate)} format={(n) => `${Math.floor(n)}%`} />
              </p>
              <p className="text-olive-300/50 text-xs mt-0.5">Avg Completion</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-1 border-b border-olive-800 mb-4">
          {[
            { key: 'videos', label: 'My Videos', icon: FiFilm },
            { key: 'subscriptions', label: 'Subscriptions', icon: FiUsers },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === key ? 'border-olive-500 text-olive-300' : 'border-transparent text-olive-600 hover:text-olive-400'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === 'videos' && (
          myVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myVideos.map((v) => (
                <div key={v.id} className="relative group/card">
                  <VideoCard video={v} />
                  {/* Edit / Delete overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(v); }}
                      className="bg-black/70 hover:bg-olive-700 text-white rounded p-1.5 transition-colors"
                      title="Edit video"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(v.id); }}
                      className="bg-black/70 hover:bg-red-700 text-white rounded p-1.5 transition-colors"
                      title="Delete video"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  {/* Status badge */}
                  {v.status !== 'READY' && (
                    <div className="absolute bottom-12 left-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${v.status === 'PROCESSING' ? 'bg-yellow-600 text-yellow-100' : 'bg-red-700 text-red-100'}`}>
                        {v.status}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-olive-600 text-center py-10">No videos uploaded yet</p>
          )
        )}

        {tab === 'subscriptions' && (
          subs.length > 0 ? (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-olive-900 rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-olive-700 flex items-center justify-center text-olive-200 font-bold uppercase">
                    {s.channel_name?.[0]}
                  </div>
                  <span className="text-olive-200">{s.channel_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-olive-600 text-center py-10">No subscriptions yet</p>
          )
        )}
      </div>
    </div>

    {/* ── Video Edit Modal ── */}    {editingVideo && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditingVideo(null)}>
        <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-olive-100 text-lg font-bold">Edit Video</h2>
            <button onClick={() => setEditingVideo(null)} className="text-olive-500 hover:text-olive-300">
              <FiX size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-olive-400 text-xs mb-1">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-olive-800 border border-olive-700 rounded-lg px-3 py-2 text-olive-100 text-sm focus:outline-none focus:border-olive-500"
                placeholder="Video title"
              />
            </div>
            <div>
              <label className="block text-olive-400 text-xs mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full bg-olive-800 border border-olive-700 rounded-lg px-3 py-2 text-olive-100 text-sm focus:outline-none focus:border-olive-500 resize-none"
                placeholder="Video description"
              />
            </div>
            <div>
              <label className="block text-olive-400 text-xs mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-olive-800 border border-olive-700 rounded-lg px-3 py-2 text-olive-100 text-sm focus:outline-none focus:border-olive-500"
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-olive-400 text-xs mb-1">Tags <span className="text-olive-600">(comma-separated)</span></label>
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full bg-olive-800 border border-olive-700 rounded-lg px-3 py-2 text-olive-100 text-sm focus:outline-none focus:border-olive-500"
                placeholder="e.g. tutorial, python, programming"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="flex-1 bg-olive-600 hover:bg-olive-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiSave size={15} />
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditingVideo(null)}
              className="px-4 py-2 bg-olive-800 hover:bg-olive-700 text-olive-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
