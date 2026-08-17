import { useState } from 'react';
import { Sparkles, Scale } from 'lucide-react';

interface ProductItem {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
}

const PRESET_PRODUCTS: ProductItem[] = [
  { name: 'Organic Whole Milk 1L', brand: 'Amul', calories: 150, protein: 8, carbs: 12, fat: 8, sugar: 12, fiber: 0 },
  { name: 'Unsweetened Almond Milk 1L', brand: 'Silk', calories: 30, protein: 1, carbs: 1, fat: 2.5, sugar: 0, fiber: 1 },
  { name: 'Greek Yogurt Vanilla 500g', brand: 'Epigamia', calories: 120, protein: 10, carbs: 14, fat: 3, sugar: 11, fiber: 0 },
  { name: 'Whole Wheat Bread 400g', brand: 'Britannia', calories: 240, protein: 9, carbs: 45, fat: 2, sugar: 4, fiber: 6 },
  { name: 'Multi-Grain Oats 500g', brand: 'Quaker', calories: 370, protein: 13, carbs: 60, fat: 7, sugar: 1, fiber: 10 },
];

export default function CompareProducts() {
  const [prodA, setProdA] = useState<ProductItem>(PRESET_PRODUCTS[0]);
  const [prodB, setProdB] = useState<ProductItem>(PRESET_PRODUCTS[1]);

  const getWinnerRecommendation = () => {
    if (prodA.protein > prodB.protein && prodA.sugar <= prodB.sugar) {
      return `${prodA.name} is a closer match for higher protein (${prodA.protein}g vs ${prodB.protein}g) and lower sugar intake.`;
    }
    if (prodB.protein > prodA.protein && prodB.sugar <= prodA.sugar) {
      return `${prodB.name} is a closer match for higher protein (${prodB.protein}g vs ${prodA.protein}g) and lower sugar intake.`;
    }
    if (prodB.calories < prodA.calories) {
      return `${prodB.name} provides significantly lower calories (${prodB.calories} kcal vs ${prodA.calories} kcal per serving).`;
    }
    return `${prodA.name} provides ${prodA.fiber}g fiber vs ${prodB.fiber}g in ${prodB.name}.`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Scale size={24} className="text-emerald-700" /> Packaged Product Comparison
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          Compare nutritional profiles, macronutrients, and sugar content side-by-side
        </p>
      </div>

      {/* Product Selectors */}
      <div className="grid grid-cols-2 gap-4">
        {/* Product A */}
        <div className="fresh-card p-4 space-y-3">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Product A</div>
          <select
            value={prodA.name}
            onChange={e => {
              const found = PRESET_PRODUCTS.find(p => p.name === e.target.value);
              if (found) setProdA(found);
            }}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 outline-none"
          >
            {PRESET_PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <div className="text-[10px] text-gray-400 font-medium">Brand: {prodA.brand}</div>
        </div>

        {/* Product B */}
        <div className="fresh-card p-4 space-y-3">
          <div className="text-xs font-bold text-violet-800 uppercase tracking-wider">Product B</div>
          <select
            value={prodB.name}
            onChange={e => {
              const found = PRESET_PRODUCTS.find(p => p.name === e.target.value);
              if (found) setProdB(found);
            }}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 outline-none"
          >
            {PRESET_PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <div className="text-[10px] text-gray-400 font-medium">Brand: {prodB.brand}</div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="fresh-card p-5 space-y-4">
        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2.5">
          Nutrition & Macro Breakdown (Per Serving)
        </div>

        <div className="space-y-3 text-xs">
          {/* Calories */}
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
            <span className="font-bold text-emerald-900">{prodA.calories} kcal</span>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Calories</span>
            <span className="font-bold text-violet-900">{prodB.calories} kcal</span>
          </div>

          {/* Protein */}
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
            <span className={`font-black ${prodA.protein >= prodB.protein ? 'text-emerald-700 font-extrabold' : 'text-gray-600'}`}>
              {prodA.protein}g {prodA.protein >= prodB.protein && '✓'}
            </span>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Protein</span>
            <span className={`font-black ${prodB.protein >= prodA.protein ? 'text-violet-700 font-extrabold' : 'text-gray-600'}`}>
              {prodB.protein}g {prodB.protein >= prodA.protein && '✓'}
            </span>
          </div>

          {/* Sugar */}
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
            <span className={`font-bold ${prodA.sugar <= prodB.sugar ? 'text-emerald-700' : 'text-gray-600'}`}>
              {prodA.sugar}g
            </span>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Added Sugar</span>
            <span className={`font-bold ${prodB.sugar <= prodA.sugar ? 'text-violet-700' : 'text-gray-600'}`}>
              {prodB.sugar}g
            </span>
          </div>

          {/* Fiber */}
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
            <span className={`font-bold ${prodA.fiber >= prodB.fiber ? 'text-emerald-700' : 'text-gray-600'}`}>
              {prodA.fiber}g
            </span>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Dietary Fiber</span>
            <span className={`font-bold ${prodB.fiber >= prodA.fiber ? 'text-violet-700' : 'text-gray-600'}`}>
              {prodB.fiber}g
            </span>
          </div>
        </div>
      </div>

      {/* AI Neutral Recommendation Box */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-900 to-emerald-800 text-white space-y-2 shadow-lg shadow-emerald-900/20">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
          <Sparkles size={16} />
          <span>FreshGuard Nutrition Analysis</span>
        </div>
        <p className="text-xs text-white leading-relaxed font-medium">
          "{getWinnerRecommendation()}"
        </p>
      </div>
    </div>
  );
}
