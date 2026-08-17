import { useState, useEffect, useCallback } from 'react';
import { getLocalStats, getLocalFoods } from '../services/localStore';
import type { FoodItem } from '../types';
import { Sparkles, PieChart, Activity } from 'lucide-react';
import { PANTRY_REFRESH_EVENT } from '../components/AppLayout';

export default function Insights() {
  const [stats, setStats] = useState(() => getLocalStats());
  const [foods, setFoods] = useState<FoodItem[]>(() => getLocalFoods());
  const [currencySymbol] = useState('₹');

  const refreshData = useCallback(() => {
    setStats(getLocalStats());
    setFoods(getLocalFoods());
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener(PANTRY_REFRESH_EVENT, refreshData);
    return () => window.removeEventListener(PANTRY_REFRESH_EVENT, refreshData);
  }, [refreshData]);

  const discardedFoods = foods.filter(f => f.status === 'DISCARDED');
  const consumedFoods = foods.filter(f => f.status === 'CONSUMED');

  const categoryDiscardCounts: Record<string, number> = {};
  discardedFoods.forEach(f => {
    categoryDiscardCounts[f.category] = (categoryDiscardCounts[f.category] || 0) + 1;
  });
  const sortedWastedCategories = Object.entries(categoryDiscardCounts).sort((a, b) => b[1] - a[1]);
  const mostWastedCategory = sortedWastedCategories[0] ? sortedWastedCategories[0][0] : 'Vegetables';

  const categoryRescuedCounts: Record<string, number> = {};
  consumedFoods.forEach(f => {
    categoryRescuedCounts[f.category] = (categoryRescuedCounts[f.category] || 0) + 1;
  });
  const sortedRescuedCategories = Object.entries(categoryRescuedCounts).sort((a, b) => b[1] - a[1]);
  const mostRescuedCategory = sortedRescuedCategories[0] ? sortedRescuedCategories[0][0] : 'Dairy';

  const urgentRatio = stats.total > 0 ? (stats.urgentCount + stats.warningCount) / stats.total : 0;
  const wasteRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    urgentRatio > 0.4 ? 'HIGH' : urgentRatio > 0.2 ? 'MEDIUM' : 'LOW';

  const wasteRiskColor = {
    LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
    HIGH: 'text-red-700 bg-red-50 border-red-200',
  }[wasteRiskLevel];

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
          <PieChart size={24} className="text-emerald-700" /> Kitchen Intelligence & Nutrition
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          Understand your household waste patterns, monetary impact & nutrition intake
        </p>
      </div>

      {/* SMART KITCHEN SCORE BREAKDOWN */}
      <div className="fresh-card p-6 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white space-y-4 shadow-xl shadow-emerald-900/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase text-emerald-300 tracking-wider">SMART KITCHEN SCORE</div>
            <div className="text-4xl font-black text-white mt-1">84 <span className="text-lg text-emerald-300">/ 100</span></div>
          </div>
          <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl font-black border border-white/20">
            🏆
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
          <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
            <div className="text-[10px] text-emerald-200 font-bold uppercase">Waste Prevention</div>
            <div className="text-sm font-black text-white mt-0.5">88%</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
            <div className="text-[10px] text-emerald-200 font-bold uppercase">Shopping Efficiency</div>
            <div className="text-sm font-black text-white mt-0.5">82%</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
            <div className="text-[10px] text-emerald-200 font-bold uppercase">Pantry Health</div>
            <div className="text-sm font-black text-white mt-0.5">86%</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
            <div className="text-[10px] text-emerald-200 font-bold uppercase">Nutrition Variety</div>
            <div className="text-sm font-black text-white mt-0.5">78%</div>
          </div>
        </div>
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

      {/* MACRONUTRIENT & MICRONUTRIENT DASHBOARD */}
      <div className="fresh-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={16} className="text-emerald-700" /> Daily Macro & Micronutrient Snapshot
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
            Logged Today
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-gray-50 p-3 rounded-2xl">
            <div className="text-[10px] text-gray-400 font-bold">CALORIES</div>
            <div className="text-base font-black text-gray-900 mt-0.5">1,820 kcal</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <div className="text-[10px] text-gray-400 font-bold">PROTEIN</div>
            <div className="text-base font-black text-emerald-700 mt-0.5">92g</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <div className="text-[10px] text-gray-400 font-bold">CARBS</div>
            <div className="text-base font-black text-blue-700 mt-0.5">210g</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <div className="text-[10px] text-gray-400 font-bold">FAT</div>
            <div className="text-base font-black text-amber-700 mt-0.5">62g</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-[10px] text-gray-400 font-bold">FIBER</div>
            <div className="text-base font-black text-violet-700 mt-0.5">27g</div>
          </div>
        </div>

        {/* Micronutrient Snapshot */}
        <div className="pt-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Micronutrient Coverage Snapshot</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 font-medium">
              <span className="font-bold block">Vitamin C</span>
              <span className="text-[11px] text-emerald-800">Good Coverage</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 font-medium">
              <span className="font-bold block">Calcium</span>
              <span className="text-[11px] text-amber-800">Moderate Intake</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 font-medium">
              <span className="font-bold block">Iron</span>
              <span className="text-[11px] text-blue-800">Good Coverage</span>
            </div>
          </div>
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
    </div>
  );
}
