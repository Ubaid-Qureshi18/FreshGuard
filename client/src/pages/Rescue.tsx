import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, recipes as recipesApi } from '../services/api';
import type { FoodItem, Recipe } from '../types';
import { enrichFood, sortByUrgency } from '../utils/freshness';
import toast from 'react-hot-toast';
import { Sparkles, Flame, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const RECIPES_KEY = 'fg_last_recipes';
export let lastRecipes: Recipe[] = (() => {
  try { return JSON.parse(sessionStorage.getItem(RECIPES_KEY) || '[]'); } catch { return []; }
})();
function persistLastRecipes(recipes: Recipe[]) {
  lastRecipes = recipes;
  try { sessionStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)); } catch {}
}

type ActiveTab = 'recipes' | 'leftovers';

export default function Rescue() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('recipes');
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);

  // Recipe states
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(lastRecipes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generated, setGenerated] = useState(lastRecipes.length > 0);

  // Leftover mode states
  const [leftoverInput, setLeftoverInput] = useState('');
  const [leftoverRecipes, setLeftoverRecipes] = useState<Recipe[]>([]);

  const loadFoods = useCallback(async () => {
    try {
      const { data } = await foodsApi.list('ACTIVE');
      setAllFoods(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Could not load pantry items');
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
      toast.success('AI Generated Zero-Waste Rescue Recipes! 🍳');
    } catch {
      toast.error('Recipe generation failed');
    } finally { setGenerating(false); }
  };

  const handleLeftoverRescue = () => {
    if (!leftoverInput.trim()) {
      toast.error('Please enter a leftover ingredient (e.g. Leftover rice, Cooked chicken)');
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      const mockLeftoverRecipes: Recipe[] = [
        {
          name: `Egg & Veggie ${leftoverInput.trim()} Fried Rice`,
          emoji: '🍳',
          description: `Transform your ${leftoverInput.trim()} into a savory, golden zero-waste fried meal in 15 minutes.`,
          prepTime: '15 mins',
          cookTime: '10 mins',
          difficulty: 'Easy',
          servings: 2,
          rescueReason: `Rescues ${leftoverInput.trim()} before spoiling`,
          urgentIngredientsUsed: [leftoverInput.trim()],
          pantryIngredientsUsed: ['Eggs', 'Soy Sauce'],
          extraIngredients: ['Green Onions'],
          ingredients: [
            { name: leftoverInput.trim(), amount: '1 bowl', isUrgent: true },
            { name: 'Eggs', amount: '2 pcs', isUrgent: false },
            { name: 'Soy Sauce', amount: '1 tbsp', isUrgent: false },
          ],
          instructions: [
            `Heat 1 tbsp oil in a hot skillet. Sauté chopped garlic and vegetables.`,
            `Add ${leftoverInput.trim()} and toss continuously over high heat for 3 minutes.`,
            `Push to one side, scramble eggs, fold together with soy sauce, and serve hot!`,
          ],
          nutrition: { calories: 420, protein: '18g', carbs: '54g', fat: '12g' },
        },
      ];
      setLeftoverRecipes(mockLeftoverRecipes);
      setGenerating(false);
      toast.success(`Generated Leftover Recipe for ${leftoverInput.trim()}! 🍳`);
    }, 1000);
  };

  const displayRecipes = activeTab === 'leftovers' ? leftoverRecipes : recipes;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Flame size={24} className="text-orange-500" /> AI Recipe & Rescue Center
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          Prevent food waste with personalized zero-waste meals & leftover transformations
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-gray-200/70 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'recipes' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Flame size={14} className="text-orange-500" /> Prevent Food Waste
        </button>
        <button
          onClick={() => setActiveTab('leftovers')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'leftovers' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers size={14} className="text-emerald-600" /> Leftover Mode
        </button>
      </div>

      {/* LEFTOVER MODE INPUT BAR */}
      {activeTab === 'leftovers' && (
        <div className="fresh-card p-5 space-y-3 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-lg shadow-emerald-900/20">
          <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">LEFTOVER TRANSFORMER</div>
          <p className="text-xs text-emerald-100 font-medium">Enter any cooked leftover (e.g. Leftover rice, Cooked chicken, Dal, Bread crusts)</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Leftover rice, Cooked chicken..."
              value={leftoverInput}
              onChange={e => setLeftoverInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white text-gray-900 text-xs font-bold outline-none"
            />
            <button
              onClick={handleLeftoverRescue}
              disabled={generating}
              className="bg-emerald-400 text-emerald-950 font-black text-xs px-4 py-2.5 rounded-2xl hover:bg-emerald-300 transition-colors shrink-0"
            >
              {generating ? 'Transforming…' : 'Transform'}
            </button>
          </div>
        </div>
      )}

      {/* TIME FILTER & RECIPE SELECTION */}
      {activeTab === 'recipes' && !generated && (
        <div className="fresh-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Select Ingredients to Rescue</div>
              <div className="text-[11px] text-gray-400 font-medium">Items needing attention are pre-selected</div>
            </div>
            <button
              onClick={handleGenerateRecipes}
              disabled={generating}
              className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-md shadow-emerald-800/20"
            >
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Formulating…' : 'Generate Rescue Recipes'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {urgentFoods.map(f => (
              <button
                key={f.id}
                onClick={() => toggleSelectIngredient(f.id)}
                className={`text-xs font-bold px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
                  selectedIds.includes(f.id) || selectedIds.length === 0
                    ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                <span>{f.emoji}</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RECIPES CARDS LIST */}
      {displayRecipes.length > 0 && (
        <div className="space-y-4">
          {displayRecipes.map((recipe, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/recipe/${i}`)}
              className="fresh-card p-5 space-y-3 cursor-pointer hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 group-hover:text-emerald-800 transition-colors">
                    {recipe.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full shrink-0">
                  {recipe.prepTime}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs pt-1 text-gray-600 font-medium">
                <span className="flex items-center gap-1 text-emerald-800 font-bold">
                  🌱 Rescues {recipe.urgentIngredientsUsed?.length || 1} urgent items
                </span>
                <span>{recipe.nutrition?.calories || 420} kcal</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
