import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Aurora from '../components/ui/Aurora';
import GradientText from '../components/ui/GradientText';

export default function RegisterPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await registerApi(form);
      loginUser(data.user, data.tokens);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const msg = Object.values(errors).flat().join(', ');
        toast.error(msg);
      } else {
        toast.error('Registration failed');
      }
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
          <p className="text-olive-300 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="johndoe"
              required
            />
          </div>
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="Min 8 characters"
              required
            />
          </div>
          <div>
            <label className="block text-olive-300 text-sm mb-1 font-medium">Confirm Password</label>
            <input
              type="password"
              name="password2"
              value={form.password2}
              onChange={handleChange}
              className="w-full bg-olive-800/40 border border-olive-700/40 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-300/30 transition-colors"
              placeholder="Repeat password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-olive-500 hover:bg-olive-400 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-[0_0_18px_rgba(99,102,241,0.3)]"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-olive-300/60 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-olive-400 hover:text-olive-300 underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
