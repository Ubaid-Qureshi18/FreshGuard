import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ai as aiApi, foods as foodsApi } from '../services/api';
import type { FoodItem, MealPlanDay } from '../types';
import toast from 'react-hot-toast';
import { CalendarDays, Sparkles, Plus, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';

export default function MealPlan() {
  const navigate = useNavigate();
  const [pantryFoods, setPantryFoods] = useState<FoodItem[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>('Day 1');

  useEffect(() => {
    loadPantry();
  }, []);

  const loadPantry = async () => {
    try {
      const { data } = await foodsApi.list('ACTIVE');
      setPantryFoods(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const { data } = await aiApi.getMealPlan();
      if (data?.plan && Array.isArray(data.plan)) {
        setMealPlan(data.plan as MealPlanDay[]);
        toast.success('AI Weekly Meal Plan generated! 🥗');
      }
    } catch {
      toast.error('Could not generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  // Identify missing ingredients across all planned meals
  const getMissingIngredients = () => {
    if (mealPlan.length === 0) return [];
    const activeNames = pantryFoods.map(f => f.name.toLowerCase());
    const missingSet = new Set<string>();

    mealPlan.forEach(d => {
      const allMeals = [d.meals.breakfast, d.meals.lunch, d.meals.dinner];
      allMeals.forEach(m => {
        if (m && m.title) {
          // Extract ingredient keywords from meal description/title
          const titleWords = m.title.split(' ').filter(w => w.length > 3);
          titleWords.forEach(w => {
            const lower = w.toLowerCase().replace(/[^a-z]/g, '');
            if (lower && !activeNames.some(p => p.includes(lower) || lower.includes(p))) {
              missingSet.add(w.replace(/[^a-zA-Z]/g, ''));
            }
          });
        }
      });
    });

    return Array.from(missingSet).slice(0, 6);
  };

  const handleAddMissingToShoppingList = () => {
    const missing = getMissingIngredients();
    const existingList = (() => {
      try { return JSON.parse(localStorage.getItem('fg_shopping_list') || '[]'); } catch { return []; }
    })();

    const newItems = missing.map(name => ({
      id: `shop_meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      category: 'Groceries',
      quantity: '1 pack',
      checked: false,
      autoSuggested: true,
    }));

    localStorage.setItem('fg_shopping_list', JSON.stringify([...newItems, ...existingList]));
    toast.success(`Added ${newItems.length} missing meal plan ingredients to Shopping List! 🛒`);
    navigate('/shopping');
  };

  const missingList = getMissingIngredients();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays size={24} className="text-emerald-700" /> AI Meal Planner
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Plan meals that prioritize expiring pantry food & generate smart shopping lists
          </p>
        </div>
        <button
          onClick={handleGeneratePlan}
          disabled={loading}
          className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 shadow-lg shadow-emerald-800/20"
        >
          <Sparkles size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Planning…' : 'Generate Plan'}
        </button>
      </div>

      {/* MEAL PLAN -> SHOPPING INTEGRATION BANNER */}
      {mealPlan.length > 0 && missingList.length > 0 && (
        <div className="fresh-card p-4 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-emerald-900/20">
          <div>
            <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart size={14} /> Missing Ingredients Detected
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {missingList.join(', ')}
            </div>
          </div>
          <button
            onClick={handleAddMissingToShoppingList}
            className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black px-4 py-2.5 rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> ADD MISSING TO SHOPPING LIST
          </button>
        </div>
      )}

      {/* Empty State */}
      {mealPlan.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto text-3xl">
            🥗
          </div>
          <h2 className="text-base font-bold text-gray-900">No active meal plan</h2>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Tap <strong>Generate Plan</strong> to automatically formulate a 3-day meal plan using your pantry inventory.
          </p>
          <button onClick={handleGeneratePlan} className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5">
            <Sparkles size={14} /> Generate 3-Day Meal Plan
          </button>
        </div>
      )}

      {/* Meal Plan Days Accordion */}
      {mealPlan.length > 0 && (
        <div className="space-y-3">
          {mealPlan.map(dayPlan => {
            const isExpanded = expandedDay === dayPlan.day;
            return (
              <div key={dayPlan.day} className="fresh-card overflow-hidden transition-all">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : dayPlan.day)}
                  className="w-full p-4 flex items-center justify-between text-left bg-white hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                      📅
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{dayPlan.day}</div>
                      <div className="text-xs text-gray-400 font-medium">{dayPlan.theme}</div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-gray-100 space-y-3 bg-gray-50/30">
                    {/* Breakfast */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">🌅 BREAKFAST</span>
                        <span className="text-[10px] text-gray-400 font-medium">Pantry priority</span>
                      </div>
                      <div className="font-bold text-gray-900 text-xs">{dayPlan.meals.breakfast?.title}</div>
                      <p className="text-xs text-gray-500">{dayPlan.meals.breakfast?.description}</p>
                    </div>

                    {/* Lunch */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">☀️ LUNCH</span>
                        <span className="text-[10px] text-gray-400 font-medium">Zero-waste bowl</span>
                      </div>
                      <div className="font-bold text-gray-900 text-xs">{dayPlan.meals.lunch?.title}</div>
                      <p className="text-xs text-gray-500">{dayPlan.meals.lunch?.description}</p>
                    </div>

                    {/* Dinner */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider">🌙 DINNER</span>
                        <span className="text-[10px] text-gray-400 font-medium">Hearty main</span>
                      </div>
                      <div className="font-bold text-gray-900 text-xs">{dayPlan.meals.dinner?.title}</div>
                      <p className="text-xs text-gray-500">{dayPlan.meals.dinner?.description}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
