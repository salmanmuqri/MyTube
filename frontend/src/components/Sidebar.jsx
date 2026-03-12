import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiTrendingUp, FiClock, FiUpload, FiFilm,
  FiLogIn, FiShield, FiRss, FiList
} from 'react-icons/fi';
import { MdSubscriptions } from 'react-icons/md';

function SidebarItem({ to, icon: Icon, label, collapsed, onClick }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`sidebar-nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
        title={collapsed ? label : ''}
      >
        <Icon size={20} className="shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
      }
      title={collapsed ? label : ''}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.is_staff || user?.is_superuser || user?.role === 'admin';

  return (
    <aside
      className={`fixed left-0 top-14 h-[calc(100vh-3.5rem)] sidebar-glass
        flex flex-col overflow-y-auto overflow-x-hidden z-40 transition-all duration-200
        ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}
    >
      <div className="flex flex-col gap-1 p-2 flex-1">
        {/* Main navigation */}
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="text-olive-300/50 text-[10px] uppercase tracking-widest px-3 py-1 font-semibold">Discover</p>
          )}
          <SidebarItem to="/" icon={FiHome} label="Home" collapsed={collapsed} />
          <SidebarItem to="/trending" icon={FiTrendingUp} label="Trending" collapsed={collapsed} />
        </div>

        <div className="border-t border-olive-700/20 my-1" />

        {/* User section */}
        {user ? (
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="text-olive-300/50 text-[10px] uppercase tracking-widest px-3 py-1 font-semibold">Library</p>
            )}
            <SidebarItem to="/history" icon={FiClock} label="History" collapsed={collapsed} />
            <SidebarItem to="/my-videos" icon={FiFilm} label="My Videos" collapsed={collapsed} />
            <SidebarItem to="/playlists" icon={FiList} label="Playlists" collapsed={collapsed} />

            <div className="border-t border-olive-700/20 my-1" />
            {!collapsed && (
              <p className="text-olive-300/50 text-[10px] uppercase tracking-widest px-3 py-1 font-semibold">Social</p>
            )}
            <SidebarItem to="/subscriptions" icon={MdSubscriptions} label="Subscriptions" collapsed={collapsed} />
            <SidebarItem to="/upload" icon={FiUpload} label="Upload" collapsed={collapsed} />
          </div>
        ) : (
          <div className="space-y-0.5">
            <SidebarItem
              icon={FiLogIn}
              label="Sign In"
              collapsed={collapsed}
              onClick={() => navigate('/login')}
            />
          </div>
        )}

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="border-t border-olive-700/20 my-1" />
            <SidebarItem to="/admin" icon={FiShield} label="Admin Panel" collapsed={collapsed} />
          </>
        )}
      </div>

      {/* Branding at bottom */}
      {!collapsed && (
        <div className="p-4 border-t border-olive-700/10">
          <p className="text-olive-300/25 text-[10px] text-center">MyTube © 2026</p>
        </div>
      )}
    </aside>
  );
}
