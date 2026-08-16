// js/freshness.js — Freshness Classification Engine

import { FRESHNESS, getCategoryEmoji, getDateTypeLabel } from './config.js';

/**
 * Calculate days remaining from today to the listed date.
 * Returns negative if past.
 */
export function getDaysRemaining(listedDateStr) {
  const today     = new Date();
  const listed    = new Date(listedDateStr);
  today.setHours(0, 0, 0, 0);
  listed.setHours(0, 0, 0, 0);
  return Math.round((listed - today) / (1000 * 60 * 60 * 24));
}

/**
 * Classify an item's freshness status.
 * Returns: 'fresh' | 'coming-soon' | 'use-soon' | 'today' | 'past'
 */
export function getStatus(item) {
  const days = getDaysRemaining(item.listed_date);
  if (days < 0)                                           return 'past';
  if (days === 0)                                         return 'today';
  if (days >= 1 && days <= FRESHNESS.USE_SOON_MAX_DAYS)  return 'use-soon';
  if (days >= FRESHNESS.COMING_SOON_MIN_DAYS && days <= FRESHNESS.COMING_SOON_MAX_DAYS) return 'coming-soon';
  return 'fresh';
}

/**
 * Get a human-readable countdown string.
 */
export function getCountdownText(listedDateStr) {
  const days = getDaysRemaining(listedDateStr);
  if (days < -1)  return `${Math.abs(days)} days past listed date`;
  if (days === -1) return '1 day past listed date';
  if (days === 0)  return 'Listed date: Today';
  if (days === 1)  return '1 day left';
  return `${days} days left`;
}

/**
 * Get badge info: { label, cssClass }
 */
export function getBadgeInfo(item) {
  const status = getStatus(item);
  const map = {
    'fresh':      { label: 'Fresh',            cssClass: 'badge-fresh' },
    'coming-soon':{ label: 'Coming Soon',      cssClass: 'badge-coming-soon' },
    'use-soon':   { label: '⚠ Use Soon',       cssClass: 'badge-use-soon' },
    'today':      { label: '🔴 Today',          cssClass: 'badge-today' },
    'past':       { label: 'Past Listed Date', cssClass: 'badge-past' },
  };
  return map[status];
}

/**
 * Sort items by urgency (most urgent first).
 */
export function sortByUrgency(items) {
  return [...items].sort((a, b) => {
    const da = getDaysRemaining(a.listed_date);
    const db_ = getDaysRemaining(b.listed_date);
    // Past items go last
    if (da < 0 && db_ >= 0) return 1;
    if (db_ < 0 && da >= 0) return -1;
    return da - db_;
  });
}

/**
 * Get items needing immediate attention (≤ 3 days or today/past).
 */
export function getUrgentItems(items) {
  return sortByUrgency(items).filter(item => {
    const d = getDaysRemaining(item.listed_date);
    return d <= 3;
  });
}

/**
 * Enrich item with computed freshness data.
 */
export function enrichItem(item) {
  const days    = getDaysRemaining(item.listed_date);
  const status  = getStatus(item);
  const badge   = getBadgeInfo(item);
  const countdown = getCountdownText(item.listed_date);
  const emoji   = getCategoryEmoji(item.category);
  const dateTypeLabel = getDateTypeLabel(item.date_type);
  return { ...item, days, status, badge, countdown, emoji, dateTypeLabel };
}

/**
 * Format a date for display: "Aug 24, 2026"
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a timestamp for event logs.
 */
export function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Get quantity + unit string.
 */
export function formatQuantity(item) {
  if (!item.quantity) return '';
  return `${item.quantity}${item.unit ? ' ' + item.unit : ''}`;
}

/**
 * Stat counts for the dashboard.
 */
export function getPantryCounts(items) {
  const active = items.filter(i => i.status === 'ACTIVE');
  const urgent = active.filter(i => {
    const d = getDaysRemaining(i.listed_date);
    return d >= 0 && d <= 3;
  });
  return { total: active.length, urgent: urgent.length };
}
