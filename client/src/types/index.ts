// All TypeScript types for FreshGuard

export type DateType = 'BEST_BEFORE' | 'USE_BY' | 'EXPIRY';
export type FoodStatus = 'ACTIVE' | 'CONSUMED' | 'DISCARDED';
export type StorageLocation = 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'COUNTER';

export type FoodCategory =
  | 'Dairy' | 'Meat' | 'Seafood' | 'Vegetables' | 'Fruits'
  | 'Bread' | 'Beverages' | 'Condiments' | 'Snacks' | 'Frozen'
  | 'Eggs' | 'Grains' | 'Leftovers' | 'Other';

export interface NutritionData {
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  category: FoodCategory;
  quantity: number | null;
  unit: string | null;
  date_type: DateType;
  listed_date: string; // YYYY-MM-DD
  image_url: string | null;
  status: FoodStatus;
  notification_enabled: boolean;
  storage_location?: StorageLocation;
  storage_tip?: string | null;
  notes?: string | null;
  nutrition?: NutritionData | null;
  health_score?: number | null;
  health_tags?: string[] | null;
  allergens?: string[] | null;
  created_at: string;
  updated_at: string;
  consumed_at: string | null;
  discarded_at: string | null;
}

export type FreshnessStatus = 'fresh' | 'coming-soon' | 'use-soon' | 'today' | 'past';

export interface EnrichedFood extends FoodItem {
  daysRemaining: number;
  freshnessStatus: FreshnessStatus;
  statusLabel: string;
  countdown: string;
  emoji: string;
}

export interface ScanResult {
  productName: string;
  dateType: DateType;
  listedDate: string | null;
  quantity: number | null;
  unit: string | null;
  category: FoodCategory;
  storageLocation?: StorageLocation;
  confidence: number;
  rawDateText: string;
  notes: string | null;
  nutrition?: NutritionData | null;
  healthScore?: number | null;
  healthTags?: string[] | null;
  allergens?: string[] | null;
}

export interface ParsedGroceryItem {
  name: string;
  category: FoodCategory;
  quantity: number | null;
  unit: string | null;
  dateType: DateType;
  listedDate: string;
  storageLocation: StorageLocation;
  storageTip?: string;
  nutrition?: NutritionData | null;
  healthScore?: number | null;
  healthTags?: string[] | null;
}

export interface StorageAdvice {
  bestLocation: StorageLocation;
  estimatedShelfLife: string;
  storageTip: string;
  freezerAdvice: string;
  spoilageSigns: string;
}

export interface MealPlanMeal {
  title: string;
  usesPantry: string[];
  description: string;
}

export interface MealPlanDay {
  day: string;
  theme: string;
  meals: {
    breakfast: MealPlanMeal;
    lunch: MealPlanMeal;
    dinner: MealPlanMeal;
  };
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  isUrgent: boolean;
}

export interface Recipe {
  name: string;
  emoji: string;
  description: string;
  prepTime: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  rescueReason: string;
  urgentIngredientsUsed: string[];
  pantryIngredientsUsed: string[];
  extraIngredients: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  nutrition?: { calories?: number; protein?: string; carbs?: string; fat?: string };
}

export interface Notification {
  id: string;
  user_id: string;
  food_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  food_items?: { name: string; category: FoodCategory } | null;
}

export interface FoodEvent {
  id: string;
  food_id: string;
  user_id: string;
  event_type: 'ADDED' | 'UPDATED' | 'CONSUMED' | 'DISCARDED' | 'RESCUED';
  food_name: string;
  quantity_delta: number | null;
  timestamp: string;
}

export interface ImpactStats {
  added: number;
  consumed: number;
  rescued: number;
  discarded: number;
  usedBeforeListed: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
