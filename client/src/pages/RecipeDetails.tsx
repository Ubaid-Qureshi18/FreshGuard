import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lastRecipes } from './Rescue';
import { soundSynth } from '../utils/audioAlarm';
import { CheckCircle, Sparkles, ChefHat, Flame, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const COMMON_SUBS: Record<string, string[]> = {
  milk: ['Oat milk', 'Almond milk', 'Water + 1 tbsp butter', 'Soy milk'],
  cream: ['Milk + melted butter', 'Greek yogurt', 'Coconut cream'],
  butter: ['Olive oil (3/4 amount)', 'Coconut oil', 'Mashed avocado'],
  egg: ['1 tbsp flaxseed + 3 tbsp water', '1/4 cup applesauce', '1/4 cup yogurt'],
  cheese: ['Nutritional yeast', 'Cashew cream', 'Tofu crumbles'],
  sugar: ['Honey', 'Maple syrup', 'Agave nectar'],
  onion: ['Shallots', 'Leeks', 'Onion powder (1 tsp)'],
  garlic: ['Garlic powder (1/4 tsp)', 'Shallots', 'Chives'],
  chicken: ['Tofu', 'Tempeh', 'Canned chickpeas', 'Mushrooms'],
};

export default function RecipeDetails() {
  const { idx } = useParams<{ idx: string }>();
  const navigate = useNavigate();
  const recipe = lastRecipes[parseInt(idx || '0', 10)];
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [selectedSubIng, setSelectedSubIng] = useState<string | null>(null);

  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3">
          👨‍🍳
        </div>
        <div className="font-bold text-gray-900 text-lg mb-1">Recipe not found</div>
        <p className="text-xs text-gray-400 mb-6">Return to Rescue to generate delicious meals from your pantry.</p>
        <button onClick={() => navigate('/rescue')} className="btn-primary text-xs py-2.5 px-5">
          Go to AI Rescue
        </button>
      </div>
    );
  }

  const toggleStep = (i: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
        soundSynth.playReminderChime(0.5);
        if (next.size === recipe.instructions.length) {
          soundSynth.playSuccessChime(0.85);
          toast.success('🎉 Congratulations! You completed this zero-waste meal!');
        }
      }
      return next;
    });
  };

  const getSubstitutes = (ingName: string): string[] => {
    const key = Object.keys(COMMON_SUBS).find(k => ingName.toLowerCase().includes(k));
    return key ? COMMON_SUBS[key] : ['Any seasonal vegetable', 'Pantry broth', 'Olive oil & spices'];
  };

  const difficultyColor = {
    Easy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Medium: 'text-amber-700 bg-amber-50 border-amber-200',
    Hard: 'text-rose-700 bg-rose-50 border-rose-200',
  }[recipe.difficulty] || 'text-gray-600 bg-gray-50';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-4">
      {/* Top Bar */}
      <button onClick={() => navigate(-1)} className="btn-ghost text-xs flex items-center gap-1">
        ← Back to Recipes
      </button>

      {/* Header Banner */}
      <div className="fresh-card p-6 text-center relative overflow-hidden">
        <div className="text-6xl mb-2.5">{recipe.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5">{recipe.name}</h1>
        <p className="text-gray-500 text-xs leading-relaxed max-w-lg mx-auto mb-4">{recipe.description}</p>

        <div className="flex items-center justify-center gap-4 text-xs pt-3 border-t border-gray-100">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prep Time</div>
            <div className="font-bold text-gray-800 mt-0.5">{recipe.prepTime}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cook Time</div>
            <div className="font-bold text-gray-800 mt-0.5">{recipe.cookTime}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Servings</div>
            <div className="font-bold text-gray-800 mt-0.5">{recipe.servings} portions</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Difficulty</div>
            <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full border ${difficultyColor}`}>
              {recipe.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Rescue Reason Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">🔥</span>
        <div>
          <div className="text-[10px] font-black text-orange-700 uppercase tracking-wider">ZERO-WASTE CULINARY LOGIC</div>
          <div className="text-xs text-orange-950 font-medium mt-0.5 leading-relaxed">{recipe.rescueReason}</div>
        </div>
      </div>

      {/* Nutrition Cards */}
      {recipe.nutrition && (
        <div className="fresh-card p-4">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
            Nutritional Estimate (per serving)
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-orange-50/80 p-2 rounded-xl border border-orange-100">
              <div className="font-black text-orange-950 text-sm flex items-center justify-center gap-0.5">
                <Flame size={12} className="text-orange-500" />
                {recipe.nutrition.calories || 280}
              </div>
              <div className="text-[10px] text-orange-700 font-medium">Calories</div>
            </div>
            <div className="bg-blue-50/80 p-2 rounded-xl border border-blue-100">
              <div className="font-black text-blue-950 text-sm">{recipe.nutrition.protein || '14g'}</div>
              <div className="text-[10px] text-blue-700 font-medium">Protein</div>
            </div>
            <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
              <div className="font-black text-amber-950 text-sm">{recipe.nutrition.carbs || '32g'}</div>
              <div className="text-[10px] text-amber-700 font-medium">Carbs</div>
            </div>
            <div className="bg-rose-50/80 p-2 rounded-xl border border-rose-100">
              <div className="font-black text-rose-950 text-sm">{recipe.nutrition.fat || '8g'}</div>
              <div className="text-[10px] text-rose-700 font-medium">Fats</div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredients with AI Pantry Substitutions */}
      <div className="fresh-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Required Ingredients</div>
          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
            Tap item for AI Swaps 🔄
          </span>
        </div>

        <div className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setSelectedSubIng(selectedSubIng === ing.name ? null : ing.name)}
                className={`w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-xl transition-all ${
                  selectedSubIng === ing.name ? 'bg-emerald-50/80 border border-emerald-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ing.isUrgent ? (
                    <span className="text-orange-500 font-bold">🔥</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">✓</span>
                  )}
                  <span className={`font-semibold ${ing.isUrgent ? 'text-gray-900' : 'text-gray-700'}`}>
                    {ing.name}
                  </span>
                  {ing.isUrgent && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-bold">
                      Expiring
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">{ing.amount}</span>
                  <ArrowRightLeft size={12} className="text-gray-400" />
                </div>
              </button>

              {/* AI Substitute Dropdown */}
              {selectedSubIng === ing.name && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-emerald-50/60 rounded-xl p-3 mt-1 border border-emerald-100 text-xs"
                >
                  <div className="font-bold text-emerald-950 text-[11px] mb-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-emerald-700" />
                    AI Smart Swaps for {ing.name}:
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {getSubstitutes(ing.name).map((sub, sIdx) => (
                      <span key={sIdx} className="bg-white text-emerald-900 text-[10px] font-semibold px-2 py-1 rounded-md border border-emerald-200 shadow-2xs">
                        • {sub}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ))}

          {recipe.extraIngredients && recipe.extraIngredients.length > 0 && (
            <div className="pt-3 border-t border-gray-100 text-xs">
              <div className="text-[11px] font-bold text-gray-400 mb-1">Optional Pantry Seasonings:</div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.extraIngredients.map((e, i) => (
                  <span key={i} className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Chef Flavor Booster Tip */}
      <div className="fresh-card p-4 border border-emerald-200/80 bg-gradient-to-r from-emerald-50/40 via-white to-white text-xs">
        <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
          <ChefHat size={15} className="text-emerald-700" />
          <span>AI Chef Flavor Tip</span>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Season with a touch of fresh lemon juice, crushed garlic, or toasted chili flakes in the final 2 minutes of cooking to elevate natural aromas without excess sodium.
        </p>
      </div>

      {/* Step-by-Step Interactive Cooking Instructions */}
      <div className="fresh-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Step-by-Step Cooking Guide
          </div>
          <span className="text-[11px] font-bold text-gray-500">
            {checkedSteps.size} / {recipe.instructions.length} completed
          </span>
        </div>

        <div className="space-y-2.5">
          {recipe.instructions.map((step, i) => {
            const isDone = checkedSteps.has(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleStep(i)}
                className={`w-full flex items-start gap-3.5 text-left p-3 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-gray-50/50'
                }`}
              >
                <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5 transition-all ${
                  isDone ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-gray-300 text-gray-500'
                }`}>
                  {isDone ? <CheckCircle size={14} /> : i + 1}
                </div>
                <p className={`text-xs leading-relaxed pt-0.5 ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {step}
                </p>
              </button>
            );
          })}
        </div>

        {checkedSteps.size === recipe.instructions.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center"
          >
            <div className="text-emerald-800 font-bold text-sm">🎉 Meal Successfully Prepared!</div>
            <div className="text-emerald-700 text-xs mt-0.5">You rescued ingredients from being wasted. Bon appétit! 🌿</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
