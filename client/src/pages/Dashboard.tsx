import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, stats as statsApi } from '../services/api';
import type { FoodItem } from '../types';
import { enrichFood, sortByUrgency, formatQuantity, formatDate } from '../utils/freshness';
import toast from 'react-hot-toast';
import { Plus, Camera, Flame, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PANTRY_REFRESH_EVENT } from '../components/AppLayout';

const DEMO_FOODS: FoodItem[] = [
  { id: 'demo-Spinach', user_id: '', name: 'Spinach', category: 'Vegetables', quantity: 100, unit: 'g', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), purchase_price: 60, image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Milk', user_id: '', name: 'Whole Milk', category: 'Dairy', quantity: 500, unit: 'ml', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), purchase_price: 90, image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Tomatoes', user_id: '', name: 'Tomatoes', category: 'Vegetables', quantity: 3, unit: 'pieces', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), purchase_price: 80, image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Avocado', user_id: '', name: 'Avocados Pack', category: 'Fruits', quantity: 2, unit: 'pack', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), purchase_price: 135, image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
  { id: 'demo-Eggs', user_id: '', name: 'Eggs', category: 'Eggs', quantity: 6, unit: 'pieces', date_type: 'BEST_BEFORE', listed_date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10), purchase_price: 60, image_url: null, status: 'ACTIVE', notification_enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), consumed_at: null, discarded_at: null },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [foodsRes, statsRes] = await Promise.allSettled([
        foodsApi.list('ACTIVE'),
        statsApi.get(),
      ]);
      if (foodsRes.status === 'fulfilled') {
        const rawData = foodsRes.value.data;
        setAllFoods(Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.foods) ? rawData.foods : []));
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.stats) {
        setLiveStats(statsRes.value.data.stats);
      }
    } catch {
      toast.error('Could not load kitchen command center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener(PANTRY_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PANTRY_REFRESH_EVENT, handler);
  }, [loadData]);

  const handleQuickConsume = async (id: string) => {
    try {
      await foodsApi.consume(id);
      toast.success('Marked as consumed! 🌿');
      loadData();
    } catch { toast.error('Failed to update food status'); }
  };

  const safeFoods = Array.isArray(allFoods) ? allFoods : [];
  const enriched = sortByUrgency(safeFoods.map(enrichFood));
  const useDemoData = !loading && safeFoods.length === 0;
  const displayItems = useDemoData ? sortByUrgency(DEMO_FOODS.map(enrichFood)) : enriched;
  const displayUrgent = displayItems.filter(f => f.priorityScore >= 60 || f.daysRemaining <= 3);

  // Monetary Food At Risk Calculation
  const totalFoodAtRiskVal = displayUrgent.reduce((acc, f) => acc + (f.purchase_price || 0), 0);
  const currencySymbol = '₹';

  const stats = useDemoData
    ? { total: 5, urgentCount: 4, atRiskVal: 365, rescued: 8 }
    : {
        total: displayItems.length,
        urgentCount: displayUrgent.length,
        atRiskVal: totalFoodAtRiskVal > 0 ? totalFoodAtRiskVal : (liveStats?.totalAtRiskValue || 0),
        rescued: liveStats?.rescued || 0,
      };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning 👋' : hour < 18 ? 'Good afternoon 👋' : 'Good evening 👋';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-7 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{greeting}</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Here's what needs your attention in your kitchen today.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/scan')}
            className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 shadow-lg shadow-emerald-800/20"
          >
            <Camera size={15} /> Scan Packaging
          </button>
          <button
            onClick={() => navigate('/add')}
            className="btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>
      </motion.div>

      {/* Product Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="fresh-card p-4 flex flex-col justify-between border-l-4 border-emerald-600">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TRACKED FOOD</div>
          <div className="text-2xl font-black text-gray-900 mt-2">{stats.total}</div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-1">Active pantry items</div>
        </div>

        <div className="fresh-card p-4 flex flex-col justify-between border-l-4 border-amber-500">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">NEEDS ATTENTION</div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.urgentCount}</div>
          <div className="text-[10px] text-amber-800 font-semibold mt-1">Expiring within 3 days</div>
        </div>

        <div className="fresh-card p-4 flex flex-col justify-between border-l-4 border-rose-500">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">FOOD AT RISK</div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {stats.atRiskVal > 0 ? `${currencySymbol}${stats.atRiskVal}` : `${stats.urgentCount} items`}
          </div>
          <div className="text-[10px] text-rose-800 font-semibold mt-1">Monetary value at risk</div>
        </div>

        <div className="fresh-card p-4 flex flex-col justify-between border-l-4 border-violet-600">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">RESCUED</div>
          <div className="text-2xl font-black text-violet-700 mt-2">{stats.rescued}</div>
          <div className="text-[10px] text-violet-800 font-semibold mt-1">Saved from food waste</div>
        </div>
      </div>

      {/* 🔥 USE FIRST SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">USE FIRST</h2>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {displayUrgent.length} Priority Items
            </span>
          </div>
          <button
            onClick={() => navigate('/rescue')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Flame size={13} className="text-orange-500" /> AI Recipe Rescue All
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : displayUrgent.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-xs">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
              🌿
            </div>
            <div className="font-bold text-gray-900 text-sm">All foods are fresh & safe!</div>
            <p className="text-xs text-gray-400 mt-1">No items require immediate emergency consumption.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {displayUrgent.map(food => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`fresh-card p-4 flex flex-col justify-between space-y-3 border-l-4 ${
                  food.daysRemaining <= 0 ? 'border-l-red-600 bg-red-50/10' :
                  food.daysRemaining <= 1 ? 'border-l-orange-500 bg-orange-50/10' : 'border-l-amber-400 bg-amber-50/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                      {food.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{food.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{formatQuantity(food)}</span>
                        {food.purchase_price && (
                          <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            {currencySymbol}{food.purchase_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    food.daysRemaining <= 0 ? 'bg-red-100 text-red-800' :
                    food.daysRemaining === 1 ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {food.priorityLevel}
                  </span>
                </div>

                {/* Priority Explanation */}
                <div className="text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-gray-100 leading-relaxed font-medium">
                  {food.priorityExplanation}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400">
                    Listed: {formatDate(food.listed_date)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate('/rescue')}
                      className="text-xs font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl border border-orange-200 transition-colors flex items-center gap-1"
                    >
                      <Flame size={13} className="text-orange-500" /> Rescue Recipe
                    </button>
                    <button
                      onClick={() => handleQuickConsume(food.id)}
                      className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} className="text-emerald-600" /> Consume
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* All Pantry Teaser */}
      {safeFoods.length > displayUrgent.length && (
        <div className="fresh-card p-5 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-lg shadow-emerald-900/20">
          <div>
            <div className="font-bold text-sm">View Full Kitchen Pantry</div>
            <div className="text-xs text-emerald-200 mt-0.5">
              Manage all {safeFoods.length} tracked items, categories & shelf life
            </div>
          </div>
          <button
            onClick={() => navigate('/pantry')}
            className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
          >
            Go to Pantry <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
