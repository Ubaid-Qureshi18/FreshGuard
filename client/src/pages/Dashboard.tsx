import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foods as foodsApi, stats as statsApi } from '../services/api';
import type { FoodItem } from '../types';
import { enrichFood, sortByUrgency, getUrgentFoods } from '../utils/freshness';
import FoodCard from '../components/FoodCard';
import toast from 'react-hot-toast';
import { Plus, Camera, Flame, ChevronRight, TrendingUp, ShoppingBasket, Leaf, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PANTRY_REFRESH_EVENT } from '../components/AppLayout';

const DEMO_FOODS: FoodItem[] = [
  { id: 'demo-Spinach', user_id: '', name: 'Spinach', category: 'Vegetables', quantity: 100, unit: 'g', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Milk', user_id: '', name: 'Milk', category: 'Dairy', quantity: 500, unit: 'ml', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Tomatoes', user_id: '', name: 'Tomatoes', category: 'Vegetables', quantity: 3, unit: 'pieces', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Eggs', user_id: '', name: 'Eggs', category: 'Eggs', quantity: 6, unit: 'pieces', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10), image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Rice', user_id: '', name: 'Rice', category: 'Grains', quantity: 1, unit: 'kg', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 36 * 86400000).toISOString().slice(0, 10), image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
];

interface LiveStats {
  total: number; urgentCount: number; warningCount: number; freshCount: number;
  consumed: number; discarded: number; rescued: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [foodsRes, statsRes] = await Promise.allSettled([
        foodsApi.list('ACTIVE'),
        statsApi.get(),
      ]);
      if (foodsRes.status === 'fulfilled') setAllFoods(foodsRes.value.data);
      if (statsRes.status === 'fulfilled') setLiveStats(statsRes.value.data.stats);
    } catch {
      toast.error('Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Listen for pantry refresh events (from AI Quick Add, etc.)
    const handler = () => loadData();
    window.addEventListener(PANTRY_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PANTRY_REFRESH_EVENT, handler);
  }, [loadData]);

  const handleQuickConsume = async (id: string) => {
    try {
      await foodsApi.consume(id);
      toast.success('Marked as consumed! 🌿');
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  const enriched = sortByUrgency(allFoods.map(enrichFood));
  const useDemoData = !loading && allFoods.length === 0;
  const displayItems = useDemoData ? sortByUrgency(DEMO_FOODS.map(enrichFood)) : enriched;
  const displayUrgent = getUrgentFoods(displayItems);

  const stats = useDemoData
    ? { total: 5, urgentCount: 2, warningCount: 1, freshCount: 2, consumed: 0, discarded: 0, rescued: 0 }
    : liveStats || {
        total: allFoods.length,
        urgentCount: enriched.filter(f => f.daysRemaining <= 1).length,
        warningCount: enriched.filter(f => f.daysRemaining >= 2 && f.daysRemaining <= 3).length,
        freshCount: enriched.filter(f => f.daysRemaining > 3).length,
        consumed: 0, discarded: 0, rescued: 0,
      };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.email?.split('@')[0] || '';

  const statCards = [
    { n: stats.total, l: 'Total Items', icon: ShoppingBasket, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    { n: stats.freshCount, l: 'Fresh & Safe', icon: Leaf, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    { n: stats.urgentCount + stats.warningCount, l: 'Needs Attention', icon: AlertTriangle, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    { n: stats.consumed + stats.rescued, l: 'Saved from Waste', icon: TrendingUp, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-7"
      >
        <div className="text-[22px] font-bold text-gray-900 tracking-tight">
          {greeting}{name ? `, ${name}` : ''} 👋
        </div>
        <div className="text-gray-400 text-sm mt-1 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      {/* Demo Banner */}
      {useDemoData && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/70 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between shadow-xs"
        >
          <div>
            <div className="font-bold text-amber-800 text-sm">👀 Demo Mode — Sample Data</div>
            <div className="text-amber-600 text-xs mt-0.5">Scan a food label or add items to start tracking your pantry</div>
          </div>
          <div className="flex gap-2 ml-3">
            <button onClick={() => navigate('/scan')} className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-700 transition-colors whitespace-nowrap">
              Scan Food
            </button>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`${s.bg} ${s.border} border rounded-2xl p-3.5 text-center relative overflow-hidden`}
          >
            <div className={`text-2xl font-extrabold ${s.text} leading-none`}>{loading ? '—' : s.n}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-semibold">{s.l}</div>
          </motion.div>
        ))}
      </div>

      {/* Rescue Banner */}
      {displayUrgent.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => navigate('/rescue')}
          className="w-full mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl px-5 py-4 flex items-center justify-between text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-orange-500/25"
        >
          <div>
            <div className="text-white font-bold text-base">🍳 Rescue My Food</div>
            <div className="text-orange-100 text-sm mt-0.5">
              {displayUrgent.length} ingredient{displayUrgent.length > 1 ? 's' : ''} {displayUrgent.length > 1 ? 'need' : 'needs'} your attention today
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            <Flame className="text-orange-200" size={18} />
          </div>
        </motion.button>
      )}

      {/* USE FIRST section */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Use First</div>
        <button
          onClick={() => navigate('/pantry')}
          className="text-xs text-emerald-700 font-bold flex items-center gap-0.5 hover:underline"
        >
          View all <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[72px] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-5xl mb-3">🥗</div>
          <div className="font-bold text-gray-700 mb-1">Your pantry is empty</div>
          <div className="text-sm text-gray-400 mb-5">Scan your first food item to get started</div>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/scan')} className="btn-primary flex items-center gap-2 text-sm py-2.5">
              <Camera size={15} /> Scan Food
            </button>
            <button onClick={() => navigate('/add')} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
              <Plus size={15} /> Add Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayItems.slice(0, 6).map((food, i) => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <FoodCard
                food={food}
                onQuickConsume={!useDemoData ? handleQuickConsume : undefined}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center justify-center gap-2 bg-emerald-800 text-white rounded-2xl py-3.5 font-bold text-xs hover:bg-emerald-900 transition-all shadow-md shadow-emerald-800/20"
        >
          <Camera size={15} /> Scan Label
        </button>
        <button
          onClick={() => navigate('/add')}
          className="flex items-center justify-center gap-2 bg-white text-gray-800 rounded-2xl py-3.5 font-bold text-xs border border-gray-200 hover:bg-gray-50 transition-colors shadow-xs"
        >
          <Plus size={15} /> Add Item
        </button>
        <button
          onClick={() => navigate('/rescue')}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 border border-orange-200/70 rounded-2xl py-3.5 font-bold text-xs hover:bg-orange-100 transition-colors"
        >
          <Flame size={14} className="text-orange-500" /> AI Meal Planner
        </button>
      </div>
    </div>
  );
}
