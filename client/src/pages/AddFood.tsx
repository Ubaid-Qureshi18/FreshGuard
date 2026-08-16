import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi } from '../services/api';
import toast from 'react-hot-toast';
import { CATEGORIES, CATEGORY_EMOJIS, DATE_TYPE_LABELS } from '../utils/freshness';
import type { FoodCategory } from '../types';
import { Sparkles, Calendar, PlusCircle } from 'lucide-react';

export default function AddFood() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Vegetables' as FoodCategory,
    quantity: '1',
    unit: 'pack',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    notification_enabled: true,
  });

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const setPresetDays = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    set('listed_date', d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.listed_date) {
      toast.error('Food name and listed date are required');
      return;
    }
    setLoading(true);
    try {
      await foodsApi.add({
        ...form,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        unit: form.unit || null,
      });
      toast.success(`${form.name} added to pantry! 🌿`);
      navigate('/pantry');
    } catch {
      toast.error('Failed to add food. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Food Item</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manually record groceries into your digital pantry</p>
          </div>
        </div>
        <button onClick={() => navigate('/scan')} className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3">
          <Sparkles size={14} className="text-green-600" /> Or Scan Label
        </button>
      </div>

      <form onSubmit={handleSubmit} className="fresh-card p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Food Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Greek Yogurt, Sourdough Bread, Fresh Spinach"
            className="form-input text-base py-3"
            autoFocus
          />
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Category</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => set('category', cat)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                  form.category === cat
                    ? 'border-green-500 bg-green-50 text-green-800 font-bold shadow-sm ring-2 ring-green-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl mb-1">{CATEGORY_EMOJIS[cat]}</span>
                <span className="leading-tight text-center truncate w-full" style={{ fontSize: '10px' }}>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Type & Listed Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date Type</label>
            <select
              value={form.date_type}
              onChange={e => set('date_type', e.target.value)}
              className="form-select text-sm py-2.5"
            >
              {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Listed Date *</span>
            </label>
            <input
              type="date"
              required
              value={form.listed_date}
              onChange={e => set('listed_date', e.target.value)}
              className="form-input text-sm py-2.5"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div>
          <div className="text-xs text-gray-400 font-medium mb-2">Quick Date Shortcuts:</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '+2 Days', days: 2 },
              { label: '+5 Days', days: 5 },
              { label: '+1 Week', days: 7 },
              { label: '+2 Weeks', days: 14 },
              { label: '+1 Month', days: 30 },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPresetDays(p.days)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-800 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</label>
            <input
              type="number"
              value={form.quantity}
              min="0"
              step="0.01"
              onChange={e => set('quantity', e.target.value)}
              placeholder="e.g. 1, 500"
              className="form-input text-sm py-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unit</label>
            <select
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              className="form-select text-sm py-2.5"
            >
              {['pack', 'pieces', 'g', 'kg', 'ml', 'L', 'oz', 'bunch', 'box', 'can', 'bottle'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expiry Reminders Checkbox */}
        <div className="bg-green-50/60 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Automatic Expiry Reminders</div>
            <div className="text-xs text-gray-500 mt-0.5">Notify me 7, 3, and 1 day before expiration</div>
          </div>
          <input
            type="checkbox"
            checked={form.notification_enabled}
            onChange={e => set('notification_enabled', e.target.checked)}
            className="w-5 h-5 accent-green-600 rounded cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 py-3">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base shadow-md shadow-green-600/20"
          >
            <PlusCircle size={18} />
            {loading ? 'Adding…' : 'Add to Pantry'}
          </button>
        </div>
      </form>
    </div>
  );
}
