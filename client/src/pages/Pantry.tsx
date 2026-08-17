import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, ai as aiApi } from '../services/api';
import type { FoodItem, StorageLocation } from '../types';
import { enrichFood, formatQuantity, getStatusCss, getCountdown } from '../utils/freshness';
import { getFoodImageUrl } from '../utils/foodData';
import toast from 'react-hot-toast';
import { Search, Plus, Camera, Copy, Sparkles, X, ShieldCheck, AlertTriangle, Lightbulb, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PANTRY_REFRESH_EVENT } from '../components/AppLayout';

type Tab = 'all' | 'use-first' | 'use-soon' | 'fresh' | 'past';

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'use-first', label: '🔥 USE FIRST' },
  { key: 'use-soon', label: '🟠 USE SOON' },
  { key: 'fresh', label: '🟢 FRESH' },
  { key: 'past', label: '⚪ PAST DATE' },
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

interface AuditResult {
  safetyScore: number;
  highRiskItems: string[];
  healthyHighlights: string[];
  auditSummary: string;
  actionSteps: string[];
}

export default function Pantry() {
  const navigate = useNavigate();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [locationFilter, setLocationFilter] = useState<'ALL' | StorageLocation>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('urgent');
  const [search, setSearch] = useState('');
  const [showSort, setShowSort] = useState(false);

  // AI Audit Modal
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await foodsApi.list('ACTIVE');
      setFoods(Array.isArray(data) ? data : (Array.isArray(data?.foods) ? data.foods : []));
    } catch { toast.error('Could not load pantry'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
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

  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const { data } = await aiApi.auditPantry();
      setAuditData(data as AuditResult);
      setShowAuditModal(true);
      toast.success('AI Pantry Audit complete! 🛡️');
    } catch {
      toast.error('Could not run pantry audit');
    } finally {
      setAuditLoading(false);
    }
  };

  const safeFoods = Array.isArray(foods) ? foods : [];

  const copyPantrySummary = () => {
    if (safeFoods.length === 0) {
      toast.error('No items in pantry to copy');
      return;
    }
    const text = safeFoods
      .filter(f => f.status === 'ACTIVE')
      .map(f => `• ${f.name} (${f.category}) — Best Before: ${f.listed_date} [${f.storage_location || 'FRIDGE'}]`)
      .join('\n');
    
    navigator.clipboard.writeText(`🌿 FreshGuard Pantry Inventory (${new Date().toLocaleDateString()}):\n\n${text}`);
    toast.success('Pantry list copied to clipboard! 📋');
  };

  const enriched = safeFoods.map(f => ({ ...enrichFood(f), _created: f.created_at }));

  // Status Filter
  let filtered = enriched;
  if (tab === 'use-first') {
    filtered = enriched.filter(f => f.priorityScore >= 70 || f.daysRemaining <= 1);
  } else if (tab === 'use-soon') {
    filtered = enriched.filter(f => f.daysRemaining >= 2 && f.daysRemaining <= 3);
  } else if (tab === 'fresh') {
    filtered = enriched.filter(f => f.daysRemaining > 3);
  } else if (tab === 'past') {
    filtered = enriched.filter(f => f.daysRemaining < 0);
  }

  // Storage Location Filter
  if (locationFilter !== 'ALL') {
    filtered = filtered.filter(f => (f.storage_location || 'FRIDGE') === locationFilter);
  }

  // Search
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(f =>
      (f?.name ? String(f.name).toLowerCase() : '').includes(q) ||
      (f?.category ? String(f.category).toLowerCase() : '').includes(q)
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortKey === 'urgent') return b.priorityScore - a.priorityScore || a.daysRemaining - b.daysRemaining;
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Digital Pantry</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Track, organize, and monitor food shelf-life</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunAudit}
            disabled={auditLoading}
            className="btn-secondary text-emerald-800 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 flex items-center gap-1.5 text-xs py-2 px-3 font-bold"
          >
            <Sparkles size={13} className="text-emerald-700 animate-pulse" />
            {auditLoading ? 'Auditing…' : 'AI Health Audit'}
          </button>
          <button onClick={copyPantrySummary} className="btn-secondary flex items-center gap-1 text-xs py-2 px-3" title="Copy Pantry List">
            <Copy size={13} /> Copy
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown Toggle */}
        <button
          onClick={() => setShowSort(!showSort)}
          className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ${
            showSort ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'
          }`}
          title="Sort Options"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Expanded Sort Selector */}
      {showSort && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white border border-gray-100 rounded-2xl p-3 mb-4 shadow-sm flex flex-wrap gap-2 text-xs"
        >
          <span className="text-gray-400 font-bold self-center mr-1">Sort by:</span>
          {sorts.map(s => (
            <button
              key={s.key}
              onClick={() => { setSortKey(s.key); setShowSort(false); }}
              className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                sortKey === s.key ? 'bg-emerald-800 text-white font-bold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Storage Location Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2">
        {locationTabs.map(loc => (
          <button
            key={loc.key}
            onClick={() => setLocationFilter(loc.key)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors flex items-center gap-1 border whitespace-nowrap ${
              locationFilter === loc.key
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold'
                : 'bg-white text-gray-500 border-gray-200/80 hover:bg-gray-50'
            }`}
          >
            <span>{loc.icon}</span>
            <span>{loc.label}</span>
          </button>
        ))}
      </div>

      {/* Food Grid — list on mobile, 2-col on tablet+ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[100px] bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="text-4xl mb-2">🥗</div>
          <div className="font-bold text-gray-800 text-sm">No items found</div>
          <p className="text-xs text-gray-400 mt-1 mb-5">Try adjusting search or filter tabs</p>
          <button onClick={() => navigate('/add')} className="btn-primary text-xs py-2.5 px-4">
            Add New Groceries
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.map(food => {
            const imgUrl = food.image_url || getFoodImageUrl(food.name, food.category);
            const statusCss = getStatusCss(food.freshnessStatus);
            return (
              <motion.div
                key={food.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="fresh-card flex items-center gap-3 p-3.5 cursor-pointer group"
                onClick={() => navigate(`/food/${food.id}`)}
              >
                {/* Food image */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                  <img
                    src={imgUrl}
                    alt={food.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const t = e.currentTarget;
                      t.onerror = null;
                      t.src = 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=200&q=70&auto=format';
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                    {food.name}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                    {formatQuantity(food) || '1 pack'} · {food.category}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCss}`}>
                      {food.statusLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">{getCountdown(food.daysRemaining)}</span>
                  </div>
                </div>

                {/* Quick consume */}
                {food.freshnessStatus !== 'fresh' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQuickConsume(food.id); }}
                    className="text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded-xl transition-colors border border-emerald-200 shrink-0"
                  >
                    ✓
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* AI Pantry Health Audit Modal */}
      <AnimatePresence>
        {showAuditModal && auditData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-800/20">
                    🛡️
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-base">AI Pantry Health Audit</h2>
                    <p className="text-xs text-gray-500">Clinical food safety & waste prevention report</p>
                  </div>
                </div>
                <button onClick={() => setShowAuditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Score Banner */}
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Overall Freshness Index</div>
                    <div className="text-2xl font-extrabold mt-0.5">{auditData.safetyScore} / 100</div>
                    <div className="text-xs text-emerald-100 mt-0.5">Pantry status is optimized for safety</div>
                  </div>
                  <ShieldCheck size={40} className="text-emerald-300 opacity-80" />
                </div>

                {/* Summary */}
                <div className="fresh-card p-3.5 bg-gray-50/70 border border-gray-200/80">
                  <p className="text-gray-700 leading-relaxed">{auditData.auditSummary}</p>
                </div>

                {/* High Risk Items */}
                {auditData.highRiskItems && auditData.highRiskItems.length > 0 && (
                  <div>
                    <div className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle size={14} /> Attention Needed (Expiring Soon):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {auditData.highRiskItems.map((item, idx) => (
                        <span key={idx} className="bg-rose-50 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-rose-200">
                          🚨 {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Steps */}
                <div>
                  <div className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1.5 text-emerald-800">
                    <Lightbulb size={14} className="text-amber-500" /> Actionable Recommendations:
                  </div>
                  <div className="space-y-1.5">
                    {auditData.actionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-emerald-950">
                        <span className="font-bold text-emerald-700 shrink-0">✓</span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setShowAuditModal(false)} className="btn-primary text-xs py-2 px-5">
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
