import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { stats as statsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Key, Info, TrendingUp, Sparkles, Lightbulb } from 'lucide-react';

const API_KEY_STORAGE = 'fg_display_api_key_note';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<{
    added: number; consumed: number; rescued: number; discarded: number;
  } | null>(null);
  const [apiKeyNote, setApiKeyNote] = useState(localStorage.getItem(API_KEY_STORAGE) || '');

  const load = useCallback(async () => {
    try {
      const { data } = await statsApi.get();
      setStatsData(data.stats);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => { logout(); navigate('/'); };

  const wasteScore = statsData
    ? statsData.consumed + statsData.rescued > 0
      ? Math.round(((statsData.consumed + statsData.rescued) / Math.max(statsData.added, 1)) * 100)
      : 0
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings & Impact</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage preferences, AI key, and track your sustainability impact</p>
      </div>

      {/* Account */}
      <div className="fresh-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-gray-400" />
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account</div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 font-bold text-xl shadow-xs">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{user?.email}</div>
            <div className="text-xs text-gray-400 mt-0.5">FreshGuard Active Guardian</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-danger w-full flex items-center justify-center gap-2 py-2.5 text-xs">
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      {/* Impact stats */}
      {statsData && (
        <div className="fresh-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-green-600" />
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Food Waste Impact</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { n: statsData.added, l: 'Total Groceries', icon: '📥' },
              { n: statsData.consumed, l: 'Consumed on Time', icon: '✅' },
              { n: statsData.rescued, l: 'Rescued with AI', icon: '🔥' },
              { n: statsData.discarded, l: 'Items Discarded', icon: '🗑️' },
            ].map(s => (
              <div key={s.l} className="bg-gray-50/80 rounded-2xl p-3 text-center border border-gray-100">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-gray-800">{s.n}</div>
                <div className="text-[11px] text-gray-400 font-medium">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Waste score meter */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                <Sparkles size={13} className="text-green-600" /> Sustainability Score
              </div>
              <div className="text-xl font-black text-green-700">{wasteScore}%</div>
            </div>
            <div className="w-full h-2.5 bg-green-200/80 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${wasteScore}%` }} />
            </div>
            <div className="text-[11px] text-green-700 font-medium mt-2">
              {wasteScore >= 80 ? '🌟 Outstanding! You are effectively preventing food waste.' : wasteScore >= 50 ? '👍 Great progress! Use AI Rescue for expiring foods.' : '🌱 Start logging groceries and using AI Rescue recipes to boost your score.'}
            </div>
          </div>

          {/* AI Waste Reduction Tips */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Lightbulb size={14} className="text-amber-500" /> AI Sustainability Recommendations:
            </div>
            <ul className="text-xs text-gray-500 space-y-1.5 pl-2">
              <li>• Freeze leafy greens & bread before Day 2 to extend life by up to 3 months.</li>
              <li>• Check <strong>Rescue & Meals</strong> tab twice weekly to automatically plan dinners around high-urgency items.</li>
            </ul>
          </div>
        </div>
      )}

      {/* AI API Key Information */}
      <div className="fresh-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Key size={15} className="text-gray-400" />
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Server-Side Gemini AI</div>
        </div>
        <div className="text-xs text-gray-600 mb-3 leading-relaxed">
          Google Gemini AI handles vision label extraction, storage advice, and zero-waste recipe creation securely on the backend server.
        </div>
        <div className="bg-green-50/70 border border-green-200/60 rounded-2xl p-3.5 text-xs text-green-800 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <Sparkles size={13} className="text-green-600" /> AI Model Status:
          </div>
          <div>Gemini 2.0 Flash with automated culinary & vision fallback redundancy active.</div>
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Key Status Note</label>
          <input
            type="text"
            value={apiKeyNote}
            onChange={e => { setApiKeyNote(e.target.value); localStorage.setItem(API_KEY_STORAGE, e.target.value); }}
            placeholder="e.g. 'Configured on server (.env)'"
            className="form-input text-xs py-2"
          />
        </div>
      </div>

      {/* App Info */}
      <div className="fresh-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-gray-400" />
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">About FreshGuard</div>
        </div>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between"><span>Version</span><span className="font-semibold text-gray-700">2.0.0 Pro</span></div>
          <div className="flex justify-between"><span>Stack</span><span className="text-gray-700">React 18 + Express + PostgreSQL</span></div>
          <div className="flex justify-between"><span>AI Engine</span><span className="text-gray-700">Google Gemini 2.0 Flash</span></div>
          <div className="flex justify-between"><span>Parent Ecosystem</span><span className="text-gray-700">NutriMind AI</span></div>
        </div>
      </div>
    </div>
  );
}
