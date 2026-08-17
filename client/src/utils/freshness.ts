import type { FoodItem, EnrichedFood, FreshnessStatus, FoodCategory, PriorityLevel } from '../types';

export const CATEGORY_EMOJIS: Record<string, string> = {
  Dairy: '🥛', Meat: '🥩', Seafood: '🐟', Vegetables: '🥬',
  Fruits: '🍎', Bread: '🍞', Beverages: '🧃', Condiments: '🫙',
  Snacks: '🍿', Frozen: '🧊', Eggs: '🥚', Grains: '🌾',
  Leftovers: '🍱', Other: '📦',
};

export const DATE_TYPE_LABELS: Record<string, string> = {
  BEST_BEFORE: 'Best Before',
  USE_BY: 'Use By',
  EXPIRY: 'Expiry Date',
};

export const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Meat', 'Seafood', 'Vegetables', 'Fruits',
  'Bread', 'Beverages', 'Condiments', 'Snacks', 'Frozen',
  'Eggs', 'Grains', 'Leftovers', 'Other',
];

const PERISHABILITY_FACTORS: Record<FoodCategory, number> = {
  Meat: 1.0, Seafood: 1.0, Leftovers: 1.0,
  Dairy: 0.8, Vegetables: 0.8, Fruits: 0.8, Eggs: 0.8,
  Bread: 0.6, Frozen: 0.5,
  Beverages: 0.3, Condiments: 0.2, Snacks: 0.2, Grains: 0.1, Other: 0.3,
};

export function getDaysRemaining(listedDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const listed = new Date(listedDate + (listedDate.includes('T') ? '' : 'T12:00:00'));
  listed.setHours(0, 0, 0, 0);
  return Math.round((listed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getFreshnessStatus(days: number): FreshnessStatus {
  if (days > 7) return 'fresh';
  if (days >= 4) return 'coming-soon';
  if (days >= 1) return 'use-soon';
  if (days === 0) return 'today';
  return 'past';
}

export function getStatusLabel(status: FreshnessStatus): string {
  const map: Record<FreshnessStatus, string> = {
    'fresh': 'Fresh',
    'coming-soon': 'Coming Soon',
    'use-soon': 'Use Soon',
    'today': 'Today',
    'past': 'Past Date',
  };
  return map[status];
}

export function getCountdown(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} past`;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/**
 * Deterministic Food Priority Engine
 * Calculates a 0-100 priority score based on days remaining, category perishability, and date type.
 */
export function calculateFoodPriority(food: FoodItem): { score: number; level: PriorityLevel; explanation: string } {
  const days = getDaysRemaining(food.listed_date);
  const perishability = PERISHABILITY_FACTORS[food.category] || 0.5;
  const dateTypeMult = food.date_type === 'USE_BY' ? 1.2 : food.date_type === 'EXPIRY' ? 1.1 : 1.0;

  if (days < 0) {
    return {
      score: 100,
      level: '⚪ PAST LISTED DATE',
      explanation: `${food.name} is ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} past its listed date. Check condition before consuming.`,
    };
  }

  if (days === 0) {
    return {
      score: 98,
      level: '🔥 USE NOW',
      explanation: `${food.name} expires TODAY and requires immediate attention.`,
    };
  }

  if (days === 1) {
    const score = Math.min(95, Math.round(85 + perishability * 10 * dateTypeMult));
    return {
      score,
      level: '🔥 USE NOW',
      explanation: `${food.name} has 1 day remaining and is highly perishable.`,
    };
  }

  if (days <= 3) {
    const score = Math.min(84, Math.round(65 + (4 - days) * 7 + perishability * 10));
    return {
      score,
      level: '🟠 USE SOON',
      explanation: `${food.name} has ${days} days left. Plan to use it in your next meal.`,
    };
  }

  if (days <= 7) {
    const score = Math.round(35 + (8 - days) * 4);
    return {
      score,
      level: '🟡 COMING UP',
      explanation: `${food.name} is coming up with ${days} days remaining.`,
    };
  }

  const score = Math.max(5, Math.round(30 - (days - 7)));
  return {
    score,
    level: '🟢 FRESH',
    explanation: `${food.name} is fresh with ${days} days remaining.`,
  };
}

export function enrichFood(food: FoodItem): EnrichedFood {
  const days = getDaysRemaining(food.listed_date);
  const freshnessStatus = getFreshnessStatus(days);
  const priority = calculateFoodPriority(food);

  return {
    ...food,
    daysRemaining: days,
    freshnessStatus,
    statusLabel: getStatusLabel(freshnessStatus),
    countdown: getCountdown(days),
    emoji: CATEGORY_EMOJIS[food.category] || '📦',
    priorityScore: priority.score,
    priorityLevel: priority.level,
    priorityExplanation: priority.explanation,
  };
}

export function sortByUrgency(foods: EnrichedFood[]): EnrichedFood[] {
  return [...foods].sort((a, b) => b.priorityScore - a.priorityScore || a.daysRemaining - b.daysRemaining);
}

export function getUrgentFoods(foods: EnrichedFood[]): EnrichedFood[] {
  return foods.filter(f => f.priorityScore >= 70 || f.daysRemaining <= 3);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  return new Date(clean + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatQuantity(food: FoodItem): string {
  if (food.quantity === null || food.quantity === undefined) return '';
  return `${food.quantity}${food.unit ? ' ' + food.unit : ''}`;
}

export function getStatusCss(status: FreshnessStatus): string {
  const map: Record<FreshnessStatus, string> = {
    'fresh': 'status-fresh',
    'coming-soon': 'status-coming',
    'use-soon': 'status-use-soon',
    'today': 'status-today',
    'past': 'status-past',
  };
  return map[status];
}

