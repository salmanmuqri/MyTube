import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import {
  FiUsers, FiVideo, FiTrendingUp, FiEye, FiThumbsUp,
  FiTrash2, FiEdit2, FiRefreshCw, FiTag, FiActivity,
  FiCheck, FiX, FiSearch, FiLayers, FiAlertTriangle, FiPlus
} from 'react-icons/fi';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';

// ── API helpers ──────────────────────────────────
const api = {
  getDashboard: () => axios.get('/api/admin-panel/dashboard/'),
  getActivity: () => axios.get('/api/admin-panel/activity/'),
  getUsers: (search = '') => axios.get(`/api/admin-panel/users/${search ? `?search=${search}` : ''}`),
  patchUser: (id, data) => axios.patch(`/api/admin-panel/users/${id}/`, data),
  deleteUser: (id) => axios.delete(`/api/admin-panel/users/${id}/`),
  getVideos: (params = '') => axios.get(`/api/admin-panel/videos/${params}`),
  patchVideo: (id, data) => axios.patch(`/api/admin-panel/videos/${id}/`, data),
  deleteVideo: (id) => axios.delete(`/api/admin-panel/videos/${id}/`),
  getCategories: () => axios.get('/api/admin-panel/categories/'),
  createCategory: (name) => axios.post('/api/admin-panel/categories/', { name }),
  deleteCategory: (id) => axios.delete(`/api/admin-panel/categories/${id}/`),
  triggerTrending: () => axios.post('/api/admin-panel/trigger-trending/'),
  triggerRetrain: () => axios.post('/api/admin-panel/trigger-retrain/'),
};

// ── Stat Card ─────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'olive' }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-olive-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
          <p className="text-olive-100 text-3xl font-bold">{value?.toLocaleString() ?? '—'}</p>
          {sub && <p className="text-olive-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-olive-800/60`}>
          <Icon size={22} className="text-olive-400" />
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    READY: 'bg-emerald-900/60 text-emerald-400 border-emerald-800',
    PROCESSING: 'bg-yellow-900/60 text-yellow-400 border-yellow-800',
    FAILED: 'bg-red-900/60 text-red-400 border-red-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] || 'bg-olive-800 text-olive-400 border-olive-700'}`}>
      {status}
    </span>
  );
}

// ── Confirm Modal ─────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-olive-900 border border-olive-700 rounded-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <FiAlertTriangle size={22} className="text-red-400" />
          <h3 className="text-olive-100 font-semibold">Confirm Action</h3>
        </div>
        <p className="text-olive-300 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-olive-800 hover:bg-olive-700 text-olive-300 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState(null);
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [videoStatusFilter, setVideoStatusFilter] = useState('');
  const [confirm, setConfirm] = useState(null); // { message, action }
  const [newCatName, setNewCatName] = useState('');

  // Guard: admin only
  const isAdmin = user?.is_staff || user?.is_superuser || user?.role === 'admin';
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isAdmin) { navigate('/'); toast.error('Access denied'); }
  }, [user, isAdmin, navigate]);

  // Load data by tab
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    if (activeTab === 'dashboard') {
      Promise.all([api.getDashboard(), api.getActivity()])
        .then(([d, a]) => { setDashboard(d.data); setActivity(a.data); })
        .catch(() => toast.error('Failed to load dashboard'))
        .finally(() => setLoading(false));
    } else if (activeTab === 'users') {
      api.getUsers().then(r => setUsers(r.data.results)).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
    } else if (activeTab === 'videos') {
      api.getVideos().then(r => setVideos(r.data.results)).catch(() => toast.error('Failed to load videos')).finally(() => setLoading(false));
    } else if (activeTab === 'categories') {
      api.getCategories().then(r => setCategories(r.data)).catch(() => toast.error('Failed to load categories')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTab, isAdmin]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const r = await api.getUsers(userSearch);
      setUsers(r.data.results);
    } catch { toast.error('Search failed'); }
    setLoading(false);
  };

  const searchVideos = async () => {
    setLoading(true);
    try {
      const params = [];
      if (videoSearch) params.push(`search=${videoSearch}`);
      if (videoStatusFilter) params.push(`status=${videoStatusFilter}`);
      const r = await api.getVideos(params.length ? `?${params.join('&')}` : '');
      setVideos(r.data.results);
    } catch { toast.error('Search failed'); }
    setLoading(false);
  };

  const handleToggleUserActive = async (u) => {
    const action = async () => {
      try {
        await api.patchUser(u.id, { is_active: !u.is_active });
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
        toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      } catch { toast.error('Failed to update user'); }
    };
    setConfirm({ message: `${u.is_active ? 'Deactivate' : 'Activate'} user "${u.username}"?`, action });
  };

  const handlePromoteUser = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const action = async () => {
      try {
        await api.patchUser(u.id, { role: newRole });
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
        toast.success(`User role set to ${newRole}`);
      } catch { toast.error('Failed to update user'); }
    };
    setConfirm({ message: `Set "${u.username}" role to ${newRole}?`, action });
  };

  const handleDeleteUser = async (u) => {
    const action = async () => {
      try {
        await api.deleteUser(u.id);
        setUsers(prev => prev.filter(x => x.id !== u.id));
        toast.success('User deleted');
      } catch { toast.error('Failed to delete user'); }
    };
    setConfirm({ message: `Permanently delete user "${u.username}" and ALL their content?`, action });
  };

  const handleDeleteVideo = async (v) => {
    const action = async () => {
      try {
        await api.deleteVideo(v.id);
        setVideos(prev => prev.filter(x => x.id !== v.id));
        toast.success('Video deleted');
      } catch { toast.error('Failed to delete video'); }
    };
    setConfirm({ message: `Permanently delete video "${v.title}"?`, action });
  };

  const handleSetVideoStatus = async (v, newStatus) => {
    try {
      await api.patchVideo(v.id, { status: newStatus });
      setVideos(prev => prev.map(x => x.id === v.id ? { ...x, status: newStatus } : x));
      toast.success(`Video status set to ${newStatus}`);
    } catch { toast.error('Failed to update video'); }
  };

  const handleDeleteCategory = async (cat) => {
    const action = async () => {
      try {
        await api.deleteCategory(cat.id);
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        toast.success('Category deleted');
      } catch { toast.error('Failed to delete category'); }
    };
    setConfirm({ message: `Delete category "${cat.name}"? Videos in this category will be uncategorized.`, action });
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const r = await api.createCategory(newCatName.trim());
      if (r.data.created) {
        setCategories(prev => [...prev, r.data]);
        toast.success('Category created');
      } else {
        toast('Category already exists');
      }
      setNewCatName('');
    } catch { toast.error('Failed to create category'); }
  };

  const handleTriggerTrending = async () => {
    try {
      const r = await api.triggerTrending();
      toast.success(r.data.message);
    } catch { toast.error('Failed'); }
  };

  const handleTriggerRetrain = async () => {
    toast.loading('Retraining...', { id: 'retrain' });
    try {
      const r = await api.triggerRetrain();
      toast.success(r.data.message, { id: 'retrain' });
    } catch { toast.error('Failed', { id: 'retrain' }); }
  };

  if (!isAdmin) return null;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiActivity },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'videos', label: 'Videos', icon: FiVideo },
    { id: 'categories', label: 'Categories', icon: FiTag },
    { id: 'tools', label: 'Tools', icon: FiLayers },
  ];

  return (
    <div className="min-h-screen bg-olive-950">
      {/* Admin header */}
      <div className="bg-olive-900 border-b border-olive-800 px-6 py-3 flex items-center gap-3">
        <MdOutlineAdminPanelSettings size={22} className="text-olive-400" />
        <h1 className="text-olive-200 font-bold text-lg">Admin Panel</h1>
        <span className="text-olive-600 text-sm">— Control everything</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 mb-6 bg-olive-900 rounded-xl p-1 border border-olive-800">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === t.id
                  ? 'bg-olive-700 text-olive-100 shadow'
                  : 'text-olive-400 hover:text-olive-200 hover:bg-olive-800'
              }`}
            >
              <t.icon size={16} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-olive-700 border-t-olive-400 rounded-full animate-spin" />
          </div>
        )}

        {/* ── Dashboard Tab ── */}
        {!loading && activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={FiUsers} label="Total Users" value={dashboard.users.total} sub={`+${dashboard.users.new_this_week} this week`} />
              <StatCard icon={FiVideo} label="Total Videos" value={dashboard.videos.total} sub={`${dashboard.videos.ready} ready`} />
              <StatCard icon={FiEye} label="Total Views" value={dashboard.engagement.total_views} />
              <StatCard icon={FiThumbsUp} label="Total Likes" value={dashboard.engagement.total_likes} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card text-center">
                <p className="text-olive-500 text-xs uppercase tracking-wider mb-1">Processing</p>
                <p className="text-yellow-400 text-2xl font-bold">{dashboard.videos.processing}</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-olive-500 text-xs uppercase tracking-wider mb-1">Failed</p>
                <p className="text-red-400 text-2xl font-bold">{dashboard.videos.failed}</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-olive-500 text-xs uppercase tracking-wider mb-1">Watch Events</p>
                <p className="text-olive-200 text-2xl font-bold">{dashboard.engagement.watch_events}</p>
              </div>
            </div>

            {activity && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-olive-900 rounded-xl border border-olive-800 p-4">
                  <h3 className="text-olive-300 font-semibold text-sm mb-3 flex items-center gap-2">
                    <FiVideo size={14} /> Recent Videos
                  </h3>
                  <div className="space-y-2">
                    {activity.recent_videos.map(v => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <span className="text-olive-200 truncate max-w-xs">{v.title}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-olive-500">{v.uploader}</span>
                          <StatusBadge status={v.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-olive-900 rounded-xl border border-olive-800 p-4">
                  <h3 className="text-olive-300 font-semibold text-sm mb-3 flex items-center gap-2">
                    <FiUsers size={14} /> Recent Users
                  </h3>
                  <div className="space-y-2">
                    {activity.recent_users.map(u => (
                      <div key={u.id} className="flex items-center justify-between text-xs">
                        <span className="text-olive-200">{u.username}</span>
                        <span className="text-olive-500">{new Date(u.date_joined).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab ── */}
        {!loading && activeTab === 'users' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                placeholder="Search users by name or email..."
                className="flex-1 bg-olive-900 border border-olive-700 text-olive-100 rounded-lg px-4 py-2 text-sm focus:border-olive-500 focus:outline-none"
              />
              <button onClick={searchUsers} className="bg-olive-700 hover:bg-olive-600 text-white px-4 rounded-lg transition-colors">
                <FiSearch size={16} />
              </button>
            </div>
            <div className="bg-olive-900 rounded-xl border border-olive-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Videos</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium">{u.username}</td>
                        <td className="text-olive-400">{u.email}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-olive-800 text-olive-300 border-olive-600' : 'bg-olive-950 text-olive-500 border-olive-800'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="text-olive-400">{u.video_count}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 'bg-red-900/50 text-red-400 border-red-800'}`}>
                            {u.is_active ? 'Active' : 'Banned'}
                          </span>
                        </td>
                        <td className="text-olive-500">{new Date(u.date_joined).toLocaleDateString()}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggleUserActive(u)} title={u.is_active ? 'Ban user' : 'Activate'}
                              className={`p-1.5 rounded transition-colors ${u.is_active ? 'text-red-400 hover:bg-red-900/30' : 'text-emerald-400 hover:bg-emerald-900/30'}`}>
                              {u.is_active ? <FiX size={14} /> : <FiCheck size={14} />}
                            </button>
                            <button onClick={() => handlePromoteUser(u)} title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                              className="p-1.5 rounded text-olive-400 hover:bg-olive-800 transition-colors">
                              <FiEdit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteUser(u)} title="Delete user"
                              className="p-1.5 rounded text-red-500 hover:bg-red-900/30 transition-colors">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-olive-600 py-8">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Videos Tab ── */}
        {!loading && activeTab === 'videos' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchVideos()}
                placeholder="Search videos..."
                className="flex-1 min-w-[200px] bg-olive-900 border border-olive-700 text-olive-100 rounded-lg px-4 py-2 text-sm focus:border-olive-500 focus:outline-none"
              />
              <select
                value={videoStatusFilter}
                onChange={e => setVideoStatusFilter(e.target.value)}
                className="bg-olive-900 border border-olive-700 text-olive-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="READY">Ready</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
              </select>
              <button onClick={searchVideos} className="bg-olive-700 hover:bg-olive-600 text-white px-4 rounded-lg transition-colors">
                <FiSearch size={16} />
              </button>
            </div>
            <div className="bg-olive-900 rounded-xl border border-olive-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Uploader</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Likes</th>
                      <th>Category</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => (
                      <tr key={v.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            {v.thumbnail && (
                              <img src={v.thumbnail} className="w-12 h-7 rounded object-cover bg-olive-800" alt="" />
                            )}
                            <span className="truncate max-w-[180px] font-medium">{v.title}</span>
                          </div>
                        </td>
                        <td className="text-olive-400">{v.uploader}</td>
                        <td><StatusBadge status={v.status} /></td>
                        <td>{v.views_count.toLocaleString()}</td>
                        <td>{v.likes_count.toLocaleString()}</td>
                        <td className="text-olive-400">{v.category || '—'}</td>
                        <td className="text-olive-500">{new Date(v.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            {v.status === 'FAILED' && (
                              <button onClick={() => handleSetVideoStatus(v, 'PROCESSING')} title="Retry processing"
                                className="p-1.5 rounded text-yellow-400 hover:bg-yellow-900/30 transition-colors">
                                <FiRefreshCw size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDeleteVideo(v)} title="Delete video"
                              className="p-1.5 rounded text-red-500 hover:bg-red-900/30 transition-colors">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-olive-600 py-8">No videos found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Categories Tab ── */}
        {!loading && activeTab === 'categories' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                placeholder="New category name..."
                className="flex-1 bg-olive-900 border border-olive-700 text-olive-100 rounded-lg px-4 py-2 text-sm focus:border-olive-500 focus:outline-none"
              />
              <button onClick={handleCreateCategory} className="bg-olive-600 hover:bg-olive-500 text-white px-4 rounded-lg transition-colors flex items-center gap-2 text-sm">
                <FiPlus size={16} /> Add
              </button>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map(cat => (
                <div key={cat.id} className="bg-olive-900 border border-olive-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-olive-200 font-medium">{cat.name}</p>
                    <p className="text-olive-500 text-xs mt-0.5">{cat.video_count} videos</p>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded text-red-500 hover:bg-red-900/30 transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tools Tab ── */}
        {!loading && activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="bg-olive-900 border border-olive-800 rounded-xl p-6">
              <h3 className="text-olive-200 font-semibold mb-1 flex items-center gap-2">
                <FiTrendingUp size={16} className="text-olive-400" /> Recalculate Trending Scores
              </h3>
              <p className="text-olive-500 text-sm mb-4">Runs the trending algorithm on all READY videos immediately. Normally scheduled hourly.</p>
              <button onClick={handleTriggerTrending} className="bg-olive-700 hover:bg-olive-600 text-white px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                <FiRefreshCw size={14} /> Run Now
              </button>
            </div>
            <div className="bg-olive-900 border border-olive-800 rounded-xl p-6">
              <h3 className="text-olive-200 font-semibold mb-1 flex items-center gap-2">
                <FiLayers size={16} className="text-olive-400" /> Retrain Recommendation Model
              </h3>
              <p className="text-olive-500 text-sm mb-4">Rebuilds the TF-IDF model using all current video metadata. Normally runs nightly at 2AM.</p>
              <button onClick={handleTriggerRetrain} className="bg-olive-700 hover:bg-olive-600 text-white px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                <FiRefreshCw size={14} /> Retrain Now
              </button>
            </div>
            <div className="bg-olive-900 border border-olive-800 rounded-xl p-6">
              <h3 className="text-olive-200 font-semibold mb-2">Django Admin</h3>
              <p className="text-olive-500 text-sm mb-4">
                Full Django admin panel at <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer"
                  className="text-olive-400 hover:text-olive-200 underline">http://localhost:8000/admin/</a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={async () => { await confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
