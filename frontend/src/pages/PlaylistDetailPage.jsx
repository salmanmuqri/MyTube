import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist, addVideoToPlaylist, getVideos } from '../api/services';
import VideoCard from '../components/VideoCard';
import { FiList, FiLock, FiGlobe, FiTrash2, FiEdit2, FiX, FiPlus, FiArrowLeft, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { normalizeToArray } from '../utils/normalize';

export default function PlaylistDetailPage() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();

  const [playlist, setPlaylist]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [editForm, setEditForm]       = useState({ name: '', description: '', is_public: true });
  const [saving, setSaving]           = useState(false);

  // Add-video panel state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isOwner = user && playlist && (user.id === playlist.owner || String(user.id) === String(playlist.owner));

  useEffect(() => {
    getPlaylist(id)
      .then(({ data }) => {
        setPlaylist(data);
        setEditForm({ name: data.name, description: data.description || '', is_public: data.is_public });
      })
      .catch(() => navigate('/playlists'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRemoveVideo = async (videoId) => {
    try {
      await removeVideoFromPlaylist(id, videoId);
      setPlaylist((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => v.id !== videoId),
        video_count: prev.video_count - 1,
      }));
      toast.success('Video removed from playlist');
    } catch {
      toast.error('Failed to remove video');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this playlist? This cannot be undone.')) return;
    try {
      await deletePlaylist(id);
      toast.success('Playlist deleted');
      navigate('/playlists');
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updatePlaylist(id, editForm);
      setPlaylist((prev) => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Playlist updated');
    } catch {
      toast.error('Failed to update playlist');
    }
    setSaving(false);
  };

  // Search videos to add
  useEffect(() => {
    if (!showAddPanel || !searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearchLoading(true);
      getVideos({ search: searchQ, page_size: 10 })
        .then(({ data }) => setSearchResults(normalizeToArray(data)))
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 320);
    return () => clearTimeout(t);
  }, [searchQ, showAddPanel]);

  const handleAddVideo = async (videoId) => {
    try {
      await addVideoToPlaylist(id, videoId);
      // Refetch playlist to get updated videos list
      const { data } = await getPlaylist(id);
      setPlaylist(data);
      toast.success('Video added to playlist');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add video';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) return null;

  // IDs of videos already in the playlist
  const existingVideoIds = new Set((playlist.videos || []).map((v) => v.id));

  return (
    <div className="min-h-screen bg-olive-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link to="/playlists" className="inline-flex items-center gap-2 text-olive-400 hover:text-olive-200 text-sm mb-6 transition-colors">
          <FiArrowLeft size={15} /> All Playlists
        </Link>

        {/* Header */}
        {editing ? (
          <form onSubmit={handleSaveEdit} className="bg-olive-800/40 border border-olive-700/30 rounded-2xl p-6 mb-8">
            <h2 className="text-olive-100 font-bold text-lg mb-4">Edit Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-olive-300 text-sm mb-1">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-olive-900/60 border border-olive-700/40 rounded-lg px-3 py-2 text-olive-100 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-olive-300 text-sm mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-olive-900/60 border border-olive-700/40 rounded-lg px-3 py-2 text-olive-100 text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, is_public: !editForm.is_public })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    editForm.is_public
                      ? 'border-olive-500/50 bg-olive-500/15 text-olive-300'
                      : 'border-olive-700/40 bg-olive-800/40 text-olive-400'
                  }`}
                >
                  {editForm.is_public ? <FiGlobe size={14} /> : <FiLock size={14} />}
                  {editForm.is_public ? 'Public' : 'Private'}
                </button>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-olive-500 hover:bg-olive-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="bg-olive-800/60 hover:bg-olive-700/60 text-olive-300 px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex gap-6 mb-8 items-start">
            {/* Thumbnail */}
            <div className="shrink-0 w-40 aspect-video bg-olive-800 rounded-xl overflow-hidden flex items-center justify-center">
              {playlist.thumbnail
                ? <img src={playlist.thumbnail} alt="" className="w-full h-full object-cover" />
                : <FiList size={36} className="text-olive-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-olive-50 text-2xl font-bold leading-tight">{playlist.name}</h1>
                {playlist.is_public
                  ? <span className="flex items-center gap-1 text-xs text-olive-400 border border-olive-700/40 rounded-full px-2.5 py-0.5"><FiGlobe size={11} /> Public</span>
                  : <span className="flex items-center gap-1 text-xs text-olive-400 border border-olive-700/40 rounded-full px-2.5 py-0.5"><FiLock size={11} /> Private</span>
                }
              </div>
              {playlist.description && (
                <p className="text-olive-300/70 text-sm mt-1 mb-2">{playlist.description}</p>
              )}
              <p className="text-olive-400 text-sm">{playlist.video_count} video{playlist.video_count !== 1 ? 's' : ''}</p>

              {isOwner && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-sm text-olive-300 border border-olive-700/40 hover:border-olive-500/50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setShowAddPanel(true)}
                    className="flex items-center gap-1.5 text-sm bg-olive-500 hover:bg-olive-400 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FiPlus size={13} /> Add Videos
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-sm text-red-400 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FiTrash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video List */}
        {(!playlist.videos || playlist.videos.length === 0) ? (
          <div className="text-center py-20">
            <FiList size={48} className="text-olive-700 mx-auto mb-3" />
            <p className="text-olive-300 text-lg font-medium">This playlist is empty</p>
            {isOwner && (
              <button
                onClick={() => setShowAddPanel(true)}
                className="mt-4 inline-flex items-center gap-2 bg-olive-500 hover:bg-olive-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiPlus size={16} /> Add Videos
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {playlist.videos.map((video, idx) => (
              <div key={video.id} className="flex gap-4 p-3 rounded-xl bg-olive-800/20 hover:bg-olive-800/40 border border-olive-700/20 hover:border-olive-700/40 transition-colors group">
                <span className="text-olive-600 text-sm w-6 text-center mt-2 shrink-0 font-mono">{idx + 1}</span>
                <div className="w-36 sm:w-44 shrink-0">
                  <Link to={`/watch/${video.id}?playlist=${playlist.id}`}>
                    <div className="aspect-video bg-olive-800 rounded-lg overflow-hidden">
                      {video.thumbnail
                        ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-olive-600"><FiList size={24} /></div>
                      }
                    </div>
                  </Link>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/watch/${video.id}?playlist=${playlist.id}`} className="text-olive-100 text-sm font-medium line-clamp-2 hover:text-olive-300 transition-colors">
                    {video.title}
                  </Link>
                  <p className="text-olive-400 text-xs mt-1">{video.uploader_name || video.uploader}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveVideo(video.id)}
                    className="shrink-0 self-center text-olive-600 hover:text-red-400 transition-colors p-1.5 opacity-0 group-hover:opacity-100"
                    title="Remove from playlist"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Videos Side Panel */}
      {showAddPanel && (
        <div className="modal-overlay" onClick={() => setShowAddPanel(false)}>
          <div className="modal-panel w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-olive-100 font-bold text-lg">Add Videos</h2>
              <button onClick={() => setShowAddPanel(false)} className="text-olive-400 hover:text-olive-200">
                <FiX size={20} />
              </button>
            </div>
            <div className="relative mb-4">
              <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search your videos..."
                className="w-full bg-olive-800/60 border border-olive-700/40 rounded-lg pl-9 pr-3 py-2 text-olive-100 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {searchLoading && (
                <div className="text-center py-6">
                  <div className="w-5 h-5 border-2 border-olive-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}
              {!searchLoading && searchQ && searchResults.length === 0 && (
                <p className="text-olive-400 text-sm text-center py-6">No videos found</p>
              )}
              {!searchLoading && !searchQ && (
                <p className="text-olive-400 text-sm text-center py-6">Type to search videos</p>
              )}
              {searchResults.map((video) => {
                const alreadyAdded = existingVideoIds.has(video.id);
                return (
                  <div key={video.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-olive-800/50 transition-colors">
                    <div className="w-20 aspect-video bg-olive-800 rounded overflow-hidden shrink-0">
                      {video.thumbnail
                        ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-olive-600"><FiList size={14} /></div>
                      }
                    </div>
                    <p className="text-olive-200 text-sm flex-1 line-clamp-2">{video.title}</p>
                    <button
                      onClick={() => !alreadyAdded && handleAddVideo(video.id)}
                      disabled={alreadyAdded}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        alreadyAdded
                          ? 'bg-olive-700/40 text-olive-500 cursor-default'
                          : 'bg-olive-500 hover:bg-olive-400 text-white'
                      }`}
                    >
                      {alreadyAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
