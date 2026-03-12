import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Aurora from '../components/ui/Aurora';
import GradientText from '../components/ui/GradientText';

export default function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginApi({ email, password });
      loginUser(data.user, data.tokens);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-olive-950 flex items-center justify-center px-4 overflow-hidden">
      <Aurora />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <span className="bg-olive-500 text-white font-black px-2.5 py-1 rounded text-lg shadow-[0_0_14px_rgba(99,102,241,0.5)]">▶</span>
            <GradientText animate>MyTube</GradientText>
          </h1>
          <p className="text-olive-300 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-olive-500 hover:bg-olive-400 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-[0_0_18px_rgba(99,102,241,0.3)]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-olive-300/60 text-sm mt-4">
          Don’t have an account?{' '}
          <Link to="/register" className="text-olive-400 hover:text-olive-300 underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
