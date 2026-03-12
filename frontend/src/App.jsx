import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import WatchPage from './pages/WatchPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import TrendingPage from './pages/TrendingPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ChannelPage from './pages/ChannelPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import MyVideosPage from './pages/MyVideosPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-olive-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-olive-500 border-t-transparent rounded-full" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-olive-950">
      <Navbar />
      <div className="flex pt-14">
        <Sidebar />
        <main className={`flex-1 min-w-0 transition-all duration-200 ${collapsed ? 'ml-[64px]' : 'ml-[240px]'}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/channel/:userId" element={<ChannelPage />} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
            <Route path="/playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
            <Route path="/playlists/:id" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
            <Route path="/my-videos" element={<ProtectedRoute><MyVideosPage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#18181f', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)' },
            }}
          />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
