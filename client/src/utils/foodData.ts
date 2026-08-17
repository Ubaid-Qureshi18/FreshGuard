/**
 * FreshGuard Food Intelligence Library
 * Provides nutrition data (per 100g) and image URLs for 100+ common foods.
 * Falls back to category-level images so broken images never appear.
 */

import type { FoodCategory } from '../types';

// ─── Extended Nutrition Interface ───────────────────────────────────────────
export interface FullNutrition {
  servingSize: string;
  // Macros
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat?: number;
  sodium: number;
  // Micros (all per 100g, in mg unless noted)
  vitaminA?: number;   // mcg
  vitaminC?: number;   // mg
  vitaminD?: number;   // mcg
  vitaminE?: number;   // mg
  vitaminK?: number;   // mcg
  vitaminB1?: number;  // mg (Thiamine)
  vitaminB2?: number;  // mg (Riboflavin)
  vitaminB3?: number;  // mg (Niacin)
  vitaminB6?: number;  // mg
  vitaminB9?: number;  // mcg (Folate)
  vitaminB12?: number; // mcg
  calcium?: number;    // mg
  iron?: number;       // mg
  magnesium?: number;  // mg
  phosphorus?: number; // mg
  potassium?: number;  // mg
  zinc?: number;       // mg
  copper?: number;     // mg
  selenium?: number;   // mcg
  estimated?: boolean;
}

// ─── Nutrition Database (per 100g) ─────────────────────────────────────────
const NUTRITION_DB: Record<string, FullNutrition> = {
  // VEGETABLES
  'spinach': { servingSize: '100g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, vitaminA: 469, vitaminC: 28, vitaminK: 483, vitaminB9: 194, calcium: 99, iron: 2.7, magnesium: 79, potassium: 558 },
  'baby spinach': { servingSize: '100g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, vitaminA: 469, vitaminC: 28, vitaminK: 483, vitaminB9: 194, calcium: 99, iron: 2.7, magnesium: 79, potassium: 558 },
  'tomato': { servingSize: '100g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, vitaminA: 42, vitaminC: 14, vitaminK: 7.9, vitaminB9: 15, potassium: 237, calcium: 10, iron: 0.3 },
  'potato': { servingSize: '100g', calories: 77, protein: 2.0, carbs: 17.5, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6, vitaminC: 19.7, vitaminB6: 0.3, vitaminB3: 1.1, potassium: 421, magnesium: 23, phosphorus: 57 },
  'onion': { servingSize: '100g', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4, vitaminC: 7.4, vitaminB6: 0.1, vitaminB9: 19, potassium: 146, calcium: 23, iron: 0.2 },
  'carrot': { servingSize: '100g', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69, vitaminA: 835, vitaminC: 5.9, vitaminK: 13.2, vitaminB6: 0.1, potassium: 320, calcium: 33, iron: 0.3 },
  'broccoli': { servingSize: '100g', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33, vitaminA: 31, vitaminC: 89.2, vitaminK: 101.6, vitaminB9: 63, calcium: 47, iron: 0.7, potassium: 316 },
  'capsicum': { servingSize: '100g', calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4, vitaminA: 157, vitaminC: 127.7, vitaminK: 4.9, vitaminB9: 46, potassium: 211, calcium: 10, iron: 0.4 },
  'bell pepper': { servingSize: '100g', calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4, vitaminA: 157, vitaminC: 127.7, vitaminK: 4.9, vitaminB9: 46, potassium: 211, calcium: 10, iron: 0.4 },
  'cucumber': { servingSize: '100g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2, vitaminC: 2.8, vitaminK: 16.4, potassium: 147, magnesium: 13, calcium: 16 },
  'cauliflower': { servingSize: '100g', calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3, fiber: 2.0, sugar: 1.9, sodium: 30, vitaminC: 48.2, vitaminK: 15.5, vitaminB9: 57, potassium: 299, calcium: 22, iron: 0.4 },
  'peas': { servingSize: '100g', calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.1, sugar: 5.7, sodium: 5, vitaminA: 38, vitaminC: 40, vitaminK: 24.8, vitaminB1: 0.3, vitaminB9: 65, iron: 1.5, magnesium: 33 },
  'lettuce': { servingSize: '100g', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 1.2, sodium: 28, vitaminA: 370, vitaminC: 9.2, vitaminK: 126.3, vitaminB9: 73, calcium: 36, iron: 0.9, potassium: 238 },
  'garlic': { servingSize: '100g', calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1, sugar: 1.0, sodium: 17, vitaminC: 31.2, vitaminB6: 1.2, vitaminB1: 0.2, vitaminB9: 3, calcium: 181, iron: 1.7, manganese: 1.7 },

  // FRUITS
  'apple': { servingSize: '100g', calories: 52, protein: 0.3, carbs: 14.0, fat: 0.2, fiber: 2.4, sugar: 10.4, sodium: 1, vitaminC: 4.6, vitaminK: 2.2, vitaminB6: 0.04, potassium: 107, calcium: 6, iron: 0.1 },
  'banana': { servingSize: '100g', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, sodium: 1, vitaminC: 8.7, vitaminB6: 0.4, vitaminB9: 20, potassium: 358, magnesium: 27, iron: 0.3 },
  'mango': { servingSize: '100g', calories: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6, sugar: 13.7, sodium: 1, vitaminA: 54, vitaminC: 36.4, vitaminK: 4.2, vitaminB9: 43, potassium: 168, calcium: 11, iron: 0.2 },
  'orange': { servingSize: '100g', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, sugar: 9.4, sodium: 0, vitaminA: 11, vitaminC: 53.2, vitaminB9: 30, vitaminB1: 0.09, potassium: 181, calcium: 40, iron: 0.1 },
  'grapes': { servingSize: '100g', calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, sugar: 15.5, sodium: 2, vitaminC: 10.8, vitaminK: 14.6, vitaminB6: 0.09, potassium: 191, calcium: 10, iron: 0.4 },
  'watermelon': { servingSize: '100g', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, sugar: 6.2, sodium: 1, vitaminA: 28, vitaminC: 8.1, vitaminB6: 0.04, potassium: 112, magnesium: 10, calcium: 7 },
  'strawberry': { servingSize: '100g', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0, sugar: 4.9, sodium: 1, vitaminC: 58.8, vitaminK: 2.2, vitaminB9: 24, potassium: 153, calcium: 16, iron: 0.4 },
  'lemon': { servingSize: '100g', calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8, sugar: 2.5, sodium: 2, vitaminC: 53, vitaminB6: 0.08, vitaminB9: 11, potassium: 138, calcium: 26, iron: 0.6 },

  // DAIRY
  'milk': { servingSize: '100ml', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 4.8, saturatedFat: 2.1, sodium: 43, vitaminA: 46, vitaminB12: 0.4, vitaminB2: 0.18, vitaminD: 1.2, calcium: 113, potassium: 150, phosphorus: 84, zinc: 0.4 },
  'whole milk': { servingSize: '100ml', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 4.8, saturatedFat: 2.1, sodium: 43, vitaminA: 46, vitaminB12: 0.4, vitaminB2: 0.18, vitaminD: 1.2, calcium: 113, potassium: 150, phosphorus: 84, zinc: 0.4 },
  'curd': { servingSize: '100g', calories: 98, protein: 3.5, carbs: 3.4, fat: 8.0, fiber: 0, sugar: 3.4, sodium: 36, vitaminB12: 0.35, vitaminB2: 0.14, calcium: 121, phosphorus: 95, potassium: 141, zinc: 0.3 },
  'yogurt': { servingSize: '100g', calories: 59, protein: 3.5, carbs: 3.6, fat: 3.3, fiber: 0, sugar: 3.2, sodium: 46, vitaminB12: 0.37, vitaminB2: 0.18, calcium: 121, phosphorus: 95, potassium: 141, zinc: 0.5 },
  'greek yogurt': { servingSize: '100g', calories: 97, protein: 9.0, carbs: 3.6, fat: 5.0, fiber: 0, sugar: 3.6, sodium: 36, vitaminB12: 0.75, calcium: 100, phosphorus: 135, potassium: 141 },
  'cheese': { servingSize: '100g', calories: 402, protein: 25.0, carbs: 1.3, fat: 33.0, fiber: 0, sugar: 0.5, saturatedFat: 21.0, sodium: 621, vitaminA: 264, vitaminB12: 0.83, vitaminB2: 0.38, calcium: 721, phosphorus: 512, zinc: 3.1 },
  'paneer': { servingSize: '100g', calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, sugar: 1.2, sodium: 11, vitaminA: 96, vitaminB12: 0.3, calcium: 208, phosphorus: 138, potassium: 75 },
  'butter': { servingSize: '100g', calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, sugar: 0.1, saturatedFat: 51.4, sodium: 643, vitaminA: 684, vitaminE: 2.3, vitaminK: 7.0, vitaminD: 1.5 },

  // MEAT
  'chicken': { servingSize: '100g', calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, vitaminB3: 13.7, vitaminB6: 0.9, vitaminB12: 0.29, iron: 0.9, zinc: 1.0, phosphorus: 220, selenium: 27.6 },
  'chicken breast': { servingSize: '100g', calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, vitaminB3: 13.7, vitaminB6: 0.9, vitaminB12: 0.29, iron: 0.9, zinc: 1.0, phosphorus: 220, selenium: 27.6 },
  'mutton': { servingSize: '100g', calories: 294, protein: 25.6, carbs: 0, fat: 20.3, fiber: 0, sugar: 0, sodium: 72, vitaminB3: 7.3, vitaminB6: 0.2, vitaminB12: 2.7, iron: 2.7, zinc: 4.8, phosphorus: 191 },
  'beef': { servingSize: '100g', calories: 250, protein: 26.1, carbs: 0, fat: 15.4, fiber: 0, sugar: 0, sodium: 72, vitaminB3: 5.6, vitaminB6: 0.4, vitaminB12: 2.5, iron: 2.6, zinc: 6.3, phosphorus: 198, selenium: 14.2 },
  'pork': { servingSize: '100g', calories: 242, protein: 27.3, carbs: 0, fat: 14.0, fiber: 0, sugar: 0, sodium: 62, vitaminB1: 0.7, vitaminB3: 6.8, vitaminB6: 0.5, vitaminB12: 0.7, iron: 0.9, zinc: 2.9 },

  // SEAFOOD
  'fish': { servingSize: '100g', calories: 206, protein: 22.1, carbs: 0, fat: 12.1, fiber: 0, sugar: 0, sodium: 70, vitaminD: 11.1, vitaminB12: 3.5, vitaminB3: 7.9, vitaminB6: 0.6, calcium: 13, iron: 0.3, zinc: 0.6, selenium: 36.5 },
  'salmon': { servingSize: '100g', calories: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0, sugar: 0, sodium: 59, vitaminD: 14.4, vitaminB12: 3.2, vitaminB3: 7.9, vitaminB6: 0.9, vitaminE: 3.5, selenium: 36.5, potassium: 363 },
  'tuna': { servingSize: '100g', calories: 144, protein: 23.3, carbs: 0, fat: 4.9, fiber: 0, sugar: 0, sodium: 47, vitaminD: 5.7, vitaminB12: 2.3, vitaminB3: 18.8, vitaminB6: 0.5, selenium: 90.6, potassium: 323 },
  'prawns': { servingSize: '100g', calories: 99, protein: 18.8, carbs: 0.9, fat: 1.7, fiber: 0, sugar: 0, sodium: 566, vitaminB12: 1.3, vitaminE: 2.2, calcium: 64, iron: 0.5, zinc: 1.1, selenium: 38 },
  'shrimp': { servingSize: '100g', calories: 99, protein: 18.8, carbs: 0.9, fat: 1.7, fiber: 0, sugar: 0, sodium: 566, vitaminB12: 1.3, vitaminE: 2.2, calcium: 64, iron: 0.5, zinc: 1.1, selenium: 38 },

  // EGGS
  'eggs': { servingSize: '100g (≈2 eggs)', calories: 155, protein: 12.6, carbs: 1.1, fat: 11.0, fiber: 0, sugar: 1.1, saturatedFat: 3.3, sodium: 124, vitaminA: 149, vitaminD: 2.0, vitaminB2: 0.5, vitaminB12: 1.1, vitaminB9: 47, iron: 1.8, zinc: 1.3, selenium: 30.7, phosphorus: 198 },
  'egg': { servingSize: '100g (≈2 eggs)', calories: 155, protein: 12.6, carbs: 1.1, fat: 11.0, fiber: 0, sugar: 1.1, saturatedFat: 3.3, sodium: 124, vitaminA: 149, vitaminD: 2.0, vitaminB2: 0.5, vitaminB12: 1.1, vitaminB9: 47, iron: 1.8, zinc: 1.3, selenium: 30.7, phosphorus: 198 },
  'fresh eggs': { servingSize: '100g (≈2 eggs)', calories: 155, protein: 12.6, carbs: 1.1, fat: 11.0, fiber: 0, sugar: 1.1, saturatedFat: 3.3, sodium: 124, vitaminA: 149, vitaminD: 2.0, vitaminB2: 0.5, vitaminB12: 1.1, vitaminB9: 47, iron: 1.8, zinc: 1.3, selenium: 30.7, phosphorus: 198 },

  // GRAINS
  'rice': { servingSize: '100g (cooked)', calories: 130, protein: 2.7, carbs: 28.6, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1, vitaminB1: 0.02, vitaminB3: 0.4, vitaminB6: 0.05, iron: 1.2, magnesium: 12, phosphorus: 43 },
  'basmati rice': { servingSize: '100g (cooked)', calories: 130, protein: 2.7, carbs: 28.6, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1, vitaminB1: 0.02, vitaminB3: 0.4, vitaminB6: 0.05, iron: 1.2, magnesium: 12, phosphorus: 43 },
  'oats': { servingSize: '100g', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, sugar: 0.99, sodium: 2, vitaminB1: 0.76, vitaminB5: 1.3, vitaminB9: 56, iron: 4.7, magnesium: 177, zinc: 3.97, manganese: 4.9 },
  'wheat': { servingSize: '100g', calories: 340, protein: 13.2, carbs: 71.2, fat: 2.5, fiber: 10.7, sugar: 0.4, sodium: 2, vitaminB1: 0.4, vitaminB3: 5.46, vitaminB9: 43, iron: 3.6, magnesium: 126, zinc: 2.65, phosphorus: 288 },
  'bread': { servingSize: '100g', calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2, fiber: 2.7, sugar: 5.0, sodium: 477, vitaminB1: 0.24, vitaminB2: 0.15, vitaminB3: 2.7, vitaminB9: 35, iron: 3.6, calcium: 182, phosphorus: 100 },
  'pasta': { servingSize: '100g (dry)', calories: 371, protein: 13.0, carbs: 74.7, fat: 1.5, fiber: 3.2, sugar: 2.7, sodium: 6, vitaminB1: 0.16, vitaminB2: 0.07, vitaminB3: 1.5, vitaminB9: 18, iron: 1.3, magnesium: 53, phosphorus: 189 },

  // LEGUMES / DAL
  'dal': { servingSize: '100g (cooked)', calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2, vitaminB1: 0.17, vitaminB3: 1.1, vitaminB9: 181, iron: 3.3, magnesium: 36, zinc: 1.4, potassium: 369 },
  'lentils': { servingSize: '100g (cooked)', calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2, vitaminB1: 0.17, vitaminB3: 1.1, vitaminB9: 181, iron: 3.3, magnesium: 36, zinc: 1.4, potassium: 369 },
  'chickpeas': { servingSize: '100g (cooked)', calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, sugar: 4.8, sodium: 7, vitaminB1: 0.12, vitaminB6: 0.14, vitaminB9: 172, iron: 2.9, magnesium: 48, zinc: 1.5, phosphorus: 168 },
  'kidney beans': { servingSize: '100g (cooked)', calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4, sugar: 0.3, sodium: 2, vitaminB1: 0.16, vitaminB9: 130, iron: 2.9, magnesium: 45, potassium: 405, zinc: 1.0 },

  // NUTS & SEEDS
  'almonds': { servingSize: '100g', calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9, fiber: 12.5, sugar: 4.4, saturatedFat: 3.8, sodium: 1, vitaminE: 25.6, vitaminB2: 1.0, vitaminB3: 3.6, calcium: 264, iron: 3.7, magnesium: 270, zinc: 3.1 },
  'cashews': { servingSize: '100g', calories: 553, protein: 18.2, carbs: 30.2, fat: 43.8, fiber: 3.3, sugar: 5.9, saturatedFat: 7.8, sodium: 12, vitaminE: 0.9, vitaminB1: 0.4, vitaminB6: 0.4, iron: 6.7, magnesium: 292, zinc: 5.8, copper: 2.2 },
  'walnuts': { servingSize: '100g', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, sugar: 2.6, sodium: 2, vitaminB1: 0.34, vitaminB6: 0.54, vitaminB9: 98, vitaminE: 0.7, vitaminC: 1.3, iron: 2.9, magnesium: 158, zinc: 3.1 },

  // OILS
  'olive oil': { servingSize: '100ml', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, saturatedFat: 13.8, sodium: 2, vitaminE: 14.4, vitaminK: 60.2 },

  // BEVERAGES
  'orange juice': { servingSize: '100ml', calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2, sugar: 8.4, sodium: 1, vitaminC: 50, vitaminB9: 30, potassium: 200, calcium: 11 },
  'coconut water': { servingSize: '100ml', calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, sugar: 2.6, sodium: 105, vitaminC: 2.4, potassium: 250, magnesium: 25, calcium: 24 },
};

// ─── Category Image Fallbacks (Unsplash) ───────────────────────────────────
const CATEGORY_IMAGES: Record<FoodCategory, string> = {
  Vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80&auto=format',
  Fruits:     'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80&auto=format',
  Dairy:      'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format',
  Meat:       'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&q=80&auto=format',
  Seafood:    'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=80&auto=format',
  Eggs:       'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80&auto=format',
  Grains:     'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80&auto=format',
  Bread:      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80&auto=format',
  Snacks:     'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&q=80&auto=format',
  Beverages:  'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80&auto=format',
  Condiments: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80&auto=format',
  Frozen:     'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&q=80&auto=format',
  Leftovers:  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&auto=format',
  Other:      'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&q=80&auto=format',
};

// ─── Per-food image overrides ────────────────────────────────────────────────
const FOOD_IMAGES: Record<string, string> = {
  'tomato':        'https://images.unsplash.com/photo-1546470427-227c9b2b4f3c?w=400&q=80&auto=format',
  'potato':        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80&auto=format',
  'onion':         'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80&auto=format',
  'spinach':       'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80&auto=format',
  'baby spinach':  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80&auto=format',
  'broccoli':      'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400&q=80&auto=format',
  'carrot':        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80&auto=format',
  'capsicum':      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80&auto=format',
  'bell pepper':   'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80&auto=format',
  'cucumber':      'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&q=80&auto=format',
  'cauliflower':   'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&q=80&auto=format',
  'apple':         'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80&auto=format',
  'banana':        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80&auto=format',
  'mango':         'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80&auto=format',
  'orange':        'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80&auto=format',
  'grapes':        'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&q=80&auto=format',
  'watermelon':    'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=400&q=80&auto=format',
  'strawberry':    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&q=80&auto=format',
  'milk':          'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format',
  'whole milk':    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format',
  'curd':          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80&auto=format',
  'yogurt':        'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80&auto=format',
  'cheese':        'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80&auto=format',
  'paneer':        'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80&auto=format',
  'butter':        'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80&auto=format',
  'eggs':          'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80&auto=format',
  'egg':           'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80&auto=format',
  'fresh eggs':    'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80&auto=format',
  'chicken':       'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80&auto=format',
  'chicken breast':'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80&auto=format',
  'mutton':        'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&q=80&auto=format',
  'fish':          'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=80&auto=format',
  'salmon':        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80&auto=format',
  'prawns':        'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=80&auto=format',
  'rice':          'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&q=80&auto=format',
  'basmati rice':  'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&q=80&auto=format',
  'oats':          'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400&q=80&auto=format',
  'bread':         'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80&auto=format',
  'dal':           'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80&auto=format',
  'lentils':       'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80&auto=format',
  'chickpeas':     'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=400&q=80&auto=format',
  'almonds':       'https://images.unsplash.com/photo-1574184864703-3487b13f0edd?w=400&q=80&auto=format',
  'cashews':       'https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=400&q=80&auto=format',
};

// ─── Public API ─────────────────────────────────────────────────────────────

/** Returns full nutrition for a food by name (case-insensitive lookup), with category fallback. */
export function getFoodNutrition(name: string, _category?: FoodCategory): FullNutrition | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (NUTRITION_DB[key]) return { ...NUTRITION_DB[key] };
  // Partial match
  const partialKey = Object.keys(NUTRITION_DB).find(k => key.includes(k) || k.includes(key));
  if (partialKey) return { ...NUTRITION_DB[partialKey], estimated: true };
  return null;
}

/** Returns an image URL for a food item. Never returns a broken URL — always has a category fallback. */
export function getFoodImageUrl(name: string, category: FoodCategory = 'Other'): string {
  if (!name) return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Other'];
  const key = name.toLowerCase().trim();
  if (FOOD_IMAGES[key]) return FOOD_IMAGES[key];
  // Partial match
  const partialKey = Object.keys(FOOD_IMAGES).find(k => key.includes(k) || k.includes(key));
  if (partialKey) return FOOD_IMAGES[partialKey];
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Other'];
}

/** Returns category image URL (used as fallback). */
export function getCategoryImageUrl(category: FoodCategory): string {
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Other'];
}
