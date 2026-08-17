import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, recipes as recipesApi, ai as aiApi } from '../services/api';
import type { FoodItem, Recipe, MealPlanDay } from '../types';
import { enrichFood, sortByUrgency } from '../utils/freshness';
import toast from 'react-hot-toast';
import { Clock, Sparkles, Utensils, RefreshCw, ChevronRight, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

// Store generated recipes in sessionStorage so RecipeDetails survives page reload
const RECIPES_KEY = 'fg_last_recipes';
export let lastRecipes: Recipe[] = (() => {
  try { return JSON.parse(sessionStorage.getItem(RECIPES_KEY) || '[]'); } catch { return []; }
})();
function persistLastRecipes(recipes: Recipe[]) {
  lastRecipes = recipes;
  try { sessionStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)); } catch {}
}

type ActiveTab = 'recipes' | 'mealplan';
type RecipeFilter = 'all' | 'quick' | 'highprotein' | 'zerowaste';

export default function Rescue() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('recipes');
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all');
  
  // Recipe states
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(lastRecipes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generated, setGenerated] = useState(lastRecipes.length > 0);

  // Meal Plan states
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [loadingMealPlan, setLoadingMealPlan] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>('Day 1');

  const loadFoods = useCallback(async () => {
    try {
      const { data } = await foodsApi.list('ACTIVE');
      setAllFoods(Array.isArray(data) ? data : (Array.isArray(data?.foods) ? data.foods : []));
    } catch {
      toast.error('Could not load pantry items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFoods(); }, [loadFoods]);

  const safeFoods = Array.isArray(allFoods) ? allFoods : [];
  const enriched = sortByUrgency(safeFoods.map(enrichFood));
  const urgentFoods = enriched.filter(f => f.daysRemaining <= 3);

  const toggleSelectIngredient = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerateRecipes = async () => {
    setGenerating(true);
    try {
      const idsToUse = selectedIds.length > 0 ? selectedIds : undefined;
      const { data } = await recipesApi.generate(idsToUse);
      const result = (Array.isArray(data?.recipes) ? data.recipes : []) as Recipe[];
      persistLastRecipes(result);
      setRecipes(result);
      setGenerated(true);
      toast.success('AI Generated 3 Zero-Waste Recipes! 🍳');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Recipe generation failed');
    } finally { setGenerating(false); }
  };

  const handleGenerateMealPlan = async () => {
    setLoadingMealPlan(true);
    try {
      const { data } = await aiApi.getMealPlan();
      if (data?.plan && Array.isArray(data.plan)) {
        setMealPlan(data.plan as MealPlanDay[]);
        toast.success('AI 3-Day Meal Plan Generated! 🥗');
      }
    } catch {
      toast.error('Could not generate meal plan');
    } finally {
      setLoadingMealPlan(false);
    }
  };

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const filteredRecipes = safeRecipes.filter(r => {
    if (recipeFilter === 'quick') {
      const mins = parseInt(r.prepTime || '30', 10);
      return mins <= 20 || r.prepTime.includes('15') || r.prepTime.includes('10');
    }
    if (recipeFilter === 'highprotein') {
      return (r.nutrition?.protein || '0').includes('g') && parseInt(r.nutrition?.protein || '0', 10) >= 15;
    }
    if (recipeFilter === 'zerowaste') {
      return r.urgentIngredientsUsed && r.urgentIngredientsUsed.length >= 2;
    }
    return true;
  });

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header & Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-orange-500/20">
                🍳
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Food Rescue & Meal Studio</h1>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Transform expiring ingredients into chef-quality zero-waste meals
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
      <div className="flex bg-gray-200/70 p-1 rounded-2xl mt-4">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'recipes' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Flame size={14} className="text-orange-500" /> Prevent Food Waste
        </button>
        <button
          onClick={() => {
            setActiveTab('mealplan');
            if (mealPlan.length === 0) handleGenerateMealPlan();
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'mealplan' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Utensils size={14} className="text-emerald-600" /> What Can I Make?
        </button>
      </div>
      </div>

      {activeTab === 'recipes' ? (
        // ── TAB 1: RESCUE RECIPES ───────────────────────────
        generated && recipes.length > 0 ? (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">AI Rescued Recipes</h2>
                <p className="text-xs text-gray-400 font-medium">{recipes.length} custom meals formulated</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateRecipes}
                  disabled={generating}
                  className="btn-ghost text-xs text-emerald-800 font-bold flex items-center gap-1"
                >
                  <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                  Re-generate
                </button>
                <button
                  onClick={() => { setGenerated(false); setRecipes([]); }}
                  className="btn-ghost text-xs text-gray-500 font-semibold"
                >
                  Edit Selection
                </button>
              </div>
            </div>

            {/* Recipe Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'All Recipes' },
                { key: 'zerowaste', label: '🔥 Multi-Ingredient Rescue' },
                { key: 'quick', label: '⚡ Quick (< 20m)' },
                { key: 'highprotein', label: '💪 High Protein' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setRecipeFilter(f.key as RecipeFilter)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    recipeFilter === f.key
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Recipes Cards */}
            <div className="space-y-3.5">
              {filteredRecipes.map((recipe, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => navigate(`/recipe/${i}`)}
                  className="fresh-card p-5 cursor-pointer hover:border-orange-200 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl w-12 text-center shrink-0 group-hover:scale-110 transition-transform">
                      {recipe.emoji || '🥘'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-700 transition-colors">
                          {recipe.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {recipe.difficulty}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                        {recipe.description}
                      </p>

                      {/* Ingredients Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {recipe.urgentIngredientsUsed?.map((ing, idx) => (
                          <span key={idx} className="bg-orange-50 text-orange-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-orange-200 flex items-center gap-1">
                            🔥 Rescues {ing}
                          </span>
                        ))}
                        {recipe.pantryIngredientsUsed?.slice(0, 3).map((ing, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            + {ing}
                          </span>
                        ))}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock size={12} /> {recipe.prepTime} prep</span>
                          <span>•</span>
                          <span>{recipe.servings} servings</span>
                        </div>
                        <span className="text-emerald-800 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Cook Recipe <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          // ── Ingredient Selector ────────────────────────────
          <div className="space-y-5">
            <div className="fresh-card p-5 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white border-orange-200/70">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-orange-500/20">
                  🔥
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Select Ingredients to Rescue</h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    AI prioritizes ingredients nearest to expiration. Check items below or let AI auto-select.
                  </p>
                </div>
              </div>
            </div>

            {/* Food Selector Grid */}
            {allFoods.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                <div className="text-4xl mb-2">🧺</div>
                <div className="font-bold text-gray-700 text-sm">No items in pantry</div>
                <p className="text-xs text-gray-400 mt-1 mb-4">Add or scan groceries to generate rescue recipes</p>
                <button onClick={() => navigate('/add')} className="btn-primary text-xs py-2 px-4">
                  Add Groceries
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <span>Pantry Items ({urgentFoods.length} Urgent)</span>
                  <span className="text-emerald-800 font-bold">{selectedIds.length} Selected</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {enriched.map(food => {
                    const isSelected = selectedIds.includes(food.id);
                    const isUrgent = food.daysRemaining <= 3;
                    return (
                      <div
                        key={food.id}
                        onClick={() => toggleSelectIngredient(food.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-orange-50/80 border-orange-300 shadow-xs'
                            : isUrgent
                              ? 'bg-white border-orange-200 hover:bg-orange-50/30'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{food.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-gray-900 truncate">{food.name}</div>
                            <div className="text-[10px] text-gray-400">
                              {food.daysRemaining <= 0 ? 'Expired' : `${food.daysRemaining} days left`}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs transition-colors shrink-0 ${
                          isSelected ? 'bg-orange-500 border-orange-500 text-white font-bold' : 'border-gray-300 text-transparent'
                        }`}>
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateRecipes}
                  disabled={generating || enriched.length === 0}
                  className="btn-rescue w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-3"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI Chef is Formulating Recipes…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate AI Rescue Recipes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        // ── TAB 2: AI 3-DAY MEAL PLAN ────────────────────────
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Personalized 3-Day Meal Plan</h2>
              <p className="text-xs text-gray-400 font-medium">Smart meal schedule optimizing your exact pantry stock</p>
            </div>
            <button
              onClick={handleGenerateMealPlan}
              disabled={loadingMealPlan}
              className="btn-ghost text-xs text-emerald-800 font-bold flex items-center gap-1"
            >
              <RefreshCw size={13} className={loadingMealPlan ? 'animate-spin' : ''} />
              Re-Plan
            </button>
          </div>

          {loadingMealPlan ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : mealPlan.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
              <div className="text-4xl mb-2">🥗</div>
              <div className="font-bold text-gray-700 text-sm">No meal plan generated yet</div>
              <p className="text-xs text-gray-400 mt-1 mb-4">Click below to build a customized zero-waste 3-day meal plan</p>
              <button onClick={handleGenerateMealPlan} className="btn-primary text-xs py-2.5 px-5">
                Generate 3-Day Plan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mealPlan.map((dayItem, dIdx) => {
                const isOpen = expandedDay === dayItem.day || expandedDay === null;
                return (
                  <motion.div
                    key={dIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dIdx * 0.1 }}
                    className="fresh-card p-5"
                  >
                    <button
                      onClick={() => setExpandedDay(isOpen ? null : dayItem.day)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          D{dIdx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{dayItem.day} — {dayItem.theme}</div>
                          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            Breakfast, Lunch & Dinner scheduled
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-xs">
                        {[
                          { mealName: 'Breakfast 🍳', m: dayItem.meals.breakfast, bg: 'bg-amber-50/50', border: 'border-amber-100' },
                          { mealName: 'Lunch 🥗', m: dayItem.meals.lunch, bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                          { mealName: 'Dinner 🥘', m: dayItem.meals.dinner, bg: 'bg-orange-50/50', border: 'border-orange-100' },
                        ].map((mItem, mIdx) => (
                          <div key={mIdx} className={`${mItem.bg} ${mItem.border} border rounded-2xl p-3.5`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900 text-xs">{mItem.mealName}: {mItem.m.title}</span>
                            </div>
                            <p className="text-gray-600 text-[11px] leading-relaxed mb-2">{mItem.m.description}</p>
                            {mItem.m.usesPantry && mItem.m.usesPantry.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {mItem.m.usesPantry.map((p, pIdx) => (
                                  <span key={pIdx} className="bg-white text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                    ✓ Uses {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
