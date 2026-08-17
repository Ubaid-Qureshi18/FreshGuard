import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter your email and password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim());
      toast.success('Account created successfully! Welcome to FreshGuard! 🌿');
      navigate('/dashboard');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white text-3xl shadow-xl shadow-emerald-800/20 mb-3">
            🌿
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create FreshGuard Account</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Start saving money and preventing food waste today</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/50 border border-gray-100/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Chef Gordon"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="chef@freshguard.app"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-700/25 hover:from-emerald-800 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Features highlight */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span>Smart Expiry Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600 shrink-0" />
              <span>AI Packet Vision</span>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6 text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-800 hover:underline">
            Sign In Here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
