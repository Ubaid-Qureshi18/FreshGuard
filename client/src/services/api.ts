import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach auth token from localStorage on every request
api.interceptors.request.use(config => {
  const session = getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ── Session helpers ───────────────────────────────────────
export type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string };
};

export function getSession(): StoredSession | null {
  try {
    const s = localStorage.getItem('fg_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
export function setSession(s: StoredSession) {
  localStorage.setItem('fg_session', JSON.stringify(s));
}
export function clearSession() {
  localStorage.removeItem('fg_session');
}

// ── Auth ──────────────────────────────────────────────────
export const auth = {
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

// ── Foods ─────────────────────────────────────────────────
export const foods = {
  list: (status = 'ACTIVE') => api.get(`/foods?status=${status}`),
  get:  (id: string) => api.get(`/foods/${id}`),
  add:  (data: Record<string, unknown>) => api.post('/foods', data),
  batchAdd: (items: Record<string, unknown>[]) => api.post('/foods/batch', { items }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/foods/${id}`, data),
  updateQuantity: (id: string, quantity: number) => api.patch(`/foods/${id}/quantity`, { quantity }),
  consume: (id: string) => api.post(`/foods/${id}/consume`),
  discard: (id: string) => api.post(`/foods/${id}/discard`),
  delete:  (id: string) => api.delete(`/foods/${id}`),
};

// ── Scan ──────────────────────────────────────────────────
export const scan = {
  analyze: (base64: string, mimeType: string) =>
    api.post('/scan', { base64, mimeType }),
};

// ── Recipes ───────────────────────────────────────────────
export const recipes = {
  generate: (selectedIngredientIds?: string[]) =>
    api.post('/recipes/generate', { selectedIngredientIds }),
};

// ── AI Capabilities ───────────────────────────────────────
export const ai = {
  parseText: (text: string) => api.post('/ai/parse-text', { text }),
  getStorageAdvice: (foodName: string, category?: string, location?: string) =>
    api.post('/ai/storage-advice', { foodName, category, location }),
  getMealPlan: () => api.post('/ai/meal-plan'),
};

// ── Notifications & Expiry Alarms ─────────────────────────
export const notifications = {
  list: () => api.get('/notifications'),
  checkAlarms: () => api.post('/notifications/check-alarms'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ── Stats ─────────────────────────────────────────────────
export const stats = {
  get: () => api.get('/stats'),
};

export default api;
