import type { FoodItem, EnrichedFood, FreshnessStatus, FoodCategory } from '../types';

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

export function getDaysRemaining(listedDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const listed = new Date(listedDate);
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

export function enrichFood(food: FoodItem): EnrichedFood {
  const days = getDaysRemaining(food.listed_date);
  const freshnessStatus = getFreshnessStatus(days);
  return {
    ...food,
    daysRemaining: days,
    freshnessStatus,
    statusLabel: getStatusLabel(freshnessStatus),
    countdown: getCountdown(days),
    emoji: CATEGORY_EMOJIS[food.category] || '📦',
  };
}

export function sortByUrgency(foods: EnrichedFood[]): EnrichedFood[] {
  return [...foods].sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function getUrgentFoods(foods: EnrichedFood[]): EnrichedFood[] {
  return foods.filter(f => f.daysRemaining <= 3);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatQuantity(food: FoodItem): string {
  if (!food.quantity) return '';
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
