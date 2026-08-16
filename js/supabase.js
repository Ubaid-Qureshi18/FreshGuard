// js/supabase.js — Supabase Client + All DB Operations
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ── Supabase Client (lightweight REST wrapper) ────────────
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this._session = null;
    this._authListeners = [];
  }

  get headers() {
    const h = {
      'apikey':       this.key,
      'Content-Type': 'application/json',
    };
    const token = this.getAccessToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  getAccessToken() {
    const raw = localStorage.getItem('fg_session');
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (s.expires_at && Date.now() / 1000 > s.expires_at) return null;
      return s.access_token || null;
    } catch { return null; }
  }

  getSession() {
    const raw = localStorage.getItem('fg_session');
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (s.expires_at && Date.now() / 1000 > s.expires_at) {
        localStorage.removeItem('fg_session');
        return null;
      }
      return s;
    } catch { return null; }
  }

  getUser() {
    const s = this.getSession();
    return s?.user || null;
  }

  _setSession(data) {
    if (data) {
      localStorage.setItem('fg_session', JSON.stringify(data));
    } else {
      localStorage.removeItem('fg_session');
    }
    this._authListeners.forEach(fn => fn(data?.user || null));
  }

  onAuthChange(fn) {
    this._authListeners.push(fn);
    // Fire immediately with current user
    fn(this.getUser());
  }

  // ── Auth ─────────────────────────────────────────────
  async signUp(email, password) {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign up failed');
    if (data.session) this._setSession(data.session);
    return data;
  }

  async signIn(email, password) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign in failed');
    this._setSession(data);
    return data;
  }

  async signOut() {
    const token = this.getAccessToken();
    if (token) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { ...this.headers, 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    this._setSession(null);
  }

  // ── REST Query Builder ────────────────────────────────
  from(table) {
    return new QueryBuilder(this.url, this.headers, table);
  }
}

class QueryBuilder {
  constructor(url, headers, table) {
    this._url     = url;
    this._headers = headers;
    this._table   = table;
    this._params  = new URLSearchParams();
    this._method  = 'GET';
    this._body    = null;
    this._returnHead = null;
  }

  select(cols = '*') {
    this._params.set('select', cols);
    return this;
  }

  eq(col, val) {
    this._params.append(col, `eq.${val}`);
    return this;
  }

  neq(col, val) {
    this._params.append(col, `neq.${val}`);
    return this;
  }

  in(col, vals) {
    this._params.append(col, `in.(${vals.join(',')})`);
    return this;
  }

  order(col, { ascending = true } = {}) {
    this._params.set('order', `${col}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(n) {
    this._params.set('limit', n);
    return this;
  }

  insert(data) {
    this._method = 'POST';
    this._body   = JSON.stringify(Array.isArray(data) ? data : [data]);
    this._returnHead = 'return=representation';
    return this;
  }

  update(data) {
    this._method = 'PATCH';
    this._body   = JSON.stringify(data);
    this._returnHead = 'return=representation';
    return this;
  }

  delete() {
    this._method = 'DELETE';
    this._returnHead = 'return=representation';
    return this;
  }

  upsert(data) {
    this._method = 'POST';
    this._body   = JSON.stringify(Array.isArray(data) ? data : [data]);
    this._returnHead = 'return=representation,resolution=merge-duplicates';
    return this;
  }

  async then(resolve, reject) {
    try {
      const qs = this._params.toString();
      const endpoint = `${this._url}/rest/v1/${this._table}${qs ? '?' + qs : ''}`;
      const h = { ...this._headers };
      if (this._returnHead) h['Prefer'] = this._returnHead;
      const res = await fetch(endpoint, {
        method:  this._method,
        headers: h,
        body:    this._body,
      });
      if (res.status === 204) return resolve({ data: [], error: null });
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      if (!res.ok) {
        return resolve({ data: null, error: parsed });
      }
      resolve({ data: parsed, error: null });
    } catch (e) {
      resolve({ data: null, error: e });
    }
  }
}

export const db = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Food Items CRUD ───────────────────────────────────────

export async function getFoodItems(userId, status = 'ACTIVE') {
  const q = db.from('food_items')
    .select('*')
    .eq('user_id', userId)
    .order('listed_date', { ascending: true });
  if (status !== 'ALL') q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(JSON.stringify(error));
  return data || [];
}

export async function addFoodItem(item) {
  const { data, error } = await db.from('food_items').insert(item);
  if (error) throw new Error(JSON.stringify(error));
  return data?.[0];
}

export async function updateFoodItem(id, updates) {
  const { data, error } = await db.from('food_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(JSON.stringify(error));
  return data?.[0];
}

export async function consumeFoodItem(id, userId, foodName) {
  const now = new Date().toISOString();
  await updateFoodItem(id, { status: 'CONSUMED', consumed_at: now });
  await logEvent({ food_id: id, user_id: userId, event_type: 'CONSUMED', food_name: foodName });
}

export async function discardFoodItem(id, userId, foodName) {
  const now = new Date().toISOString();
  await updateFoodItem(id, { status: 'DISCARDED', discarded_at: now });
  await logEvent({ food_id: id, user_id: userId, event_type: 'DISCARDED', food_name: foodName });
}

export async function deleteFoodItem(id) {
  const { error } = await db.from('food_items').delete().eq('id', id);
  if (error) throw new Error(JSON.stringify(error));
}

// ── Food Events ───────────────────────────────────────────

export async function logEvent(event) {
  const { error } = await db.from('food_events').insert(event);
  if (error) console.warn('Event log failed:', error);
}

export async function getEvents(userId, limit = 50) {
  const { data, error } = await db.from('food_events')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) throw new Error(JSON.stringify(error));
  return data || [];
}

export async function getImpactStats(userId) {
  const events = await getEvents(userId, 200);
  const stats = {
    added:    0,
    consumed: 0,
    discarded:0,
    rescued:  0,
  };
  for (const e of events) {
    if (e.event_type === 'ADDED')    stats.added++;
    if (e.event_type === 'CONSUMED') stats.consumed++;
    if (e.event_type === 'DISCARDED')stats.discarded++;
    if (e.event_type === 'RESCUED')  stats.rescued++;
  }
  return { stats, events };
}
