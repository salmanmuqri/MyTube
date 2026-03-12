import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { logout as logoutApi, getSearchSuggestions } from '../api/services';
import { FiUpload, FiSearch, FiUser, FiLogOut, FiShield, FiMenu, FiTv } from 'react-icons/fi';
import toast from 'react-hot-toast';
import GradientText from './ui/GradientText';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ titles: [], channels: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setSuggestions({ titles: [], channels: [] }); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await getSearchSuggestions(q);
        setSuggestions(data);
      } catch { /* ignore */ }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const hasSuggestions = suggestions.titles.length > 0 || suggestions.channels.length > 0;

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (title) => {
    navigate(`/?search=${encodeURIComponent(title)}`);
    setSearch('');
    setShowSuggestions(false);
  };

  const handleChannelClick = (channelId) => {
    navigate(`/channel/${channelId}`);
    setSearch('');
    setShowSuggestions(false);
  };

  const handleLogout = async () => {
    try {
      const tokens = JSON.parse(localStorage.getItem('mytube_tokens') || '{}');
      await logoutApi({ refresh: tokens.refresh });
    } catch { /* ignore */ }
    logoutUser();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50 h-14">
      <div className="max-w-full px-4 flex items-center justify-between h-14 gap-4">
        {/* Hamburger + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-olive-300 hover:text-olive-100 hover:bg-olive-800/60 transition-colors"
            aria-label="Toggle sidebar"
          >
            <FiMenu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="bg-olive-500 text-white font-black px-2 py-0.5 rounded text-sm leading-tight shadow-[0_0_16px_rgba(99,102,241,0.5)]">▶</span>
            <GradientText className="font-bold text-lg tracking-tight">MyTube</GradientText>
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} ref={searchRef} className="hidden sm:flex flex-1 max-w-xl relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
            placeholder="Search videos or channels..."
            className="w-full bg-olive-800/40 border border-olive-700/40 rounded-l-full px-4 py-1.5 text-olive-100 placeholder-olive-300/40 focus:outline-none transition-colors"
          />
          <button type="submit" className="bg-olive-700/60 hover:bg-olive-600/80 px-4 rounded-r-full text-olive-400 border border-l-0 border-olive-700/40 transition-colors">
            <FiSearch size={16} />
          </button>
          {showSuggestions && hasSuggestions && (
            <div className="search-suggestions">
              {suggestions.titles.map((title, i) => (
                <button key={i} type="button" onMouseDown={() => handleSuggestionClick(title)}
                  className="search-suggestion-item w-full text-left">
                  <FiSearch size={13} className="text-olive-400 shrink-0" />
                  <span className="truncate">{title}</span>
                </button>
              ))}
              {suggestions.channels.length > 0 && suggestions.titles.length > 0 && (
                <div className="border-t border-olive-700/20 mx-3 my-1" />
              )}
              {suggestions.channels.map((ch) => (
                <button key={ch.id} type="button" onMouseDown={() => handleChannelClick(ch.id)}
                  className="search-suggestion-item w-full text-left">
                  <FiTv size={13} className="text-olive-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{ch.username}</span>
                    <span className="text-xs text-olive-300/60">{ch.subscribers_count} subscribers</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link to="/upload" className="hidden sm:flex items-center gap-1.5 bg-olive-500 hover:bg-olive-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <FiUpload size={15} /> Upload
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-olive-300 hover:text-olive-100 p-0.5"
                >
                  <div className="w-8 h-8 rounded-full bg-olive-700 border-2 border-olive-600/50 hover:border-olive-500 flex items-center justify-center text-olive-100 text-sm font-bold uppercase transition-colors overflow-hidden">
                    {user.avatar
                      ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                      : user.username?.[0] || 'U'
                    }
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 dropdown-glass py-2 w-52 z-50">
                    <div className="px-4 py-2 border-b border-olive-700/30 mb-1">
                      <p className="text-olive-100 font-semibold text-sm">{user.username}</p>
                      <p className="text-olive-300 text-xs">{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-olive-200 hover:bg-olive-800/40 text-sm transition-colors">
                      <FiUser size={14} /> My Profile
                    </Link>
                    <Link to="/upload" onClick={() => setMenuOpen(false)} className="sm:hidden flex items-center gap-2 px-4 py-2 text-olive-200 hover:bg-olive-800/40 text-sm transition-colors">
                      <FiUpload size={14} /> Upload
                    </Link>
                    {(user?.is_staff || user?.is_superuser || user?.role === 'admin') && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-olive-400 hover:bg-olive-800/40 text-sm transition-colors">
                        <FiShield size={14} /> Admin Panel
                      </Link>
                    )}
                    <hr className="border-olive-700/30 my-1" />
                    <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-900/20 text-sm w-full transition-colors">
                      <FiLogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="bg-olive-500 hover:bg-olive-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <form onSubmit={handleSearch} className="sm:hidden px-3 pb-2 -mt-0.5">
        <div className="flex">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-olive-800/40 border border-olive-700/40 rounded-l-full px-4 py-1.5 text-olive-100 placeholder-olive-300/40 focus:outline-none text-sm transition-colors"
          />
          <button type="submit" className="bg-olive-700/60 px-3 rounded-r-full text-olive-400 border border-l-0 border-olive-700/40">
            <FiSearch size={14} />
          </button>
        </div>
      </form>
    </nav>
  );
}
