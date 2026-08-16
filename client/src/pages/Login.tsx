import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

type AuthTab = 'signin' | 'signup';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e?: React.FormEvent) => {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Account created! Welcome to FreshGuard 🌿');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = async (roleEmail: string, roleName: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
    setLoading(true);
    try {
      await login(roleEmail, 'Password123!');
      toast.success(`Logged in as ${roleName}! 🌿`);
      navigate('/dashboard');
    } catch {
      toast.error('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 relative overflow-hidden">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-900 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-lg shadow-emerald-900/20">
              🌿
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FreshGuard AI</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">Intelligent Food Expiry & Kitchen Waste Prevention</p>

            {/* Auth Mode Toggle Tabs */}
            <div className="flex bg-gray-100/90 p-1 rounded-2xl mt-5">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'signin' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'signup' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* ⚡ 1-Click Instant Demo Login Banner */}
          <button
            type="button"
            onClick={() => handleQuickRoleSelect('demo@freshguard.com', 'Demo User')}
            disabled={loading}
            className="w-full mb-5 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs font-bold transition-all shadow-md shadow-emerald-800/20 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-200 animate-pulse" />
              <span>Instant 1-Click Demo Access</span>
            </div>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-lg text-[10px] group-hover:translate-x-0.5 transition-transform">
              Explore Demo →
            </span>
          </button>

          {activeTab === 'signin' ? (
            // ── SIGN IN FORM ─────────────────────────────────
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Mail size={13} className="text-gray-400" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input text-xs py-2.5"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-gray-400" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input text-xs py-2.5 pr-10"
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
                <div className="bg-red-50 text-red-700 text-xs rounded-2xl px-4 py-2.5 border border-red-100 font-medium">
                  🚨 {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-xs font-bold shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 mt-1"
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
          ) : (
            // ── CREATE ACCOUNT FORM ───────────────────────────
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <User size={13} className="text-gray-400" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="form-input text-xs py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Mail size={13} className="text-gray-400" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input text-xs py-2.5"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-gray-400" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="form-input text-xs py-2.5 pr-10"
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-gray-400" /> Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="form-input text-xs py-2.5"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-xs rounded-2xl px-4 py-2.5 border border-red-100 font-medium">
                  🚨 {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-xs font-bold shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Create Account & Get Started</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Preset Roles Quick Selector */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 text-center">
              Quick Role Profiles
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '🌱 Beginner Cook', email: 'beginner@freshguard.com', name: 'Beginner' },
                { label: '🍳 Zero-Waste Chef', email: 'chef@freshguard.com', name: 'Chef Mode' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickRoleSelect(acc.email, acc.name)}
                  className="text-[11px] font-semibold bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border border-gray-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl transition-all truncate"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium mt-4">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Instant Access — 256-Bit Encrypted</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
