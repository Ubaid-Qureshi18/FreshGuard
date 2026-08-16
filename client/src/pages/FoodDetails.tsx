import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { foods as foodsApi, ai as aiApi } from '../services/api';
import type { FoodItem, StorageAdvice, StorageLocation } from '../types';
import { enrichFood, formatDate, formatQuantity, getStatusCss, DATE_TYPE_LABELS, CATEGORY_EMOJIS, CATEGORIES } from '../utils/freshness';
import toast from 'react-hot-toast';
import {
  Minus, Plus, CheckCircle, Trash2, Pencil, X, Sparkles, Snowflake,
  ThermometerSnowflake, ShieldAlert, ChevronDown, ChevronUp,
  HeartPulse, Flame
} from 'lucide-react';

const STORAGE_LOCATIONS: { key: StorageLocation; label: string; icon: string }[] = [
  { key: 'FRIDGE', label: 'Fridge', icon: '🧊' },
  { key: 'FREEZER', label: 'Freezer', icon: '❄️' },
  { key: 'PANTRY', label: 'Pantry Cupboard', icon: '🥫' },
  { key: 'COUNTER', label: 'Countertop', icon: '🍎' },
];

export default function FoodDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FoodItem>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  
  // AI Storage Advisor State
  const [storageAdvice, setStorageAdvice] = useState<StorageAdvice | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showAdviceDetails, setShowAdviceDetails] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    foodsApi.get(id).then(({ data }) => {
      if (data) {
        setFood(data);
        setEditForm(data);
      }
    }).catch(() => {
      toast.error('Could not load food details');
    }).finally(() => setLoading(false));
  }, [id]);

  const loadStorageAdvice = async () => {
    if (!food) return;
    setLoadingAdvice(true);
    try {
      const { data } = await aiApi.getStorageAdvice(food.name, food.category, food.storage_location || 'FRIDGE');
      setStorageAdvice(data as StorageAdvice);
      setShowAdviceDetails(true);
    } catch {
      toast.error('Could not fetch storage advice');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleConsume = async () => {
    if (!id) return;
    try { await foodsApi.consume(id); toast.success('Marked as consumed 🌿'); navigate('/pantry'); }
    catch { toast.error('Failed'); }
  };

  const handleDiscard = async () => {
    if (!id) return;
    try { await foodsApi.discard(id); toast.success('Marked as discarded'); navigate('/pantry'); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async () => {
    if (!id) return;
    try { await foodsApi.delete(id); toast.success('Deleted from pantry'); navigate('/pantry'); }
    catch { toast.error('Failed'); }
  };

  const handleQty = async (delta: number) => {
    if (!food || !id) return;
    const newQty = Math.max(0, (food.quantity || 0) + delta);
    try {
      const { data } = await foodsApi.updateQuantity(id, newQty);
      setFood(data);
      if (newQty === 0) { toast.success('All used up! 🌿'); navigate('/pantry'); }
    } catch { toast.error('Failed'); }
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
      });
      setFood(data);
      setEditMode(false);
      toast.success('Food details updated');
    } catch { toast.error('Update failed'); }
  };

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
    </div>
  );

  if (!food) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="text-5xl mb-3">📦</div>
      <div className="font-bold text-gray-700 text-lg">Food not found</div>
      <p className="text-sm text-gray-400 mt-1 mb-6">This item may have been removed.</p>
      <button onClick={() => navigate('/pantry')} className="btn-primary">Go to Pantry</button>
    </div>
  );

  const enriched = enrichFood(food);
  const statusCss = getStatusCss(enriched.freshnessStatus);
  const locationObj = STORAGE_LOCATIONS.find(l => l.key === food.storage_location) || STORAGE_LOCATIONS[0];
  const nutrition = food.nutrition || {
    servingSize: '100g',
    calories: 120,
    protein: 4.5,
    carbs: 18.0,
    fat: 2.1,
    fiber: 2.8,
    sugar: 3.5,
    sodium: 45,
  };

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
                value={editForm.quantity || ''}
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
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSaveEdit} className="btn-primary flex-1">Save Changes</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs">← Back</button>
        {food.status === 'ACTIVE' && (
          <button onClick={() => setEditMode(true)} className="btn-ghost flex items-center gap-1.5 text-xs font-semibold">
            <Pencil size={13} /> Edit Item
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="fresh-card p-6 text-center relative overflow-hidden">
        <div className="text-6xl mb-3">{enriched.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5">{food.name}</h1>
        
        {/* Status badges row */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusCss}`}>
            {enriched.statusLabel}
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
            {locationObj.icon} {locationObj.label}
          </span>
          <span className="text-xs text-gray-400 font-medium">{enriched.countdown}</span>
        </div>

        {/* Visual Freshness Gauge */}
        <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 text-left">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1.5">
            <span>Shelf Life Remaining</span>
            <span className="font-semibold text-gray-700">
              {enriched.daysRemaining > 0 ? `${enriched.daysRemaining} days left` : 'Expired'}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                enriched.freshnessStatus === 'fresh' ? 'bg-emerald-600' :
                enriched.freshnessStatus === 'coming-soon' ? 'bg-amber-500' :
                enriched.freshnessStatus === 'use-soon' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(5, Math.min(100, Math.round((enriched.daysRemaining / 10) * 100)))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="fresh-card p-5 space-y-3">
        {[
          { label: 'Category', value: `${CATEGORY_EMOJIS[food.category]} ${food.category}` },
          { label: DATE_TYPE_LABELS[food.date_type] || 'Listed Date', value: formatDate(food.listed_date) },
          { label: 'Quantity', value: formatQuantity(food) || '1 pack' },
          { label: 'Storage Place', value: `${locationObj.icon} ${locationObj.label}` },
          { label: 'Status', value: food.status },
          { label: 'Tracked Since', value: formatDate(food.created_at) },
        ].map(d => (
          <div key={d.label} className="flex items-center justify-between text-xs py-0.5">
            <span className="text-gray-400 font-medium">{d.label}</span>
            <span className="text-gray-800 font-semibold">{d.value}</span>
          </div>
        ))}
      </div>

      {/* 🥗 Nutritional Profile Card */}
      <div className="fresh-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <HeartPulse size={14} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Nutritional Breakdown</div>
              <div className="text-[11px] text-gray-400">Estimated per {nutrition.servingSize || 'serving'}</div>
            </div>
          </div>
          {food.health_score && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Score: {food.health_score}/100
            </span>
          )}
        </div>

        {/* Macro Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div className="bg-orange-50/80 p-2.5 rounded-xl border border-orange-100">
            <div className="text-orange-950 font-bold text-sm flex items-center justify-center gap-0.5">
              <Flame size={12} className="text-orange-500" />
              {nutrition.calories || 0}
            </div>
            <div className="text-[10px] text-orange-700 font-medium">Calories</div>
          </div>
          <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
            <div className="text-blue-950 font-bold text-sm">{nutrition.protein || 0}g</div>
            <div className="text-[10px] text-blue-700 font-medium">Protein</div>
          </div>
          <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-100">
            <div className="text-amber-950 font-bold text-sm">{nutrition.carbs || 0}g</div>
            <div className="text-[10px] text-amber-700 font-medium">Carbs</div>
          </div>
          <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-100">
            <div className="text-rose-950 font-bold text-sm">{nutrition.fat || 0}g</div>
            <div className="text-[10px] text-rose-700 font-medium">Fats</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 text-center">
          <div>Fiber: <strong className="text-gray-900">{nutrition.fiber || 0}g</strong></div>
          <div>Sugar: <strong className="text-gray-900">{nutrition.sugar || 0}g</strong></div>
          <div>Sodium: <strong className="text-gray-900">{nutrition.sodium || 0}mg</strong></div>
        </div>

        {food.health_tags && food.health_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {food.health_tags.map((tag, idx) => (
              <span key={idx} className="bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                ✓ {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Food Storage Advisor Card */}
      <div className="fresh-card p-5 border border-green-200/80 bg-gradient-to-br from-green-50/40 via-white to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">AI Food Storage Advisor</div>
              <div className="text-[11px] text-gray-400">Maximize shelf life & nutrients</div>
            </div>
          </div>
          {!storageAdvice && (
            <button
              onClick={loadStorageAdvice}
              disabled={loadingAdvice}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              {loadingAdvice ? 'Analyzing…' : 'Ask AI'}
            </button>
          )}
        </div>

        {storageAdvice ? (
          <div className="space-y-3 pt-2 text-xs">
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs">
              <div className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <ThermometerSnowflake size={13} className="text-blue-500" /> Best Storage Method:
              </div>
              <p className="text-gray-600 leading-relaxed">{storageAdvice.storageTip}</p>
            </div>

            <button
              onClick={() => setShowAdviceDetails(!showAdviceDetails)}
              className="w-full flex items-center justify-between text-gray-500 font-semibold py-1 hover:text-gray-800"
            >
              <span>More Storage & Spoilage Insights</span>
              {showAdviceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdviceDetails && (
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100 text-blue-900">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <Snowflake size={12} className="text-blue-600" /> Freezing Advice:
                  </div>
                  <div>{storageAdvice.freezerAdvice}</div>
                </div>

                <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-100 text-amber-900">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <ShieldAlert size={12} className="text-amber-600" /> Spoilage Signs:
                  </div>
                  <div>{storageAdvice.spoilageSigns}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Tap <strong>Ask AI</strong> to receive tailored storage guidelines, freezing strategies, and spoilage indicators for this item.
          </p>
        )}
      </div>

      {/* Quantity Adjustment Controls */}
      {food.status === 'ACTIVE' && food.quantity !== null && (
        <div className="fresh-card p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Adjust Quantity</div>
          <div className="flex items-center justify-between">
            <button onClick={() => handleQty(-1)} className="btn-secondary w-10 h-10 flex items-center justify-center">
              <Minus size={16} />
            </button>
            <div className="text-2xl font-bold text-gray-900">
              {food.quantity} <span className="text-gray-400 text-base font-normal">{food.unit || 'pack'}</span>
            </div>
            <button onClick={() => handleQty(1)} className="btn-secondary w-10 h-10 flex items-center justify-center">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {food.status === 'ACTIVE' && (
        <div className="space-y-2.5 pt-2">
          <button onClick={handleConsume} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-800/20">
            <CheckCircle size={18} /> Mark as Consumed
          </button>

          {!confirmDiscard ? (
            <button onClick={() => setConfirmDiscard(true)} className="btn-secondary w-full py-2.5 text-xs text-gray-600">
              Discard Item (Mark as waste)
            </button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="text-xs text-red-700 font-semibold mb-2">Are you sure you want to discard this item?</div>
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
          This item was {food.status.toLowerCase()} on {formatDate(food.consumed_at || food.discarded_at || food.updated_at)}
        </div>
      )}
    </div>
  );
}
