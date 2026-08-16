import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email || 'demo@freshguard.com', password || 'Password123!');
      toast.success('Welcome back to FreshGuard! 🌿');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (demoEmail = 'demo@freshguard.com') => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setLoading(true);
    try {
      await login(demoEmail, 'Password123!');
      toast.success(`Signed in as ${demoEmail} 🌿`);
      navigate('/dashboard');
    } catch {
      toast.error('Quick demo sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 relative overflow-hidden">
          {/* Top Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-900 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-3.5 shadow-lg shadow-emerald-900/20">
              🌿
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-gray-400 text-xs mt-1 font-medium">Sign in to your FreshGuard Pantry & AI Studio</p>
          </div>

          {/* Quick Demo Sign In Button */}
          <button
            type="button"
            onClick={() => handleDemoSignIn('demo@freshguard.com')}
            disabled={loading}
            className="w-full mb-6 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs font-bold transition-all shadow-md shadow-emerald-800/20 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-200 animate-pulse" />
              <span>Instant 1-Click Demo Access</span>
            </div>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-lg text-[10px] group-hover:translate-x-0.5 transition-transform">
              Demo Login →
            </span>
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-gray-100 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest absolute">or sign in with email</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Mail size={13} className="text-gray-400" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input text-xs py-3"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lock size={13} className="text-gray-400" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input text-xs py-3 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs rounded-2xl px-4 py-3 border border-red-100 font-medium">
                🚨 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-bold shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In to FreshGuard</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Chips */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 text-center">
              Quick Test Accounts
            </div>
            <div className="flex justify-center gap-2">
              {[
                { label: '🌿 Demo User', email: 'demo@freshguard.com' },
                { label: '👨‍🍳 Chef Mode', email: 'chef@freshguard.com' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoSignIn(acc.email)}
                  className="text-[11px] font-semibold bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-900 border border-gray-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-800 font-bold hover:underline">
              Create one for free
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium mt-4">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>256-bit Secure AI Encryption</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
