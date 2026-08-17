import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Heart, AlertTriangle, LogOut, Trash2, Check } from 'lucide-react';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Keto', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Nut-Free'];
const ALLERGY_OPTIONS = ['Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat / Gluten', 'Fish / Shellfish'];
const CUISINE_OPTIONS = ['Indian', 'Italian', 'Mexican', 'Asian / Chinese', 'Mediterranean', 'American'];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();

  const [dietary, setDietary] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fg_pref_diet') || '[]'); } catch { return []; }
  });
  const [allergies, setAllergies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fg_pref_allergies') || '[]'); } catch { return []; }
  });
  const [cuisines, setCuisines] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fg_pref_cuisines') || '[]'); } catch { return []; }
  });
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem('fg_pref_currency') || '₹');

  useEffect(() => {
    try {
      localStorage.setItem('fg_pref_diet', JSON.stringify(dietary));
      localStorage.setItem('fg_pref_allergies', JSON.stringify(allergies));
      localStorage.setItem('fg_pref_cuisines', JSON.stringify(cuisines));
      localStorage.setItem('fg_pref_currency', currencySymbol);
    } catch {}
  }, [dietary, allergies, cuisines, currencySymbol]);

  const toggleArrayItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
    toast.success('Preferences updated!');
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all local pantry and history data? This cannot be undone.')) {
      localStorage.clear();
      toast.success('All local data cleared');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* User Header */}
      <div className="fresh-card p-6 flex items-center gap-4 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-xl shadow-emerald-900/20">
        <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0">
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black truncate">{user?.name || 'Kitchen Master'}</h1>
          <p className="text-xs text-emerald-200 truncate mt-0.5">{user?.email}</p>
          <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md mt-2">
            {isGuest ? 'Guest Pass Account' : 'Authenticated Household Member'}
          </span>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Food Safety Guidance Disclaimer */}
      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed font-medium flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-900">Food Safety Notice</span>
          FreshGuard tracks packaging listed dates (*Best Before*, *Use By*, *Expiry*). Always visually check food packaging and smell before consuming past-date items. AI recommendations will never override food safety rules.
        </div>
      </div>

      {/* Allergies & Dietary Settings (Strict AI Recipe Filtering) */}
      <div className="fresh-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">
          <ShieldCheck size={18} className="text-emerald-700" />
          <span>Allergies & Dietary Restrictions</span>
        </div>
        <p className="text-xs text-gray-500 font-medium">
          Select any allergies. AI Recipe Rescue will strictly exclude recipe suggestions containing these allergens.
        </p>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Stored Allergens</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map(allergy => {
              const active = allergies.includes(allergy);
              return (
                <button
                  key={allergy}
                  onClick={() => toggleArrayItem(allergies, setAllergies, allergy)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    active ? 'bg-red-600 border-red-600 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {active && <Check size={12} />}
                  {allergy}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dietary Preferences</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(diet => {
              const active = dietary.includes(diet);
              return (
                <button
                  key={diet}
                  onClick={() => toggleArrayItem(dietary, setDietary, diet)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    active ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {active && <Check size={12} />}
                  {diet}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Favorite Cuisines & Currency */}
      <div className="fresh-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">
          <Heart size={18} className="text-emerald-700" />
          <span>Cuisine & Currency Preferences</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Favorite Cuisines</label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map(c => {
              const active = cuisines.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleArrayItem(cuisines, setCuisines, c)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    active ? 'bg-violet-700 border-violet-700 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {active && <Check size={12} />}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900">Currency Symbol</div>
            <div className="text-[11px] text-gray-400">Used for Food At Risk monetary calculations</div>
          </div>
          <select
            value={currencySymbol}
            onChange={e => setCurrencySymbol(e.target.value)}
            className="form-select text-xs font-bold px-3 py-1.5 w-24"
          >
            <option value="₹">₹ (INR)</option>
            <option value="$">$ (USD)</option>
            <option value="€">€ (EUR)</option>
            <option value="£">£ (GBP)</option>
          </select>
        </div>
      </div>

      {/* Data Management & Account Deletion */}
      <div className="fresh-card p-5 space-y-3">
        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Account & Storage Management</div>
        <button
          onClick={handleClearData}
          className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <Trash2 size={15} /> Clear All Local Pantry & History Data
        </button>
      </div>
    </div>
  );
}
