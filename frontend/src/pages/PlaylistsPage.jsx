import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlaylists, createPlaylist, deletePlaylist } from '../api/services';
import { FiList, FiPlus, FiLock, FiGlobe, FiTrash2, FiPlay, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ name: '', description: '', is_public: true });
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    getPlaylists()
      .then(({ data }) => setPlaylists(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await createPlaylist(form);
      setPlaylists((prev) => [data, ...prev]);
      setShowModal(false);
      setForm({ name: '', description: '', is_public: true });
      toast.success('Playlist created');
    } catch {
      toast.error('Failed to create playlist');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this playlist?')) return;
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      toast.success('Playlist deleted');
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  return (
    <div className="min-h-screen bg-olive-950 px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olive-700/50 flex items-center justify-center">
            <FiList size={22} className="text-olive-400" />
          </div>
          <div>
            <h1 className="text-olive-100 text-2xl font-bold">Playlists</h1>
            <p className="text-olive-300/60 text-sm">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-olive-500 hover:bg-olive-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_14px_rgba(99,102,241,0.3)]"
        >
          <FiPlus size={16} /> New Playlist
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-[14px] overflow-hidden border border-olive-700/20">
              <div className="aspect-video skeleton-green" />
              <div className="p-4 space-y-2">
                <div className="h-4 skeleton-green rounded w-2/3" />
                <div className="h-3 skeleton-green rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-24">
          <FiList size={56} className="text-olive-700 mx-auto mb-4" />
          <p className="text-olive-200 text-xl font-semibold">No playlists yet</p>
          <p className="text-olive-300/50 text-sm mt-2 mb-6">Create your first playlist to organise videos</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-olive-500 hover:bg-olive-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            <FiPlus size={18} /> Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <div key={pl.id} className="vc-root group/pl relative">
              {/* Thumbnail grid */}
              <Link to={`/playlists/${pl.id}`}>
                <div className="aspect-video bg-olive-800 flex items-center justify-center overflow-hidden relative">
                  {pl.thumbnail ? (
                    <img src={pl.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiList size={40} className="text-olive-600" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/pl:bg-black/30 transition-colors flex items-center justify-center">
                    <FiPlay size={36} className="text-white/0 group-hover/pl:text-white/90 transition-all scale-50 group-hover/pl:scale-100" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                    {pl.video_count} video{pl.video_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </Link>

              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/playlists/${pl.id}`} className="text-olive-100 font-medium text-sm line-clamp-1 hover:text-olive-300 transition-colors">
                    {pl.name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1">
                    {pl.is_public
                      ? <><FiGlobe size={11} className="text-olive-400" /><span className="text-olive-400 text-xs">Public</span></>
                      : <><FiLock size={11} className="text-olive-400" /><span className="text-olive-400 text-xs">Private</span></>
                    }
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pl.id)}
                  className="shrink-0 text-olive-600 hover:text-red-400 transition-colors p-1"
                  title="Delete playlist"
                >
                  <FiTrash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-olive-100 text-lg font-bold">New Playlist</h2>
              <button onClick={() => setShowModal(false)} className="text-olive-400 hover:text-olive-200">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-olive-300 text-sm mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-olive-800/60 border border-olive-700/40 rounded-lg px-3 py-2 text-olive-100 text-sm transition-colors"
                  placeholder="My awesome playlist"
                  required
                />
              </div>
              <div>
                <label className="block text-olive-300 text-sm mb-1">Description <span className="text-olive-300/40">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-olive-800/60 border border-olive-700/40 rounded-lg px-3 py-2 text-olive-100 text-sm resize-none transition-colors"
                  placeholder="A short description..."
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_public: !form.is_public })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    form.is_public
                      ? 'border-olive-500/50 bg-olive-500/15 text-olive-300'
                      : 'border-olive-700/40 bg-olive-800/40 text-olive-400'
                  }`}
                >
                  {form.is_public ? <FiGlobe size={14} /> : <FiLock size={14} />}
                  {form.is_public ? 'Public' : 'Private'}
                </button>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-olive-500 hover:bg-olive-400 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Playlist'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-olive-800/60 hover:bg-olive-700/60 text-olive-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
