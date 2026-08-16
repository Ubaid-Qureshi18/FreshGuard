// js/notifications.js — Browser Push Notification Scheduling

const NOTIF_KEY = 'fg_scheduled_notifs';

/**
 * Request notification permission.
 * Returns 'granted' | 'denied' | 'default'
 */
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function isSupported() {
  return 'Notification' in window;
}

export function isGranted() {
  return Notification.permission === 'granted';
}

/**
 * Schedule notifications for a food item.
 * We use setTimeout for in-session notifications + store schedule for display.
 */
export function scheduleItemNotifications(item) {
  if (!isGranted()) return;

  const now = Date.now();
  const listed = new Date(item.listed_date + 'T12:00:00').getTime();
  const day = 24 * 60 * 60 * 1000;

  const schedule = [
    { daysBeforeListed: 7,  title: `🕐 ${item.name} approaching`,   body: `Your ${item.name} is approaching its ${item.date_type?.replace('_', ' ').toLowerCase()} date.` },
    { daysBeforeListed: 3,  title: `⚠️ Use ${item.name} soon`,       body: `Your ${item.name} should be used in the next 3 days.` },
    { daysBeforeListed: 1,  title: `🔴 ${item.name} — 1 day left`,   body: `Your ${item.name} is listed tomorrow. Want a recipe using it?` },
    { daysBeforeListed: 0,  title: `Today: ${item.name}`,             body: `Your ${item.name} reaches its listed date today.` },
  ];

  const stored = getStoredSchedule();

  for (const s of schedule) {
    const fireAt = listed - (s.daysBeforeListed * day);
    if (fireAt <= now) continue; // Already passed

    const id = `${item.id}_${s.daysBeforeListed}`;
    const delay = fireAt - now;

    // Store schedule info
    stored[id] = { itemId: item.id, fireAt, title: s.title, body: s.body };

    // Schedule with setTimeout (works within session)
    if (delay < 2 * 60 * 60 * 1000) { // Only set timer if < 2 hours away
      setTimeout(() => {
        if (isGranted()) {
          new Notification(s.title, {
            body: s.body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-192.png',
            tag: id,
          });
        }
      }, delay);
    }
  }

  saveStoredSchedule(stored);
}

/**
 * Cancel all notifications for an item.
 */
export function cancelItemNotifications(itemId) {
  const stored = getStoredSchedule();
  const toDelete = Object.keys(stored).filter(k => k.startsWith(itemId));
  toDelete.forEach(k => delete stored[k]);
  saveStoredSchedule(stored);
}

function getStoredSchedule() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); }
  catch { return {}; }
}

function saveStoredSchedule(data) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(data));
}

/**
 * Fire an immediate test notification.
 */
export function sendTestNotification(name) {
  if (!isGranted()) return;
  new Notification('🌿 FreshGuard', {
    body: `Notifications enabled! You'll get reminders about ${name} and other pantry items.`,
    icon: '/assets/icons/icon-192.png',
  });
}

/**
 * Fire an immediate "added to pantry" notification.
 */
export function notifyItemAdded(item) {
  if (!isGranted()) return;
  new Notification(`✅ Added to Pantry`, {
    body: `${item.name} tracked. You'll get reminders as it approaches its listed date.`,
    tag: `added_${item.id}`,
  });
}
