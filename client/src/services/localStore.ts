import type { FoodItem, Notification, FoodCategory, Recipe, FoodEvent, DiscardReason } from '../types';

const PANTRY_KEY = 'fg_local_pantry_v3';
const EVENTS_KEY = 'fg_local_events_v3';

const INITIAL_FOODS: FoodItem[] = [
  {
    id: 'f-demo-spinach',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Baby Spinach',
    category: 'Vegetables',
    quantity: 1,
    unit: 'pack',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    purchase_date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    purchase_price: 60,
    source: 'SCAN',
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'FRIDGE',
    storage_tip: 'Keep in crisper drawer with a paper towel to absorb excess moisture.',
    notes: 'Organic crisp greens',
    nutrition: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79 },
    health_score: 95,
    health_tags: ['High Fiber', 'Rich in Iron', 'Vitamin K'],
    allergens: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  },
  {
    id: 'f-demo-milk',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Whole Milk 2L',
    category: 'Dairy',
    quantity: 2,
    unit: 'L',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    purchase_date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    purchase_price: 90,
    source: 'BARCODE',
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'FRIDGE',
    storage_tip: 'Store on middle shelf, not on door racks where temperature fluctuates.',
    notes: 'Pasteurized whole milk',
    nutrition: { calories: 149, protein: 7.7, carbs: 11.7, fat: 8, fiber: 0, sugar: 12, sodium: 105 },
    health_score: 82,
    health_tags: ['High Calcium', 'Protein Rich'],
    allergens: ['Dairy'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  },
  {
    id: 'f-demo-chicken',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Chicken Breast',
    category: 'Meat',
    quantity: 500,
    unit: 'g',
    date_type: 'USE_BY',
    listed_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    purchase_date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    purchase_price: 240,
    source: 'SCAN',
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'FRIDGE',
    storage_tip: 'Store on bottom shelf in leak-proof glass container.',
    notes: 'Skinless boneless breast',
    nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
    health_score: 90,
    health_tags: ['Lean Protein', 'Low Carb'],
    allergens: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  },
  {
    id: 'f-demo-eggs',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Fresh Eggs',
    category: 'Eggs',
    quantity: 6,
    unit: 'pieces',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'FRIDGE',
    storage_tip: 'Keep in main fridge shelf in original carton.',
    notes: 'Free range grade A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  },
  {
    id: 'f-demo-rice',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Basmati Rice',
    category: 'Grains',
    quantity: 1,
    unit: 'kg',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 36 * 86400000).toISOString().slice(0, 10),
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'PANTRY',
    storage_tip: 'Store in airtight container in a cool, dry pantry.',
    notes: 'Long grain rice',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  },
];

export function getLocalFoods(): FoodItem[] {
  try {
    const raw = localStorage.getItem(PANTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveLocalFoods(INITIAL_FOODS);
  return INITIAL_FOODS;
}

export function saveLocalFoods(items: FoodItem[]) {
  try {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('freshguard:pantry-refresh'));
    }
  } catch {}
}

export function addLocalFood(data: Record<string, unknown>): FoodItem {
  const current = getLocalFoods();
  const newItem: FoodItem = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: '00000000-0000-0000-0000-000000000001',
    name: String(data.name || 'Unnamed Food'),
    category: (data.category as FoodCategory) || 'Other',
    quantity: data.quantity !== undefined && data.quantity !== null ? Number(data.quantity) : 1,
    unit: data.unit ? String(data.unit) : 'pack',
    date_type: (data.date_type as any) || 'BEST_BEFORE',
    listed_date: String(data.listed_date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)),
    image_url: (data.image_url as string) || null,
    status: 'ACTIVE',
    notification_enabled: data.notification_enabled !== false,
    storage_location: (data.storage_location as any) || 'FRIDGE',
    storage_tip: (data.storage_tip as string) || null,
    notes: (data.notes as string) || null,
    nutrition: (data.nutrition as any) || null,
    health_score: data.health_score ? Number(data.health_score) : null,
    health_tags: (data.health_tags as string[]) || null,
    allergens: (data.allergens as string[]) || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  };
  const updated = [newItem, ...current];
  saveLocalFoods(updated);
  return newItem;
}

export function addLocalBatchFoods(items: Record<string, unknown>[]): FoodItem[] {
  const current = getLocalFoods();
  const newItems: FoodItem[] = items.map((data, i) => ({
    id: `local_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: '00000000-0000-0000-0000-000000000001',
    name: String(data.name || 'Food Item'),
    category: (data.category as FoodCategory) || 'Other',
    quantity: data.quantity !== undefined && data.quantity !== null ? Number(data.quantity) : 1,
    unit: data.unit ? String(data.unit) : 'pack',
    date_type: (data.date_type as any) || 'BEST_BEFORE',
    listed_date: String(data.listed_date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)),
    image_url: (data.image_url as string) || null,
    status: 'ACTIVE',
    notification_enabled: data.notification_enabled !== false,
    storage_location: (data.storage_location as any) || 'FRIDGE',
    storage_tip: (data.storage_tip as string) || null,
    notes: (data.notes as string) || null,
    nutrition: (data.nutrition as any) || null,
    health_score: data.health_score ? Number(data.health_score) : null,
    health_tags: (data.health_tags as string[]) || null,
    allergens: (data.allergens as string[]) || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  }));
  const updated = [...newItems, ...current];
  saveLocalFoods(updated);
  return newItems;
}

export function updateLocalFood(id: string, updates: Record<string, unknown>): FoodItem | null {
  const current = getLocalFoods();
  const idx = current.findIndex(f => f.id === id);
  if (idx === -1) return null;
  const item = current[idx];
  Object.assign(item, updates, { updated_at: new Date().toISOString() });
  saveLocalFoods(current);
  return item;
}

export function consumeLocalFood(id: string): FoodItem | null {
  const now = new Date().toISOString();
  return updateLocalFood(id, { status: 'CONSUMED', consumed_at: now });
}

export function discardLocalFood(id: string): FoodItem | null {
  const now = new Date().toISOString();
  return updateLocalFood(id, { status: 'DISCARDED', discarded_at: now });
}

export function deleteLocalFood(id: string): boolean {
  const current = getLocalFoods();
  const filtered = current.filter(f => f.id !== id);
  if (filtered.length !== current.length) {
    saveLocalFoods(filtered);
    return true;
  }
  return false;
}

export function getLocalEvents(): FoodEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function logLocalEvent(eventType: FoodEvent['event_type'], foodId: string, foodName: string, delta: number | null = null, reason?: DiscardReason | string | null) {
  const events = getLocalEvents();
  const newEv: FoodEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    food_id: foodId,
    user_id: '00000000-0000-0000-0000-000000000001',
    event_type: eventType,
    food_name: foodName,
    quantity_delta: delta,
    reason: reason || null,
    timestamp: new Date().toISOString(),
  };
  events.unshift(newEv);
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
  return newEv;
}

export function executeCookRecipe(recipe: Recipe): { success: boolean; itemsUpdated: string[] } {
  const current = getLocalFoods();
  const usedIngredients = [
    ...(recipe.urgentIngredientsUsed || []),
    ...(recipe.pantryIngredientsUsed || []),
    ...(recipe.ingredients ? recipe.ingredients.map(i => i.name) : [])
  ].map(s => s.toLowerCase());

  const updatedNames: string[] = [];

  const updated = current.map(item => {
    const isMatched = usedIngredients.some(name =>
      item.name.toLowerCase().includes(name) || name.includes(item.name.toLowerCase())
    );

    if (isMatched && item.status === 'ACTIVE') {
      updatedNames.push(item.name);
      logLocalEvent('RESCUED', item.id, item.name, item.quantity);
      return {
        ...item,
        status: 'CONSUMED' as const,
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });

  saveLocalFoods(updated);
  return { success: true, itemsUpdated: updatedNames };
}

export function getLocalStats() {
  const foods = getLocalFoods();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let urgentCount = 0;
  let warningCount = 0;
  let freshCount = 0;
  let totalAtRiskValue = 0;
  let totalRescuedValue = 0;
  let totalDiscardedValue = 0;

  const active = foods.filter(f => f.status === 'ACTIVE');
  const consumedFoods = foods.filter(f => f.status === 'CONSUMED');
  const discardedFoods = foods.filter(f => f.status === 'DISCARDED');

  active.forEach(f => {
    const listed = new Date((f.listed_date || '').includes('T') ? f.listed_date : f.listed_date + 'T12:00:00');
    listed.setHours(0, 0, 0, 0);
    const diffDays = Math.round((listed.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 1) {
      urgentCount++;
      if (f.purchase_price) totalAtRiskValue += f.purchase_price;
    } else if (diffDays <= 3) {
      warningCount++;
      if (f.purchase_price) totalAtRiskValue += f.purchase_price;
    } else {
      freshCount++;
    }
  });

  consumedFoods.forEach(f => {
    if (f.purchase_price) totalRescuedValue += f.purchase_price;
  });

  discardedFoods.forEach(f => {
    if (f.purchase_price) totalDiscardedValue += f.purchase_price;
  });

  return {
    total: active.length,
    urgentCount,
    warningCount,
    freshCount,
    consumed: consumedFoods.length,
    discarded: discardedFoods.length,
    rescued: consumedFoods.length,
    totalAtRiskValue,
    totalRescuedValue,
    totalDiscardedValue,
  };
}

export function getLocalNotifications(): Notification[] {
  const foods = getLocalFoods().filter(f => f.status === 'ACTIVE');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notifs: Notification[] = [];

  foods.forEach(f => {
    const listed = new Date(f.listed_date + 'T00:00:00');
    const diffDays = Math.round((listed.getTime() - today.getTime()) / 86400000);

    if (diffDays <= 1) {
      notifs.push({
        id: `notif_${f.id}_urgent`,
        user_id: '00000000-0000-0000-0000-000000000001',
        food_id: f.id,
        title: `🚨 ${f.name} expires ${diffDays <= 0 ? 'TODAY' : 'tomorrow'}`,
        message: `Use ${f.name} immediately to prevent waste.`,
        type: 'URGENT',
        read: false,
        created_at: new Date().toISOString(),
        food_items: { name: f.name, category: f.category },
      });
    } else if (diffDays <= 3) {
      notifs.push({
        id: `notif_${f.id}_warn`,
        user_id: '00000000-0000-0000-0000-000000000001',
        food_id: f.id,
        title: `🔔 ${f.name} expires in ${diffDays} days`,
        message: `Plan a meal using ${f.name} within the next ${diffDays} days.`,
        type: 'REMINDER',
        read: false,
        created_at: new Date().toISOString(),
        food_items: { name: f.name, category: f.category },
      });
    }
  });

  return notifs;
}

export function generateLocalRecipes(_selectedIngredientIds?: string[]): Recipe[] {
  const foods = getLocalFoods().filter(f => f.status === 'ACTIVE');
  const names = foods.map(f => f.name);

  return [
    {
      name: 'Fresh Pantry Harvest Stir-Fry',
      emoji: '🥘',
      description: 'A vibrant, quick stir-fry crafted from your active pantry ingredients.',
      prepTime: '10 mins',
      cookTime: '15 mins',
      difficulty: 'Easy',
      servings: 2,
      rescueReason: 'Uses your available fresh ingredients before expiration.',
      urgentIngredientsUsed: names.slice(0, 2),
      pantryIngredientsUsed: names.slice(2, 4),
      extraIngredients: ['Olive Oil', 'Soy Sauce', 'Garlic', 'Black Pepper'],
      ingredients: names.map(n => ({ name: n, amount: '1 portion', isUrgent: true })),
      instructions: [
        'Heat 1 tbsp olive oil in a large skillet over medium-high heat.',
        'Sauté garlic for 30 seconds until fragrant.',
        `Add ${names[0] || 'vegetables'} and cook for 3-4 minutes.`,
        `Toss in remaining ingredients (${names.slice(1, 3).join(', ') || 'pantry items'}).`,
        'Drizzle with soy sauce, season with black pepper, and serve piping hot!'
      ],
      nutrition: { calories: 340, protein: '18g', carbs: '28g', fat: '14g' },
    },
    {
      name: 'Pantry Rescue Frittata',
      emoji: '🍳',
      description: 'A fluffy, protein-packed oven frittata utilizing your veggies and dairy.',
      prepTime: '8 mins',
      cookTime: '20 mins',
      difficulty: 'Easy',
      servings: 3,
      rescueReason: 'Great way to turn expiring produce into a wholesome breakfast or dinner.',
      urgentIngredientsUsed: names.slice(0, 1),
      pantryIngredientsUsed: names.slice(1, 3),
      extraIngredients: ['Eggs', 'Salt', 'Black Pepper', 'Butter'],
      ingredients: names.map(n => ({ name: n, amount: 'Handful', isUrgent: false })),
      instructions: [
        'Preheat oven to 375°F (190°C).',
        'Whisk 6 eggs in a bowl with salt and pepper.',
        'Sauté greens and veggies in an oven-safe skillet until softened.',
        'Pour beaten eggs over the cooked ingredients and top with cheese or herbs.',
        'Bake for 15-18 minutes until golden and set.'
      ],
      nutrition: { calories: 290, protein: '22g', carbs: '6g', fat: '19g' },
    },
  ];
}
