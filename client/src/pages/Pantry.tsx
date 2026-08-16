import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi } from '../services/api';
import type { FoodItem, FreshnessStatus, StorageLocation } from '../types';
import { enrichFood, getDaysRemaining } from '../utils/freshness';
import FoodCard from '../components/FoodCard';
import toast from 'react-hot-toast';
import { Search, Plus, Camera, SlidersHorizontal, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { PANTRY_REFRESH_EVENT } from '../components/AppLayout';

type Tab = 'all' | 'use-soon' | 'coming-soon' | 'fresh' | 'past';

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Items' },
  { key: 'use-soon', label: '⚠️ Use Soon' },
  { key: 'coming-soon', label: 'Coming Soon' },
  { key: 'fresh', label: '🌿 Fresh' },
  { key: 'past', label: 'Past Date' },
];

const locationTabs: { key: 'ALL' | StorageLocation; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All Places', icon: '🏠' },
  { key: 'FRIDGE', label: 'Fridge', icon: '🧊' },
  { key: 'FREEZER', label: 'Freezer', icon: '❄️' },
  { key: 'PANTRY', label: 'Pantry', icon: '🥫' },
  { key: 'COUNTER', label: 'Counter', icon: '🍎' },
];

type SortKey = 'urgent' | 'recent' | 'name' | 'date';
const sorts: { key: SortKey; label: string }[] = [
  { key: 'urgent', label: 'Most Urgent First' },
  { key: 'recent', label: 'Recently Added' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'date', label: 'Listed Expiry Date' },
];

export default function Pantry() {
  const navigate = useNavigate();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [locationFilter, setLocationFilter] = useState<'ALL' | StorageLocation>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('urgent');
  const [search, setSearch] = useState('');
  const [showSort, setShowSort] = useState(false);

  const load = useCallback(async () => {
    try {
      // Use 'ACTIVE' — the server supports 'ACTIVE', 'CONSUMED', 'DISCARDED', and 'ALL'
      const { data } = await foodsApi.list('ACTIVE');
      setFoods(data);
    } catch { toast.error('Could not load pantry'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Refresh pantry when AI Quick Add completes
    const handler = () => load();
    window.addEventListener(PANTRY_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PANTRY_REFRESH_EVENT, handler);
  }, [load]);

  const handleQuickConsume = async (id: string) => {
    try {
      await foodsApi.consume(id);
      toast.success('Marked as consumed! 🌿');
      load();
    } catch { toast.error('Failed'); }
  };

  const copyPantrySummary = () => {
    if (foods.length === 0) {
      toast.error('No items in pantry to copy');
      return;
    }
    const text = foods
      .filter(f => f.status === 'ACTIVE')
      .map(f => `• ${f.name} (${f.category}) — Best Before: ${f.listed_date} [${f.storage_location || 'FRIDGE'}]`)
      .join('\n');
    
    navigator.clipboard.writeText(`🌿 FreshGuard Pantry Inventory (${new Date().toLocaleDateString()}):\n\n${text}`);
    toast.success('Pantry list copied to clipboard! 📋');
  };

  const enriched = foods.map(f => ({ ...enrichFood(f), _created: f.created_at }));

  // Status Filter
  const statusFilterMap: Record<Tab, FreshnessStatus[]> = {
    'all': [],
    'use-soon': ['use-soon', 'today'],
    'coming-soon': ['coming-soon'],
    'fresh': ['fresh'],
    'past': ['past'],
  };

  let filtered = tab === 'all' ? enriched : enriched.filter(f => statusFilterMap[tab].includes(f.freshnessStatus));
  if (tab !== 'all') filtered = filtered.filter(f => f.status === 'ACTIVE');

  // Storage Location Filter
  if (locationFilter !== 'ALL') {
    filtered = filtered.filter(f => (f.storage_location || 'FRIDGE') === locationFilter);
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortKey === 'urgent') return getDaysRemaining(a.listed_date) - getDaysRemaining(b.listed_date);
    if (sortKey === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    if (sortKey === 'date') return new Date(a.listed_date).getTime() - new Date(b.listed_date).getTime();
    return 0;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Pantry</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track, organize, and monitor food shelf-life</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyPantrySummary} className="btn-secondary flex items-center gap-1 text-xs py-2 px-3" title="Copy Pantry List">
            <Copy size={13} /> Copy List
          </button>
          <button onClick={() => navigate('/add')} className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 font-semibold">
            <Plus size={14} /> Add
          </button>
          <button onClick={() => navigate('/scan')} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 font-semibold shadow-xs">
            <Camera size={14} /> Scan
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search groceries by name or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input pl-9 text-sm py-2.5"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                tab === t.key
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort button */}
        <div className="relative ml-2 shrink-0">
          <button
            onClick={() => setShowSort(!showSort)}
            className="btn-ghost flex items-center gap-1 text-xs font-semibold"
          >
            <SlidersHorizontal size={13} /> Sort
          </button>
          {showSort && (
            <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-1.5 min-w-[170px]">
              {sorts.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setSortKey(s.key); setShowSort(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${
                    sortKey === s.key ? 'text-green-600 font-bold bg-green-50/50' : 'text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Storage Location Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-gray-100">
        {locationTabs.map(loc => (
          <button
            key={loc.key}
            onClick={() => setLocationFilter(loc.key)}
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              locationFilter === loc.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80'
            }`}
          >
            <span>{loc.icon}</span>
            <span>{loc.label}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="text-4xl mb-3">📦</div>
          <div className="font-bold text-gray-700 text-sm mb-1">
            {search ? 'No matching items found' : tab === 'all' ? 'Your pantry is currently empty' : 'No items in this category'}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {search ? 'Try adjusting your search query or location filter' : 'Scan packaging or add manually to fill your pantry'}
          </p>
          {tab === 'all' && !search && (
            <div className="flex justify-center gap-2">
              <button onClick={() => navigate('/scan')} className="btn-primary text-xs">
                📷 Scan Label
              </button>
              <button onClick={() => navigate('/add')} className="btn-secondary text-xs">
                + Add Item
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((food, i) => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <FoodCard food={food} onQuickConsume={food.status === 'ACTIVE' ? handleQuickConsume : undefined} />
            </motion.div>
          ))}
          <div className="text-center text-xs text-gray-400 pt-3">
            Showing {filtered.length} item{filtered.length !== 1 ? 's' : ''} in pantry
          </div>
        </div>
      )}
    </div>
  );
}
