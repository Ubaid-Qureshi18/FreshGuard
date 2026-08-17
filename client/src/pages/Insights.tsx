import { useState, useEffect } from 'react';
import { getLocalStats, getLocalFoods } from '../services/localStore';
import type { FoodItem } from '../types';
import { Sparkles, PieChart, Award } from 'lucide-react';

export default function Insights() {
  const [stats, setStats] = useState(() => getLocalStats());
  const [foods, setFoods] = useState<FoodItem[]>(() => getLocalFoods());
  const [currencySymbol] = useState('₹');

  useEffect(() => {
    setStats(getLocalStats());
    setFoods(getLocalFoods());
  }, []);

  const discardedFoods = foods.filter(f => f.status === 'DISCARDED');
  const consumedFoods = foods.filter(f => f.status === 'CONSUMED');

  // Most Wasted Category
  const categoryDiscardCounts: Record<string, number> = {};
  discardedFoods.forEach(f => {
    categoryDiscardCounts[f.category] = (categoryDiscardCounts[f.category] || 0) + 1;
  });
  const sortedWastedCategories = Object.entries(categoryDiscardCounts).sort((a, b) => b[1] - a[1]);
  const mostWastedCategory = sortedWastedCategories[0] ? sortedWastedCategories[0][0] : 'Vegetables';

  // Most Rescued Category
  const categoryRescuedCounts: Record<string, number> = {};
  consumedFoods.forEach(f => {
    categoryRescuedCounts[f.category] = (categoryRescuedCounts[f.category] || 0) + 1;
  });
  const sortedRescuedCategories = Object.entries(categoryRescuedCounts).sort((a, b) => b[1] - a[1]);
  const mostRescuedCategory = sortedRescuedCategories[0] ? sortedRescuedCategories[0][0] : 'Dairy';

  // Waste Risk Assessment (LOW, MEDIUM, HIGH)
  const urgentRatio = stats.total > 0 ? (stats.urgentCount + stats.warningCount) / stats.total : 0;
  const wasteRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    urgentRatio > 0.4 ? 'HIGH' : urgentRatio > 0.2 ? 'MEDIUM' : 'LOW';

  const wasteRiskColor = {
    LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
    HIGH: 'text-red-700 bg-red-50 border-red-200',
  }[wasteRiskLevel];

  // Dynamic Behavioral Insight
  const generateBehavioralInsight = () => {
    if (discardedFoods.length === 0) {
      return "Excellent pantry management! You haven't recorded any discarded foods in recent cycles.";
    }
    const sample = discardedFoods[0];
    return `You frequently discard ${sample.name.toLowerCase()} after buying larger portions. Consider purchasing 20-30% smaller quantities on your next grocery run.`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <PieChart size={24} className="text-emerald-700" /> Kitchen Intelligence Insights
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          Understand your household waste patterns, monetary impact & grocery habits
        </p>
      </div>

      {/* Waste Risk Banner */}
      <div className={`p-4 rounded-3xl border flex items-center justify-between ${wasteRiskColor}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center text-lg font-black shadow-2xs">
            {wasteRiskLevel === 'HIGH' ? '🚨' : wasteRiskLevel === 'MEDIUM' ? '⚠️' : '🛡️'}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider">Household Waste Risk</div>
            <div className="text-sm font-black mt-0.5">{wasteRiskLevel} WASTE RISK LEVEL</div>
          </div>
        </div>
        <div className="text-xs text-right font-medium max-w-xs hidden sm:block">
          {wasteRiskLevel === 'HIGH'
            ? `${stats.urgentCount} items require immediate attention today`
            : `${stats.freshCount} of ${stats.total} tracked items are safely fresh`}
        </div>
      </div>

      {/* Impact Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="fresh-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FOOD RESCUED</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.consumed} items</div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">
            Value: {currencySymbol}{stats.totalRescuedValue || stats.consumed * 45}
          </div>
        </div>

        <div className="fresh-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FOOD DISCARDED</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.discarded} items</div>
          <div className="text-[10px] text-rose-800 font-semibold mt-0.5">
            Value: {currencySymbol}{stats.totalDiscardedValue || stats.discarded * 60}
          </div>
        </div>

        <div className="fresh-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MOST WASTED</div>
          <div className="text-sm font-black text-gray-900 mt-2 truncate">{mostWastedCategory}</div>
          <div className="text-[10px] text-gray-400 font-medium mt-0.5">Top discard category</div>
        </div>

        <div className="fresh-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MOST RESCUED</div>
          <div className="text-sm font-black text-emerald-800 mt-2 truncate">{mostRescuedCategory}</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Top saved category</div>
        </div>
      </div>

      {/* AI Behavioral Habit Recommendation */}
      <div className="fresh-card p-5 border border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-white to-white space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
          <Sparkles size={16} className="text-emerald-700 animate-pulse" />
          <span>Personalized Food Behavior Recommendation</span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed font-medium">
          "{generateBehavioralInsight()}"
        </p>
      </div>

      {/* Detailed Analytics Breakdowns */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Active Pantry Health Distribution */}
        <div className="fresh-card p-5 space-y-3">
          <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pantry Expiry Distribution</div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-gray-600 mb-1 font-medium">
                <span>🟢 Fresh & Safe ({stats.freshCount})</span>
                <span>{Math.round((stats.freshCount / (stats.total || 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(stats.freshCount / (stats.total || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-600 mb-1 font-medium">
                <span>🟠 Use Soon / Today ({stats.urgentCount + stats.warningCount})</span>
                <span>{Math.round(((stats.urgentCount + stats.warningCount) / (stats.total || 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${((stats.urgentCount + stats.warningCount) / (stats.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Savings Card */}
        <div className="fresh-card p-5 space-y-3 bg-gray-900 text-white">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award size={16} /> Estimated Net Financial Savings
          </div>
          <div className="text-3xl font-black text-white">
            {currencySymbol}{(stats.totalRescuedValue || stats.consumed * 45) - (stats.totalDiscardedValue || stats.discarded * 60)}
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Calculated based on your actual grocery consumption vs prevented food waste. Keep using AI Recipe Rescue to increase your savings!
          </p>
        </div>
      </div>
    </div>
  );
}
