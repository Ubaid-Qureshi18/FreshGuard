import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { notifications as notifApi } from '../services/api';
import {
  LayoutDashboard, ShoppingBasket, Camera, Flame,
  Bell, Settings, Sparkles, ChevronRight, X, ShoppingCart
} from 'lucide-react';
import AIQuickAddModal from './AIQuickAddModal';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard,  label: 'Dashboard',    emoji: '🏠' },
  { to: '/pantry',         icon: ShoppingBasket,   label: 'Pantry',       emoji: '🧺' },
  { to: '/rescue',         icon: Flame,            label: 'Recipes',      emoji: '🍳' },
  { to: '/shopping',       icon: ShoppingCart,     label: 'Shopping',     emoji: '🛒' },
  { to: '/notifications',  icon: Bell,             label: 'Alerts',       emoji: '🔔' },
  { to: '/settings',       icon: Settings,         label: 'Settings',     emoji: '⚙️' },
];

// Global event to refresh pantry data without full reload
export const PANTRY_REFRESH_EVENT = 'freshguard:pantry-refresh';
export function triggerPantryRefresh() {
  window.dispatchEvent(new CustomEvent(PANTRY_REFRESH_EVENT));
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const [alarmBanner, setAlarmBanner] = useState<{ urgentFoods: { name: string }[] } | null>(null);

  const checkAlarms = useCallback(async () => {
    try {
      const { data } = await notifApi.checkAlarms();
      if (data?.urgentCount !== undefined) {
        setUrgentCount(data.urgentCount);
      }
      // Show urgent banner if items expire today or are past
      if (data?.urgentFoods && data.urgentFoods.length > 0 && location.pathname !== '/notifications') {
        setAlarmBanner(data);
      }
    } catch {} // Silently fail — non-critical
  }, [location.pathname]);

  useEffect(() => {
    checkAlarms();
    const interval = setInterval(checkAlarms, 90000); // every 90s
    return () => clearInterval(interval);
  }, [checkAlarms]);

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('dashboard')) return 'Dashboard';
    if (p.includes('pantry')) return 'My Pantry';
    if (p.includes('scan')) return 'AI Scanner';
    if (p.includes('rescue') || p.includes('recipe')) return 'Recipes & Rescue';
    if (p.includes('notifications')) return 'Alarm Center';
    if (p.includes('settings')) return 'Settings';
    if (p.includes('add')) return 'Add Food';
    if (p.includes('food/')) return 'Food Details';
    return 'FreshGuard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-[#e6eae8] py-6 px-4 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-7">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-900 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-900/20">
            🌿
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base leading-tight tracking-tight">FreshGuard</div>
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">NutriMind AI</div>
          </div>
        </div>

        {/* AI Quick Add Button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center justify-between w-full mb-6 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-white text-xs font-bold hover:from-emerald-900 hover:to-emerald-800 transition-all shadow-md shadow-emerald-800/25 group"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="animate-pulse" />
            AI Smart Quick-Add
          </div>
          <ChevronRight size={13} className="text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-emerald-200' : 'text-gray-400'} />
                    <span>{label}</span>
                  </div>
                  {to === '/notifications' && urgentCount > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-red-500/90 text-white' : 'bg-red-100 text-red-700 animate-pulse'
                    }`}>
                      {urgentCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Scan Button */}
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-gray-900 text-white font-semibold text-xs hover:bg-gray-800 transition-all mb-4 shadow-md shadow-gray-900/10 mt-4"
        >
          <Camera size={15} />
          AI Camera Scanner
        </button>

        {/* App branding footer & user profile */}
        <div className="border-t border-gray-100 pt-4 px-2 space-y-2">
          {user && (
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl text-xs border border-gray-100">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="font-semibold text-gray-700 truncate text-[11px]">{user.name || user.email}</span>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="text-[10px] text-gray-400 hover:text-red-500 font-bold ml-1 shrink-0">
                Logout
              </button>
            </div>
          )}
          <div className="text-[10px] text-gray-400 font-medium text-center">FreshGuard · AI Kitchen</div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-emerald-900 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm">
              🌿
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">{getPageTitle()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="bg-emerald-800 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-md shadow-emerald-800/20"
            >
              <Sparkles size={11} /> Quick-Add
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell size={17} />
              {urgentCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-white" />
              )}
            </button>
            <button
              onClick={() => navigate('/scan')}
              className="bg-gray-900 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
            >
              📷 Scan
            </button>
          </div>
        </header>

        {/* Urgent Alarm Banner */}
        <AnimatePresence>
          {alarmBanner && alarmBanner.urgentFoods.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2.5 flex items-center justify-between">
                <button
                  onClick={() => { setAlarmBanner(null); navigate('/notifications'); }}
                  className="flex items-center gap-2 text-white"
                >
                  <span className="animate-bounce text-base">🚨</span>
                  <span className="text-xs font-bold">
                    {alarmBanner.urgentFoods.slice(0, 2).map(f => f.name).join(', ')}
                    {alarmBanner.urgentFoods.length > 2 ? ` +${alarmBanner.urgentFoods.length - 2} more` : ''} expire today!
                  </span>
                  <span className="text-red-200 text-xs">→ View Alerts</span>
                </button>
                <button onClick={() => setAlarmBanner(null)} className="text-white/70 hover:text-white ml-2">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </div>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 flex items-center justify-around pb-safe z-40 shadow-lg shadow-gray-900/5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] text-[10px] font-semibold transition-all ${
                  isActive ? 'text-emerald-800' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-100' : ''}`}>
                    <Icon size={18} className={isActive ? 'text-emerald-800' : 'text-gray-400'} />
                  </div>
                  <span className={isActive ? 'font-bold text-emerald-800' : ''}>{label.split(' ')[0]}</span>
                  {to === '/notifications' && urgentCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 border border-white" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>

      {/* Global AI Quick Add Modal */}
      <AIQuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={() => {
          // Fire custom event to refresh pantry — no full page reload needed
          triggerPantryRefresh();
          toast.success('Items added to pantry! 🌿');
        }}
      />
    </div>
  );
}
