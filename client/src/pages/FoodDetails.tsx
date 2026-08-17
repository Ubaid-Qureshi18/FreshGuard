import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { foods as foodsApi, ai as aiApi } from '../services/api';
import type { FoodItem, StorageLocation, NutritionData } from '../types';
import {
  enrichFood, formatDate, formatQuantity, getStatusCss,
  DATE_TYPE_LABELS, CATEGORY_EMOJIS, CATEGORIES,
} from '../utils/freshness';
import { getFoodImageUrl } from '../utils/foodData';
import toast from 'react-hot-toast';
import {
  Minus, Plus, CheckCircle, Trash2, Pencil, X, Sparkles, Snowflake,
  ThermometerSnowflake, ShieldAlert, ChevronDown, ChevronUp,
  HeartPulse, Flame, ArrowLeft,
} from 'lucide-react';

const STORAGE_LOCATIONS: { key: StorageLocation; label: string; icon: string }[] = [
  { key: 'FRIDGE',  label: 'Fridge',           icon: '🧊' },
  { key: 'FREEZER', label: 'Freezer',           icon: '❄️' },
  { key: 'PANTRY',  label: 'Pantry Cupboard',   icon: '🥫' },
  { key: 'COUNTER', label: 'Countertop',         icon: '🍎' },
];

interface StorageAdvice {
  bestLocation: StorageLocation;
  estimatedShelfLife: string;
  storageTip: string;
  freezerAdvice: string;
  spoilageSigns: string;
}

// ── Micronutrient display config ─────────────────────────────────────────────
const MICRO_VITAMINS: { key: keyof NutritionData; label: string; unit: string; dv: number }[] = [
  { key: 'vitaminA',  label: 'Vitamin A',  unit: 'mcg', dv: 900  },
  { key: 'vitaminC',  label: 'Vitamin C',  unit: 'mg',  dv: 90   },
  { key: 'vitaminD',  label: 'Vitamin D',  unit: 'mcg', dv: 20   },
  { key: 'vitaminE',  label: 'Vitamin E',  unit: 'mg',  dv: 15   },
  { key: 'vitaminK',  label: 'Vitamin K',  unit: 'mcg', dv: 120  },
  { key: 'vitaminB1', label: 'B1 (Thiamine)', unit: 'mg', dv: 1.2 },
  { key: 'vitaminB2', label: 'B2 (Riboflavin)', unit: 'mg', dv: 1.3 },
  { key: 'vitaminB3', label: 'B3 (Niacin)', unit: 'mg', dv: 16   },
  { key: 'vitaminB6', label: 'B6',         unit: 'mg',  dv: 1.7  },
  { key: 'vitaminB9', label: 'Folate (B9)', unit: 'mcg', dv: 400 },
  { key: 'vitaminB12',label: 'B12',        unit: 'mcg', dv: 2.4  },
];
const MICRO_MINERALS: { key: keyof NutritionData; label: string; unit: string; dv: number }[] = [
  { key: 'calcium',    label: 'Calcium',    unit: 'mg',  dv: 1300 },
  { key: 'iron',       label: 'Iron',       unit: 'mg',  dv: 18   },
  { key: 'magnesium',  label: 'Magnesium',  unit: 'mg',  dv: 420  },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg',  dv: 1250 },
  { key: 'potassium',  label: 'Potassium',  unit: 'mg',  dv: 4700 },
  { key: 'zinc',       label: 'Zinc',       unit: 'mg',  dv: 11   },
  { key: 'selenium',   label: 'Selenium',   unit: 'mcg', dv: 55   },
];

// ── Micronutrient bar ────────────────────────────────────────────────────────
function NutrientBar({ value, dv }: { value: number; dv: number }) {
  const pct = Math.min(100, Math.round((value / dv) * 100));
  const color = pct >= 20 ? 'bg-emerald-500' : pct >= 10 ? 'bg-amber-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

export default function FoodDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FoodItem>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [storageAdvice, setStorageAdvice] = useState<StorageAdvice | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showAdviceDetails, setShowAdviceDetails] = useState(false);
  const [showMicros, setShowMicros] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    foodsApi.get(id).then(({ data }) => {
      if (data) { setFood(data); setEditForm(data); }
    }).catch(() => {
      toast.error('Could not load food details');
    }).finally(() => setLoading(false));
  }, [id]);

  const loadStorageAdvice = async () => {
    if (!food) return;
    setLoadingAdvice(true);
    try {
      const { data } = await aiApi.getStorageAdvice(food.name, food.category, food.storage_location || 'FRIDGE');
      // API may return { advice: {...} } or the advice object directly
      const advice = (data as any)?.advice || data;
      setStorageAdvice(advice as StorageAdvice);
      setShowAdviceDetails(true);
    } catch {
      // Offline fallback advice
      setStorageAdvice({
        bestLocation: food.storage_location || 'FRIDGE',
        estimatedShelfLife: '3–7 days',
        storageTip: `Keep ${food.name} in a clean, airtight container in the ${(food.storage_location || 'FRIDGE').toLowerCase()}. Avoid moisture and direct sunlight.`,
        freezerAdvice: `${food.name} can typically be frozen for 1–3 months when stored in a sealed freezer bag with the air pressed out.`,
        spoilageSigns: 'Watch for unusual odors, discoloration, mold growth, or slimy texture.',
      });
      setShowAdviceDetails(true);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleConsume = async () => {
    if (!id) return;
    try { await foodsApi.consume(id); toast.success('Marked as consumed 🌿'); navigate('/pantry'); }
    catch { toast.error('Failed to mark as consumed'); }
  };

  const handleDiscard = async () => {
    if (!id) return;
    try { await foodsApi.discard(id); toast.success('Marked as discarded'); navigate('/pantry'); }
    catch { toast.error('Failed to discard'); }
  };

  const handleDelete = async () => {
    if (!id) return;
    try { await foodsApi.delete(id); toast.success('Deleted from pantry'); navigate('/pantry'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleQty = async (delta: number) => {
    if (!food || !id) return;
    const newQty = Math.max(0, (food.quantity || 0) + delta);
    try {
      const { data } = await foodsApi.updateQuantity(id, newQty);
      setFood(data);
      if (newQty === 0) { toast.success('All used up! 🌿'); navigate('/pantry'); }
    } catch { toast.error('Failed to update quantity'); }
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm) return;
    try {
      const { data } = await foodsApi.update(id, {
        name: editForm.name,
        category: editForm.category,
        date_type: editForm.date_type,
        listed_date: editForm.listed_date,
        quantity: editForm.quantity,
        unit: editForm.unit,
        storage_location: editForm.storage_location,
        notification_enabled: editForm.notification_enabled,
        notes: editForm.notes,
      });
      setFood(data);
      setEditMode(false);
      toast.success('Food details updated');
    } catch { toast.error('Update failed'); }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
    </div>
  );

  // ── Not found state ────────────────────────────────────────────────────────
  if (!food) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">📦</div>
      <div className="font-bold text-gray-700 text-xl mb-2">Food not found</div>
      <p className="text-sm text-gray-400 mb-8">This item may have been removed from your pantry.</p>
      <button onClick={() => navigate('/pantry')} className="btn-primary">← Go to Pantry</button>
    </div>
  );

  // ── Safe data ──────────────────────────────────────────────────────────────
  const safeCategory = food.category || 'Other';
  const enriched = enrichFood({ ...food, category: safeCategory });
  const statusCss = getStatusCss(enriched.freshnessStatus);
  const locationObj = STORAGE_LOCATIONS.find(l => l.key === food.storage_location) || STORAGE_LOCATIONS[0];

  const nutrition = food.nutrition || null;
  const hasMacros = nutrition && (nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat);
  const hasVitamins = nutrition && MICRO_VITAMINS.some(v => nutrition[v.key]);
  const hasMinerals = nutrition && MICRO_MINERALS.some(v => nutrition[v.key]);

  const imageUrl = !imgError
    ? (food.image_url || getFoodImageUrl(food.name, safeCategory))
    : `https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&q=80&auto=format`;

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditMode(false)} className="btn-ghost"><X size={18} /></button>
            <h1 className="text-xl font-bold text-gray-900">Edit Food Details</h1>
          </div>
        </div>
        <div className="fresh-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              className="form-input"
              placeholder="Food name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={editForm.category || 'Other'}
              onChange={e => setEditForm(p => ({ ...p, category: e.target.value as FoodItem['category'] }))}
              className="form-select"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Type</label>
              <select
                value={editForm.date_type || 'BEST_BEFORE'}
                onChange={e => setEditForm(p => ({ ...p, date_type: e.target.value as FoodItem['date_type'] }))}
                className="form-select"
              >
                {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Listed Date</label>
              <input
                type="date"
                value={editForm.listed_date || ''}
                onChange={e => setEditForm(p => ({ ...p, listed_date: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Storage Location</label>
            <select
              value={editForm.storage_location || 'FRIDGE'}
              onChange={e => setEditForm(p => ({ ...p, storage_location: e.target.value as StorageLocation }))}
              className="form-select"
            >
              {STORAGE_LOCATIONS.map(loc => (
                <option key={loc.key} value={loc.key}>{loc.icon} {loc.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.quantity ?? ''}
                onChange={e => setEditForm(p => ({ ...p, quantity: parseFloat(e.target.value) || null }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Unit</label>
              <select
                value={editForm.unit || ''}
                onChange={e => setEditForm(p => ({ ...p, unit: e.target.value || null }))}
                className="form-select"
              >
                {['', 'pack', 'pieces', 'g', 'kg', 'ml', 'L', 'oz', 'bunch', 'box', 'can'].map(u => (
                  <option key={u} value={u}>{u || '— None —'}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <textarea
              value={editForm.notes || ''}
              onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
              className="form-input resize-none"
              rows={2}
              placeholder="e.g. Organic, bought from local market"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSaveEdit} className="btn-primary flex-1">Save Changes</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        {food.status === 'ACTIVE' && (
          <button
            onClick={() => setEditMode(true)}
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {/* ── Hero Card: Image + Name + Status ───────────────────────────────── */}
      <div className="fresh-card overflow-hidden">
        {/* Food image */}
        <div className="w-full h-48 bg-gray-50 relative overflow-hidden">
          <img
            src={imageUrl}
            alt={food.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* Category badge overlay */}
          <div className="absolute top-3 left-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 shadow-xs">
              {CATEGORY_EMOJIS[safeCategory] || '📦'} {safeCategory}
            </span>
          </div>
          {/* Status badge overlay */}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCss}`}>
              {enriched.statusLabel}
            </span>
          </div>
        </div>

        {/* Name + countdown + location */}
        <div className="p-5">
          <h1 className="text-2xl font-black text-gray-900 mb-1">{food.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 font-medium">{enriched.countdown}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500 font-medium">{locationObj.icon} {locationObj.label}</span>
            {food.purchase_price && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-semibold text-emerald-700">₹{food.purchase_price}</span>
              </>
            )}
          </div>

          {/* Freshness bar */}
          <div className="mt-4 bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1.5">
              <span>Shelf Life Remaining</span>
              <span className="font-semibold text-gray-700">
                {enriched.daysRemaining > 0 ? `${enriched.daysRemaining} days left` : 'Past listed date'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  enriched.freshnessStatus === 'fresh'       ? 'bg-emerald-500' :
                  enriched.freshnessStatus === 'coming-soon' ? 'bg-amber-500'   :
                  enriched.freshnessStatus === 'use-soon'    ? 'bg-orange-500'  : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(4, Math.min(100, Math.round((enriched.daysRemaining / 14) * 100)))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Details Table ───────────────────────────────────────────────────── */}
      <div className="fresh-card p-5">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Food Details</h2>
        <div className="space-y-2.5">
          {[
            { label: DATE_TYPE_LABELS[food.date_type] || 'Listed Date', value: food.listed_date ? formatDate(food.listed_date) : '—' },
            { label: 'Quantity', value: formatQuantity(food) || '1 pack' },
            { label: 'Storage', value: `${locationObj.icon} ${locationObj.label}` },
            { label: 'Status', value: food.status ? food.status.charAt(0) + food.status.slice(1).toLowerCase() : 'Active' },
            { label: 'Tracked Since', value: food.created_at ? formatDate(food.created_at) : '—' },
            ...(food.notes ? [{ label: 'Notes', value: food.notes }] : []),
          ].map(d => (
            <div key={d.label} className="flex items-start justify-between text-sm py-0.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 font-medium">{d.label}</span>
              <span className="text-gray-800 font-semibold text-right max-w-[55%]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nutrition Card ──────────────────────────────────────────────────── */}
      {hasMacros ? (
        <div className="fresh-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <HeartPulse size={14} />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Nutritional Breakdown</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  Per {nutrition?.servingSize || '100g'}
                  {nutrition?.estimated && (
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold">ESTIMATED</span>
                  )}
                </div>
              </div>
            </div>
            {food.health_score && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Score {food.health_score}/100
              </span>
            )}
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="bg-orange-50/80 p-2.5 rounded-xl border border-orange-100">
              <div className="text-orange-950 font-bold text-base flex items-center justify-center gap-0.5">
                <Flame size={11} className="text-orange-500" />{nutrition?.calories || 0}
              </div>
              <div className="text-[10px] text-orange-700 font-semibold">Calories</div>
            </div>
            <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
              <div className="text-blue-950 font-bold text-base">{nutrition?.protein || 0}g</div>
              <div className="text-[10px] text-blue-700 font-semibold">Protein</div>
            </div>
            <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-100">
              <div className="text-amber-950 font-bold text-base">{nutrition?.carbs || 0}g</div>
              <div className="text-[10px] text-amber-700 font-semibold">Carbs</div>
            </div>
            <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-100">
              <div className="text-rose-950 font-bold text-base">{nutrition?.fat || 0}g</div>
              <div className="text-[10px] text-rose-700 font-semibold">Fat</div>
            </div>
          </div>

          {/* Secondary macros */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center mb-3">
            <div>Fiber <strong className="text-gray-900">{nutrition?.fiber ?? 0}g</strong></div>
            <div>Sugar <strong className="text-gray-900">{nutrition?.sugar ?? 0}g</strong></div>
            <div>Sodium <strong className="text-gray-900">{nutrition?.sodium ?? 0}mg</strong></div>
          </div>

          {/* Health tags */}
          {food.health_tags && food.health_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {food.health_tags.map((tag, idx) => (
                <span key={idx} className="bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ {tag}
                </span>
              ))}
            </div>
          )}

          {/* Micronutrients toggle */}
          {(hasVitamins || hasMinerals) && (
            <>
              <button
                onClick={() => setShowMicros(!showMicros)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-800 py-1.5 border-t border-gray-100 mt-2 transition-colors"
              >
                <span>{showMicros ? 'Hide' : 'Show'} Vitamins & Minerals</span>
                {showMicros ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showMicros && (
                <div className="mt-3 space-y-4">
                  {hasVitamins && (
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Vitamins (% Daily Value)</div>
                      <div className="space-y-1.5">
                        {MICRO_VITAMINS.filter(v => nutrition?.[v.key]).map(v => (
                          <div key={v.key} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-28 shrink-0">{v.label}</span>
                            <NutrientBar value={(nutrition![v.key] as number) || 0} dv={v.dv} />
                            <span className="text-[10px] text-gray-500 w-16 text-right shrink-0">
                              {nutrition![v.key]}{v.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasMinerals && (
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Minerals (% Daily Value)</div>
                      <div className="space-y-1.5">
                        {MICRO_MINERALS.filter(v => nutrition?.[v.key]).map(v => (
                          <div key={v.key} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-28 shrink-0">{v.label}</span>
                            <NutrientBar value={(nutrition![v.key] as number) || 0} dv={v.dv} />
                            <span className="text-[10px] text-gray-500 w-16 text-right shrink-0">
                              {nutrition![v.key]}{v.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="fresh-card p-4 text-center">
          <div className="text-3xl mb-2">🥗</div>
          <div className="text-sm font-semibold text-gray-500">No nutrition data available</div>
          <p className="text-xs text-gray-400 mt-1">Nutrition data will appear after scanning the product label.</p>
        </div>
      )}

      {/* ── AI Storage Advisor ──────────────────────────────────────────────── */}
      <div className="fresh-card p-5 border border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">AI Storage Advisor</div>
              <div className="text-[11px] text-gray-400">Maximize shelf life & nutrients</div>
            </div>
          </div>
          {!storageAdvice && (
            <button
              onClick={loadStorageAdvice}
              disabled={loadingAdvice}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {loadingAdvice ? 'Analyzing…' : 'Ask AI'}
            </button>
          )}
        </div>

        {storageAdvice ? (
          <div className="space-y-3 pt-1 text-xs">
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs">
              <div className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <ThermometerSnowflake size={13} className="text-blue-500" /> Storage Tip:
              </div>
              <p className="text-gray-600 leading-relaxed">{storageAdvice.storageTip}</p>
            </div>

            <button
              onClick={() => setShowAdviceDetails(!showAdviceDetails)}
              className="w-full flex items-center justify-between text-gray-500 font-semibold py-1 hover:text-gray-800"
            >
              <span>More Insights</span>
              {showAdviceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdviceDetails && (
              <div className="space-y-2">
                <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100 text-blue-900">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <Snowflake size={12} className="text-blue-600" /> Freezing:
                  </div>
                  {storageAdvice.freezerAdvice}
                </div>
                <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-100 text-amber-900">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <ShieldAlert size={12} className="text-amber-600" /> Spoilage Signs:
                  </div>
                  {storageAdvice.spoilageSigns}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Tap <strong>Ask AI</strong> to receive tailored storage guidelines, freezing strategies, and spoilage indicators for this item.
          </p>
        )}
      </div>

      {/* ── Quantity Controls ───────────────────────────────────────────────── */}
      {food.status === 'ACTIVE' && food.quantity !== null && (
        <div className="fresh-card p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Adjust Quantity</div>
          <div className="flex items-center justify-between">
            <button onClick={() => handleQty(-1)} className="btn-secondary w-11 h-11 flex items-center justify-center p-0">
              <Minus size={16} />
            </button>
            <div className="text-2xl font-black text-gray-900">
              {food.quantity} <span className="text-gray-400 text-base font-normal">{food.unit || 'pack'}</span>
            </div>
            <button onClick={() => handleQty(1)} className="btn-secondary w-11 h-11 flex items-center justify-center p-0">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Action Buttons ──────────────────────────────────────────────────── */}
      {food.status === 'ACTIVE' && (
        <div className="space-y-2.5">
          <button
            onClick={handleConsume}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-800/20"
          >
            <CheckCircle size={18} /> Mark as Consumed
          </button>

          {!confirmDiscard ? (
            <button
              onClick={() => setConfirmDiscard(true)}
              className="btn-secondary w-full py-2.5 text-xs text-gray-600"
            >
              Discard Item (Mark as food waste)
            </button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="text-xs text-red-700 font-semibold mb-2.5">
                Are you sure you want to discard this item?
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDiscard(false)} className="btn-secondary flex-1 text-xs">Keep</button>
                <button onClick={handleDiscard} className="btn-danger flex-1 text-xs">Yes, Discard</button>
              </div>
            </div>
          )}

          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} /> Delete completely from pantry
          </button>
        </div>
      )}

      {food.status !== 'ACTIVE' && (
        <div className="bg-gray-50 rounded-2xl px-5 py-4 text-center text-xs text-gray-500">
          This item was {food.status ? food.status.toLowerCase() : 'inactive'} on{' '}
          {formatDate(food.consumed_at || food.discarded_at || food.updated_at || '')}
        </div>
      )}
    </div>
  );
}
