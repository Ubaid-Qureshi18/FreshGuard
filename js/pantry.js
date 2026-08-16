// js/pantry.js — Pantry State Management

import { getFoodItems, addFoodItem, updateFoodItem,
         consumeFoodItem, discardFoodItem, deleteFoodItem, logEvent } from './supabase.js';
import { enrichItem, sortByUrgency, getUrgentItems } from './freshness.js';
import { scheduleItemNotifications, cancelItemNotifications, notifyItemAdded } from './notifications.js';

// ── In-memory state ───────────────────────────────────────
let _items     = [];
let _listeners = [];
let _userId    = null;

export function setUserId(id) { _userId = id; }
export function getUserId()   { return _userId; }

// ── Subscribe to pantry changes ───────────────────────────
export function onPantryChange(fn) {
  _listeners.push(fn);
}

function notify() {
  _listeners.forEach(fn => fn(getEnrichedItems()));
}

// ── Load from Supabase ────────────────────────────────────
export async function loadPantry() {
  if (!_userId) return;
  const items = await getFoodItems(_userId, 'ALL');
  _items = items;
  notify();
}

// ── Getters ───────────────────────────────────────────────
export function getEnrichedItems(statusFilter = null) {
  let items = _items;
  if (statusFilter) items = items.filter(i => i.status === statusFilter);
  return sortByUrgency(items.map(enrichItem));
}

export function getActiveItems() {
  return getEnrichedItems('ACTIVE');
}

export function getUrgentPantryItems() {
  return getUrgentItems(getActiveItems());
}

export function getItemById(id) {
  const raw = _items.find(i => i.id === id);
  return raw ? enrichItem(raw) : null;
}

// ── Add Item ──────────────────────────────────────────────
export async function addItem(itemData) {
  const item = await addFoodItem({ ...itemData, user_id: _userId });
  await logEvent({ food_id: item.id, user_id: _userId, event_type: 'ADDED', food_name: item.name });
  _items.push(item);
  notify();
  scheduleItemNotifications(item);
  notifyItemAdded(item);
  return item;
}

// ── Update Item ───────────────────────────────────────────
export async function updateItem(id, updates) {
  const updated = await updateFoodItem(id, updates);
  const idx = _items.findIndex(i => i.id === id);
  if (idx !== -1) _items[idx] = { ..._items[idx], ...updates };
  await logEvent({ food_id: id, user_id: _userId, event_type: 'UPDATED', food_name: _items[idx]?.name });
  notify();
  // Reschedule notifications if date changed
  if (updates.listed_date) {
    cancelItemNotifications(id);
    scheduleItemNotifications({ ..._items[idx], ...updates });
  }
  return updated;
}

// ── Consume Item ──────────────────────────────────────────
export async function consumeItem(id) {
  const item = _items.find(i => i.id === id);
  await consumeFoodItem(id, _userId, item?.name);
  const idx = _items.findIndex(i => i.id === id);
  if (idx !== -1) _items[idx].status = 'CONSUMED';
  cancelItemNotifications(id);
  notify();
}

// ── Discard Item ──────────────────────────────────────────
export async function discardItem(id) {
  const item = _items.find(i => i.id === id);
  await discardFoodItem(id, _userId, item?.name);
  const idx = _items.findIndex(i => i.id === id);
  if (idx !== -1) _items[idx].status = 'DISCARDED';
  cancelItemNotifications(id);
  notify();
}

// ── Delete Item ───────────────────────────────────────────
export async function deleteItem(id) {
  await deleteFoodItem(id);
  _items = _items.filter(i => i.id !== id);
  cancelItemNotifications(id);
  notify();
}

// ── Consume Multiple (after rescue) ──────────────────────
export async function consumeMultiple(ids) {
  for (const id of ids) {
    await consumeItem(id);
    await logEvent({ food_id: id, user_id: _userId, event_type: 'RESCUED', food_name: getItemById(id)?.name });
  }
}
