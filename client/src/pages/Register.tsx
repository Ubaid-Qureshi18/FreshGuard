import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '' };
    if (password.length < 6) return { label: 'Too short (min 6 chars)', color: 'text-red-500 bg-red-50 border-red-200' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { label: 'Strong Password 💪', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    return { label: 'Good Password 👍', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  const pwStrength = getPasswordStrength();

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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8">
          {/* Header Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-900 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-3.5 shadow-lg shadow-emerald-900/20">
              🌿
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-gray-400 text-xs mt-1 font-medium">Join FreshGuard & reduce kitchen food waste</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User size={13} className="text-gray-400" /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="form-input text-xs py-3"
              />
            </div>

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
                <Lock size={13} className="text-gray-400" /> Create Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="form-input text-xs py-3 pr-10"
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

              {pwStrength.label && (
                <div className="mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pwStrength.color}`}>
                    {pwStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-gray-400" /> Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="form-input text-xs py-3"
                autoComplete="new-password"
              />
              {confirm && confirm !== password && (
                <div className="text-[11px] text-red-500 font-semibold mt-1">Passwords do not match</div>
              )}
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
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Create Account & Get Started</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-800 font-bold hover:underline">
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium mt-4">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Instant Access — No Email Verification Wait</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
