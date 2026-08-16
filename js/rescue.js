// js/rescue.js — Rescue My Food Feature
import { generateRecipes } from './gemini.js';
import { getUrgentPantryItems, getActiveItems } from './pantry.js';

let _cachedRecipes = [];
let _cachedUrgent  = [];

/**
 * Run the full rescue pipeline.
 * Returns { urgent, recipes }
 */
export async function runRescue() {
  const allActive = getActiveItems();
  const urgent    = getUrgentPantryItems();
  const available = allActive.filter(i => !urgent.find(u => u.id === i.id));

  if (urgent.length === 0) {
    _cachedRecipes = [];
    _cachedUrgent  = [];
    return { urgent: [], recipes: [] };
  }

  const recipes = await generateRecipes(urgent, available);
  _cachedRecipes = recipes;
  _cachedUrgent  = urgent;
  return { urgent, recipes };
}

export function getCachedRecipes()  { return _cachedRecipes; }
export function getCachedUrgent()   { return _cachedUrgent; }

export function getRecipeById(idx) {
  return _cachedRecipes[idx] || null;
}

/**
 * Build a list of pantry item IDs that match a recipe's ingredient list.
 */
export function matchRecipeIngredients(recipe, pantryItems) {
  const allUsed = [
    ...(recipe.urgentIngredientsUsed || []),
    ...(recipe.pantryIngredientsUsed || []),
  ];
  return pantryItems
    .filter(item => allUsed.some(name => 
      item.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(item.name.toLowerCase())
    ))
    .map(i => i.id);
}
