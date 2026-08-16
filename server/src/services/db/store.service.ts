// server/src/services/db/store.service.ts
// Robust Data Store with Supabase + In-Memory Fallback

import { supabaseForUser } from './supabase.service';

export interface FoodItemRecord {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  date_type: string;
  listed_date: string;
  image_url: string | null;
  status: 'ACTIVE' | 'CONSUMED' | 'DISCARDED';
  notification_enabled: boolean;
  storage_location: string;
  storage_tip: string | null;
  notes: string | null;
  nutrition: Record<string, unknown> | null;
  health_score: number | null;
  health_tags: string[] | null;
  allergens: string[] | null;
  created_at: string;
  updated_at: string;
  consumed_at: string | null;
  discarded_at: string | null;
}

export interface FoodEventRecord {
  id: string;
  food_id: string;
  user_id: string;
  event_type: 'ADDED' | 'UPDATED' | 'CONSUMED' | 'DISCARDED' | 'RESCUED';
  food_name: string;
  quantity_delta: number | null;
  timestamp: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  food_id: string | null;
  title: string;
  message: string;
  type: string;
  severity: string;
  read: boolean;
  due_date: string | null;
  created_at: string;
  food_items?: Partial<FoodItemRecord> | null;
}

// ── In-Memory State ────────────────────────────────────────
const memoryFoods: FoodItemRecord[] = [
  {
    id: 'f-demo-spinach',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Baby Spinach',
    category: 'Vegetables',
    quantity: 1,
    unit: 'pack',
    date_type: 'BEST_BEFORE',
    listed_date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
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
    image_url: null,
    status: 'ACTIVE',
    notification_enabled: true,
    storage_location: 'FRIDGE',
    storage_tip: 'Store on middle shelf, not on door racks where temperature fluctuates.',
    notes: 'Pasteurized whole milk',
    nutrition: { calories: 149, protein: 7.7, carbs: 11.7, fat: 8.0, fiber: 0, sugar: 12, sodium: 105 },
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
];

const memoryEvents: FoodEventRecord[] = [];
const memoryNotifications: NotificationRecord[] = [];

function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

// ── Data Operations ────────────────────────────────────────

export async function listUserFoods(userJwt: string, userId: string, statusFilter?: string): Promise<FoodItemRecord[]> {
  try {
    const db = supabaseForUser(userJwt);
    let q = db.from('food_items').select('*').eq('user_id', userId);
    if (statusFilter && statusFilter !== 'ALL') {
      q = q.eq('status', statusFilter);
    }
    q = q.order('listed_date', { ascending: true });
    const { data, error } = await q;
    if (!error && data && data.length > 0) return data as FoodItemRecord[];
  } catch (err) {
    console.warn('[Store] Supabase listUserFoods fallback:', err instanceof Error ? err.message : err);
  }

  // Memory fallback
  return memoryFoods.filter(f => (!statusFilter || statusFilter === 'ALL' || f.status === statusFilter));
}

export async function getUserFoodById(userJwt: string, userId: string, foodId: string): Promise<FoodItemRecord | null> {
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_items').select('*').eq('id', foodId).single();
    if (!error && data) return data as FoodItemRecord;
  } catch {}

  return memoryFoods.find(f => f.id === foodId) || null;
}

export async function addFoodItem(userJwt: string, userId: string, itemData: Partial<FoodItemRecord>): Promise<FoodItemRecord> {
  const newRecord: FoodItemRecord = {
    id: generateId(),
    user_id: userId,
    name: itemData.name || 'Unnamed Food',
    category: itemData.category || 'Other',
    quantity: itemData.quantity !== undefined ? itemData.quantity : 1,
    unit: itemData.unit || 'pack',
    date_type: itemData.date_type || 'BEST_BEFORE',
    listed_date: itemData.listed_date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    image_url: itemData.image_url || null,
    status: 'ACTIVE',
    notification_enabled: itemData.notification_enabled !== false,
    storage_location: itemData.storage_location || 'FRIDGE',
    storage_tip: itemData.storage_tip || null,
    notes: itemData.notes || null,
    nutrition: itemData.nutrition || null,
    health_score: itemData.health_score || null,
    health_tags: itemData.health_tags || null,
    allergens: itemData.allergens || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    consumed_at: null,
    discarded_at: null,
  };

  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_items').insert(newRecord).select().single();
    if (!error && data) {
      await logFoodEvent(userJwt, userId, data.id, 'ADDED', data.name);
      return data as FoodItemRecord;
    }
  } catch (err) {
    console.warn('[Store] Supabase addFoodItem fallback:', err instanceof Error ? err.message : err);
  }

  // Memory fallback
  memoryFoods.unshift(newRecord);
  await logFoodEvent(userJwt, userId, newRecord.id, 'ADDED', newRecord.name);
  return newRecord;
}

export async function batchAddFoodItems(userJwt: string, userId: string, items: Partial<FoodItemRecord>[]): Promise<FoodItemRecord[]> {
  const added: FoodItemRecord[] = [];
  for (const item of items) {
    const rec = await addFoodItem(userJwt, userId, item);
    added.push(rec);
  }
  return added;
}

export async function updateFoodItem(userJwt: string, userId: string, foodId: string, updates: Partial<FoodItemRecord>): Promise<FoodItemRecord | null> {
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_items').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', foodId).eq('user_id', userId).select().single();
    if (!error && data) return data as FoodItemRecord;
  } catch {}

  const item = memoryFoods.find(f => f.id === foodId && f.user_id === userId);
  if (!item) return null;
  Object.assign(item, updates, { updated_at: new Date().toISOString() });
  return item;
}

export async function consumeFoodItem(userJwt: string, userId: string, foodId: string): Promise<FoodItemRecord | null> {
  const now = new Date().toISOString();
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_items').update({ status: 'CONSUMED', consumed_at: now, updated_at: now }).eq('id', foodId).eq('user_id', userId).select().single();
    if (!error && data) {
      await logFoodEvent(userJwt, userId, foodId, 'CONSUMED', data.name);
      return data as FoodItemRecord;
    }
  } catch {}

  const item = memoryFoods.find(f => f.id === foodId && f.user_id === userId);
  if (!item) return null;
  item.status = 'CONSUMED';
  item.consumed_at = now;
  item.updated_at = now;
  await logFoodEvent(userJwt, userId, foodId, 'CONSUMED', item.name);
  return item;
}

export async function discardFoodItem(userJwt: string, userId: string, foodId: string): Promise<FoodItemRecord | null> {
  const now = new Date().toISOString();
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_items').update({ status: 'DISCARDED', discarded_at: now, updated_at: now }).eq('id', foodId).eq('user_id', userId).select().single();
    if (!error && data) {
      await logFoodEvent(userJwt, userId, foodId, 'DISCARDED', data.name);
      return data as FoodItemRecord;
    }
  } catch {}

  const item = memoryFoods.find(f => f.id === foodId && f.user_id === userId);
  if (!item) return null;
  item.status = 'DISCARDED';
  item.discarded_at = now;
  item.updated_at = now;
  await logFoodEvent(userJwt, userId, foodId, 'DISCARDED', item.name);
  return item;
}

export async function deleteFoodItem(userJwt: string, userId: string, foodId: string): Promise<boolean> {
  try {
    const db = supabaseForUser(userJwt);
    const { error } = await db.from('food_items').delete().eq('id', foodId).eq('user_id', userId);
    if (!error) return true;
  } catch {}

  const idx = memoryFoods.findIndex(f => f.id === foodId && f.user_id === userId);
  if (idx !== -1) {
    memoryFoods.splice(idx, 1);
    return true;
  }
  return false;
}

export async function logFoodEvent(userJwt: string, userId: string, foodId: string, eventType: FoodEventRecord['event_type'], foodName: string) {
  const ev: FoodEventRecord = {
    id: generateId(),
    food_id: foodId,
    user_id: userId,
    event_type: eventType,
    food_name: foodName,
    quantity_delta: null,
    timestamp: new Date().toISOString(),
  };

  try {
    const db = supabaseForUser(userJwt);
    await db.from('food_events').insert(ev);
  } catch {}

  memoryEvents.unshift(ev);
}

export async function listUserEvents(userJwt: string, userId: string): Promise<FoodEventRecord[]> {
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('food_events').select('*').eq('user_id', userId).order('timestamp', { ascending: false });
    if (!error && data) return data as FoodEventRecord[];
  } catch {}

  return memoryEvents.filter(e => e.user_id === userId);
}

export async function listUserNotifications(userJwt: string, userId: string): Promise<NotificationRecord[]> {
  try {
    const db = supabaseForUser(userJwt);
    const { data, error } = await db.from('notifications').select('*, food_items(name, category, listed_date, storage_location)').eq('user_id', userId).order('created_at', { ascending: false });
    if (!error && data && data.length > 0) return data as NotificationRecord[];
  } catch {}

  // Memory fallback — return all notifications (single guest user)
  return [...memoryNotifications];
}

export async function addNotification(userJwt: string, userId: string, notif: Partial<NotificationRecord>) {
  const newN: NotificationRecord = {
    id: generateId(),
    user_id: userId,
    food_id: notif.food_id || null,
    title: notif.title || 'Notification',
    message: notif.message || '',
    type: notif.type || 'REMINDER',
    severity: notif.severity || 'NORMAL',
    read: false,
    due_date: notif.due_date || null,
    created_at: new Date().toISOString(),
  };

  try {
    const db = supabaseForUser(userJwt);
    await db.from('notifications').insert(newN);
  } catch {}

  memoryNotifications.unshift(newN);
  return newN;
}

export async function markAllNotificationsRead(userJwt: string, userId: string) {
  try {
    const db = supabaseForUser(userJwt);
    await db.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch {}

  memoryNotifications.forEach(n => {
    if (n.user_id === userId) n.read = true;
  });
}

export async function markNotificationRead(userJwt: string, userId: string, notifId: string) {
  try {
    const db = supabaseForUser(userJwt);
    await db.from('notifications').update({ read: true }).eq('id', notifId).eq('user_id', userId);
  } catch {}

  const n = memoryNotifications.find(x => x.id === notifId && x.user_id === userId);
  if (n) n.read = true;
}
