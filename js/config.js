// js/config.js — FreshGuard Configuration
// Supabase credentials and runtime Gemini API key management

export const SUPABASE_URL  = 'https://spjjpppowxbpffsmfkir.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwampwcHBvd3hicGZmc21ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NTAzOTQsImV4cCI6MjEwMTMyNjM5NH0.UWmeUunnzAQQInNDDGz1qF5bg9aJCURz0F0NaQChOYs';

// Gemini API key — stored in localStorage, set via Settings screen
export function getGeminiKey() {
  return localStorage.getItem('fg_gemini_key') || '';
}

export function setGeminiKey(key) {
  localStorage.setItem('fg_gemini_key', key.trim());
}

export function hasGeminiKey() {
  return !!getGeminiKey();
}

// Gemini model to use
export const GEMINI_MODEL = 'gemini-2.0-flash';

// Freshness thresholds (days)
export const FRESHNESS = {
  FRESH_MIN_DAYS:       8,
  COMING_SOON_MIN_DAYS: 4,
  COMING_SOON_MAX_DAYS: 7,
  USE_SOON_MIN_DAYS:    1,
  USE_SOON_MAX_DAYS:    3,
  TODAY_DAYS:           0,
};

// Category emoji map
export const CATEGORY_EMOJIS = {
  'Dairy':        '🥛',
  'Meat':         '🥩',
  'Seafood':      '🐟',
  'Vegetables':   '🥬',
  'Fruits':       '🍎',
  'Bread':        '🍞',
  'Beverages':    '🧃',
  'Condiments':   '🫙',
  'Snacks':       '🍿',
  'Frozen':       '🧊',
  'Eggs':         '🥚',
  'Grains':       '🌾',
  'Leftovers':    '🍱',
  'Other':        '📦',
};

export const CATEGORIES = Object.keys(CATEGORY_EMOJIS);

export function getCategoryEmoji(category) {
  return CATEGORY_EMOJIS[category] || '📦';
}

// Date type labels for UI
export const DATE_TYPE_LABELS = {
  'BEST_BEFORE': 'Best Before',
  'USE_BY':      'Use By',
  'EXPIRY':      'Expiry',
};

export function getDateTypeLabel(type) {
  return DATE_TYPE_LABELS[type] || type;
}
