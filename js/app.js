// js/app.js — FreshGuard App Bootstrap & View Orchestration
import { db } from './supabase.js';
import { getImpactStats } from './supabase.js';
import { setUserId, loadPantry, onPantryChange, getActiveItems, getEnrichedItems,
         getUrgentPantryItems, getItemById, addItem, updateItem,
         consumeItem, discardItem, deleteItem, consumeMultiple } from './pantry.js';
import { enrichItem, formatDate, formatQuantity, getPantryCounts, getDaysRemaining } from './freshness.js';
import { startCamera, stopCamera, captureFrame, captureFromFile,
         runScanPipeline, validateScanResult, toggleFlash } from './scanner.js';
import { runRescue, getCachedRecipes, getRecipeById, matchRecipeIngredients } from './rescue.js';
import { requestPermission, isGranted, isSupported, scheduleItemNotifications } from './notifications.js';
import { getGeminiKey, setGeminiKey, hasGeminiKey, CATEGORIES,
         getCategoryEmoji, getDateTypeLabel, DATE_TYPE_LABELS } from './config.js';

// ── View Registry ─────────────────────────────────────────
let currentView = null;
let currentUser = null;

// All view elements keyed by name
const VIEW_IDS = ['dashboard', 'pantry', 'rescue', 'impact', 'settings'];

function getView(name) {
  return document.getElementById(`view-${name}`);
}

function showView(name, ...args) {
  VIEW_IDS.forEach(id => {
    const v = getView(id);
    if (v) v.classList.add('hidden');
  });
  const target = getView(name);
  if (target) {
    target.classList.remove('hidden');
    currentView = name;
  }
  // Trigger lifecycle
  const handler = viewHandlers[name];
  if (handler) handler(...args);
  updateNavActive(name);
}

function updateNavActive(view) {
  document.querySelectorAll('.nav-item, .nav-scan-fab').forEach(el => el.classList.remove('active'));
  const map = { dashboard: 'nav-home', pantry: 'nav-pantry', rescue: 'nav-rescue', impact: 'nav-impact', settings: 'nav-settings' };
  const id = map[view];
  if (id) document.getElementById(id)?.classList.add('active');
}

// ── Toast System ──────────────────────────────────────────
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Helpers ───────────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function qs(sel, parent = document) { return parent.querySelector(sel); }

function buildFoodCard(item, onClick, showActions = true) {
  const card = document.createElement('div');
  card.className = `food-card status-${item.status}`;
  card.dataset.id = item.id;

  const actionsHtml = showActions ? `
    <div class="food-card-actions">
      <button class="btn btn-sm btn-ghost btn-use" title="Mark used">✓</button>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="food-card-emoji">${item.emoji}</div>
    <div class="food-card-body">
      <div class="food-card-name">${item.name}</div>
      <div class="food-card-meta">${formatQuantity(item)}${item.category ? (formatQuantity(item) ? ' · ' : '') + item.category : ''}</div>
      <div class="food-card-bottom">
        <span class="badge badge-date-type">${item.dateTypeLabel}</span>
        <span class="badge ${item.badge.cssClass}">${item.badge.label}</span>
        <span class="food-card-countdown">${item.countdown}</span>
      </div>
    </div>
    ${actionsHtml}
    <span class="food-card-chevron">›</span>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-use')) {
      e.stopPropagation();
      handleQuickConsume(item.id, item.name);
      return;
    }
    onClick(item);
  });

  return card;
}

async function handleQuickConsume(id, name) {
  try {
    await consumeItem(id);
    toast(`${name} marked as consumed`, 'success');
  } catch { toast('Failed to update item', 'error'); }
}

// ── Dashboard View ────────────────────────────────────────
const viewHandlers = {};

viewHandlers.dashboard = function() {
  renderDashboard();
};

function renderDashboard() {
  const active = getActiveItems();
  const urgent = getUrgentPantryItems();
  const { total, urgent: urgentCount } = getPantryCounts(active);

  // Stats
  el('stat-total').textContent  = total;
  el('stat-urgent').textContent = urgentCount;

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  el('dashboard-greeting').textContent = greet + (currentUser?.email ? ', ' + currentUser.email.split('@')[0] : '') + '!';
  el('dashboard-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  // Use First list
  const useFirstList = el('use-first-list');
  useFirstList.innerHTML = '';

  const showItems = urgent.slice(0, 4);
  if (showItems.length === 0) {
    useFirstList.innerHTML = `
      <div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted)">
        <div style="font-size:2rem;margin-bottom:var(--space-2)">🎉</div>
        <div style="font-size:var(--font-size-sm)">All your food is fresh!</div>
      </div>`;
  } else {
    showItems.forEach((item, i) => {
      const card = buildFoodCard(item, (it) => showFoodDetail(it.id));
      card.style.animationDelay = `${i * 60}ms`;
      useFirstList.appendChild(card);
    });
  }

  // Rescue banner
  el('rescue-banner').classList.toggle('hidden', urgent.length === 0);
  if (urgent.length > 0) {
    el('rescue-subtitle').textContent = `${urgent.length} ingredient${urgent.length > 1 ? 's' : ''} need${urgent.length === 1 ? 's' : ''} attention`;
  }

  // Notification banner
  const notifBanner = el('notif-banner');
  if (notifBanner) {
    if (isSupported() && !isGranted()) {
      notifBanner.classList.remove('hidden');
    } else {
      notifBanner.classList.add('hidden');
    }
  }
}

// ── Pantry View ───────────────────────────────────────────
let pantryTab = 'ALL';

viewHandlers.pantry = function() {
  renderPantry();
};

function renderPantry() {
  const allActive = getActiveItems();
  const filterMap = {
    'ALL':         allActive,
    'FRESH':       allActive.filter(i => i.status === 'fresh' || i.days > 3),
    'COMING':      allActive.filter(i => i.days >= 4 && i.days <= 7),
    'USE-SOON':    allActive.filter(i => i.days >= 0 && i.days <= 3),
    'PAST':        getEnrichedItems('ALL').filter(i => i.days < 0 || i.status === 'PAST'),
  };

  // Fix: use actual status field
  const tabFilters = {
    'ALL':         getEnrichedItems('ACTIVE'),
    'FRESH':       getEnrichedItems('ACTIVE').filter(i => i.status === 'fresh'),
    'COMING':      getEnrichedItems('ACTIVE').filter(i => i.status === 'coming-soon'),
    'USE-SOON':    getEnrichedItems('ACTIVE').filter(i => i.status === 'use-soon' || i.status === 'today'),
    'PAST':        getEnrichedItems('ACTIVE').filter(i => i.status === 'past'),
  };

  const items = tabFilters[pantryTab] || tabFilters['ALL'];
  const list  = el('pantry-list');
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding:var(--space-10)">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">Nothing here</div>
        <div class="empty-state-body">${pantryTab === 'ALL' ? 'Your pantry is waiting. Scan or add your first food item.' : 'No items in this category.'}</div>
        ${pantryTab === 'ALL' ? `<button class="btn btn-primary" onclick="window.app.showScan()">📷 Scan Food</button>` : ''}
      </div>`;
    return;
  }

  items.forEach((item, i) => {
    const card = buildFoodCard(item, (it) => showFoodDetail(it.id));
    card.style.animationDelay = `${i * 50}ms`;
    list.appendChild(card);
  });
}

// ── Food Detail Modal ─────────────────────────────────────
function showFoodDetail(id) {
  const item = getItemById(id);
  if (!item) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'food-detail-overlay';
  overlay.innerHTML = `
    <div class="modal" style="border-radius:var(--radius-xl) var(--radius-xl) 0 0">
      <div class="modal-handle"></div>
      <div class="food-detail-hero">
        <span class="food-detail-emoji">${item.emoji}</span>
        <div class="food-detail-name">${item.name}</div>
        <div class="food-detail-qty">${formatQuantity(item)}</div>
        <div style="margin-top:var(--space-3)">
          <span class="badge ${item.badge.cssClass}">${item.badge.label}</span>
          <span class="badge badge-date-type" style="margin-left:var(--space-2)">${item.dateTypeLabel}</span>
        </div>
      </div>

      <div class="detail-rows">
        <div class="detail-row">
          <span class="detail-row-key">Date Type</span>
          <span class="detail-row-value">${item.dateTypeLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row-key">Listed Date</span>
          <span class="detail-row-value">${formatDate(item.listed_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row-key">Days Remaining</span>
          <span class="detail-row-value" style="color:${item.days <= 0 ? 'var(--color-today)' : item.days <= 3 ? 'var(--color-use-soon)' : 'var(--color-primary)'}">${item.countdown}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row-key">Category</span>
          <span class="detail-row-value">${item.category || '—'}</span>
        </div>
        ${item.quantity ? `
        <div class="detail-row">
          <span class="detail-row-key">Quantity</span>
          <span class="detail-row-value">${formatQuantity(item)}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="detail-row-key">Added</span>
          <span class="detail-row-value">${formatDate(item.created_at?.slice(0,10) || item.listed_date)}</span>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-4)">
        <button class="btn btn-primary btn-full" id="btn-consume">✅ Mark as Consumed</button>
        <button class="btn btn-rescue btn-full" id="btn-rescue-from-detail">🍳 Rescue This Food</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <button class="btn btn-secondary" id="btn-discard">🗑 Discard</button>
          <button class="btn btn-ghost" id="btn-close-detail">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#btn-close-detail').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-consume').addEventListener('click', async () => {
    try {
      await consumeItem(id);
      toast(`${item.name} marked as consumed! 🌿`, 'success');
      overlay.remove();
    } catch { toast('Failed', 'error'); }
  });
  overlay.querySelector('#btn-discard').addEventListener('click', async () => {
    if (!confirm(`Discard ${item.name}?`)) return;
    try {
      await discardItem(id);
      toast(`${item.name} discarded`, '');
      overlay.remove();
    } catch { toast('Failed', 'error'); }
  });
  overlay.querySelector('#btn-rescue-from-detail').addEventListener('click', () => {
    overlay.remove();
    showView('rescue');
  });
}

// ── Scanner View ──────────────────────────────────────────
let scanResult = null;

viewHandlers.scanner = async function() {
  el('scanner-state-live').classList.remove('hidden');
  el('scanner-state-processing').classList.add('hidden');
  el('scanner-state-confirm').classList.add('hidden');
  el('scanner-state-error').classList.add('hidden');
  el('scanner-state-lowconf').classList.add('hidden');

  try {
    await startCamera(el('camera-video'));
  } catch (err) {
    if (err.message === 'PERMISSION_DENIED') {
      el('scanner-state-live').classList.add('hidden');
      el('scanner-state-error').classList.remove('hidden');
      el('scanner-error-msg').textContent = 'Camera access is needed to scan food labels.';
    }
  }
};

async function handleCapture() {
  const video  = el('camera-video');
  const canvas = el('camera-canvas');
  const { base64, mimeType } = captureFrame(video, canvas);

  stopCamera();
  el('scanner-state-live').classList.add('hidden');
  el('scanner-state-processing').classList.remove('hidden');

  // Animate steps
  const steps = document.querySelectorAll('.ai-step');
  steps.forEach((s, i) => setTimeout(() => {
    steps.forEach(x => x.classList.remove('active'));
    s.classList.add('active');
    for (let j = 0; j < i; j++) steps[j].classList.add('done');
  }, i * 1200));

  try {
    const result = await runScanPipeline(base64, mimeType);
    scanResult = result;

    const { valid } = validateScanResult(result);
    el('scanner-state-processing').classList.add('hidden');

    if (valid) {
      renderConfirmCard(result);
      el('scanner-state-confirm').classList.remove('hidden');
    } else {
      el('scanner-state-lowconf').classList.remove('hidden');
      const partial = result.productName ? `We found "${result.productName}" but couldn't read the date clearly.` : `We couldn't confidently read this label.`;
      el('lowconf-msg').textContent = partial;
    }
  } catch (err) {
    el('scanner-state-processing').classList.add('hidden');
    el('scanner-state-error').classList.remove('hidden');
    if (err.message === 'NO_API_KEY') {
      el('scanner-error-msg').textContent = 'Gemini API key not set. Go to Settings to add your key.';
    } else {
      el('scanner-error-msg').textContent = 'We couldn\'t analyze this food right now. Try again.';
    }
  }
}

function renderConfirmCard(result) {
  const confPct = Math.round((result.confidence || 0) * 100);
  el('confirm-product-name').textContent = result.productName || 'Unknown Product';
  el('confirm-date-type').textContent     = getDateTypeLabel(result.dateType) || 'Best Before';
  el('confirm-listed-date').textContent   = result.listedDate ? formatDate(result.listedDate) : '—';
  el('confirm-quantity').textContent      = result.quantity ? `${result.quantity} ${result.unit || ''}` : '—';
  el('confirm-category').textContent      = result.category || 'Other';
  el('confirm-emoji').textContent         = getCategoryEmoji(result.category);
  el('confidence-fill').style.width       = `${confPct}%`;
  el('confidence-label').textContent      = `${confPct}% confidence`;
}

viewHandlers['scanner-close'] = function() {
  stopCamera();
};

// ── Add / Manual Entry ────────────────────────────────────
function showAddForm(prefill = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Build category grid
  const catGrid = CATEGORIES.map(cat => `
    <div class="category-item ${prefill?.category === cat ? 'selected' : ''}" data-cat="${cat}">
      <span class="category-emoji">${getCategoryEmoji(cat)}</span>
      <span>${cat}</span>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="modal" style="max-height:92vh">
      <div class="modal-handle"></div>
      <div class="modal-title">${prefill ? '📷 Confirm & Save' : '➕ Add Food Item'}</div>
      <div class="modal-subtitle">Enter the food details below</div>

      <form id="add-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Food Name *</label>
          <input class="form-input" id="af-name" placeholder="e.g. Spinach, Milk, Tomatoes" value="${prefill?.productName || ''}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date Type</label>
            <select class="form-select" id="af-date-type">
              ${Object.entries(DATE_TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${prefill?.dateType === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Listed Date *</label>
            <input class="form-input" id="af-date" type="date" value="${prefill?.listedDate || ''}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantity</label>
            <input class="form-input" id="af-qty" type="number" placeholder="e.g. 500" value="${prefill?.quantity || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <input class="form-input" id="af-unit" placeholder="g, ml, kg, L…" value="${prefill?.unit || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Category</label>
          <div class="category-grid" id="cat-grid">${catGrid}</div>
          <input type="hidden" id="af-category" value="${prefill?.category || 'Other'}">
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary btn-full" id="af-submit">
            Add to Pantry
          </button>
          <button type="button" class="btn btn-secondary btn-full" id="af-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#af-cancel').addEventListener('click', () => overlay.remove());

  // Category picker
  overlay.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      overlay.querySelectorAll('.category-item').forEach(c => c.classList.remove('selected'));
      item.classList.add('selected');
      overlay.querySelector('#af-category').value = item.dataset.cat;
    });
  });

  overlay.querySelector('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = overlay.querySelector('#af-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    const name      = overlay.querySelector('#af-name').value.trim();
    const dateType  = overlay.querySelector('#af-date-type').value;
    const date      = overlay.querySelector('#af-date').value;
    const qty       = overlay.querySelector('#af-qty').value;
    const unit      = overlay.querySelector('#af-unit').value.trim();
    const category  = overlay.querySelector('#af-category').value || 'Other';

    if (!name || !date) {
      toast('Name and date are required', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add to Pantry';
      return;
    }

    try {
      await addItem({
        name,
        date_type:   dateType,
        listed_date: date,
        quantity:    qty ? parseFloat(qty) : null,
        unit:        unit || null,
        category,
        status:      'ACTIVE',
      });
      toast(`${name} added to pantry! 🌿`, 'success');
      overlay.remove();
    } catch (err) {
      toast('Failed to add item. Please try again.', 'error');
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add to Pantry';
    }
  });
}

// ── Rescue View ───────────────────────────────────────────
viewHandlers.rescue = function() {
  renderRescueView();
};

function renderRescueView() {
  const urgent = getUrgentPantryItems();
  el('rescue-urgent-list').innerHTML = '';
  el('rescue-recipes-list').innerHTML = '';
  el('rescue-recipes-section').classList.add('hidden');

  if (urgent.length === 0) {
    el('rescue-urgent-list').innerHTML = `
      <div class="empty-state" style="padding:var(--space-8)">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">No urgent items!</div>
        <div class="empty-state-body">All your food is fresh. Come back when items approach their listed dates.</div>
      </div>`;
    el('btn-generate-recipes').classList.add('hidden');
    return;
  }

  urgent.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'urgent-row';
    row.style.animationDelay = `${i * 60}ms`;
    row.innerHTML = `
      <div class="urgent-row-left">
        <span style="font-size:1.5rem">${item.emoji}</span>
        <div>
          <div class="urgent-row-name">${item.name}</div>
          <div class="food-card-meta">${item.dateTypeLabel}</div>
        </div>
      </div>
      <span class="badge ${item.badge.cssClass}">${item.countdown}</span>
    `;
    el('rescue-urgent-list').appendChild(row);
  });

  el('btn-generate-recipes').classList.remove('hidden');
}

async function handleGenerateRecipes() {
  const btn = el('btn-generate-recipes');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Generating recipes…';

  if (!hasGeminiKey()) {
    toast('Please add your Gemini API key in Settings first', 'warning');
    btn.disabled = false;
    btn.textContent = '🍳 Generate Recipes';
    showView('settings');
    return;
  }

  try {
    const { recipes } = await runRescue();
    el('rescue-recipes-section').classList.remove('hidden');
    el('rescue-recipes-list').innerHTML = '';

    if (recipes.length === 0) {
      el('rescue-recipes-list').innerHTML = `<div class="empty-state"><div class="empty-state-body">No recipes generated. Try again.</div></div>`;
    } else {
      recipes.forEach((r, i) => {
        const card = buildRecipeCard(r, i);
        card.style.animationDelay = `${i * 100}ms`;
        el('rescue-recipes-list').appendChild(card);
      });
    }

    btn.disabled = false;
    btn.innerHTML = '🔄 Regenerate Recipes';
    toast('Recipes generated by AI! 🤖', 'success');
  } catch (err) {
    toast(err.message === 'NO_API_KEY' ? 'Add Gemini API key in Settings' : 'Recipe generation failed. Try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '🍳 Generate Recipes';
  }
}

function buildRecipeCard(recipe, idx) {
  const card = document.createElement('div');
  card.className = 'recipe-card animate-slide-up';

  const urgentChips = (recipe.urgentIngredientsUsed || []).map(i =>
    `<span class="ingredient-chip urgent">⚠ ${i}</span>`).join('');
  const pantryChips = (recipe.pantryIngredientsUsed || []).slice(0, 3).map(i =>
    `<span class="ingredient-chip">${i}</span>`).join('');

  card.innerHTML = `
    <div class="recipe-card-header">
      <div class="recipe-emoji">${recipe.emoji || '🍽'}</div>
      <div class="recipe-card-name">${recipe.name}</div>
      <div class="recipe-rescue-reason">💡 ${recipe.rescueReason}</div>
    </div>
    <div class="recipe-card-body">
      <div class="recipe-meta">
        <div class="recipe-meta-item">⏱ ${recipe.prepTime || '20 mins'}</div>
        <div class="recipe-meta-item">👨‍🍳 ${recipe.difficulty || 'Easy'}</div>
        <div class="recipe-meta-item">🍽 ${recipe.servings || 2} servings</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-3)">
        ${urgentChips}${pantryChips}
      </div>
      <button class="btn btn-primary btn-full btn-view-recipe" data-idx="${idx}">
        View Full Recipe →
      </button>
    </div>
  `;

  card.querySelector('.btn-view-recipe').addEventListener('click', () => {
    showRecipeDetail(idx);
  });

  return card;
}

// ── Recipe Detail ─────────────────────────────────────────
function showRecipeDetail(idx) {
  const recipe = getRecipeById(idx);
  if (!recipe) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const ingredientRows = (recipe.ingredients || []).map(ing => `
    <div class="recipe-ingredient-row">
      <div class="recipe-ingredient-dot ${ing.isUrgent ? 'urgent' : ''}"></div>
      <span style="flex:1">${ing.name}</span>
      <span class="text-muted text-sm">${ing.amount}</span>
      ${ing.isUrgent ? '<span class="badge badge-use-soon" style="font-size:0.6rem">urgent</span>' : ''}
    </div>
  `).join('');

  const instructionSteps = (recipe.instructions || []).map((step, i) => `
    <div class="instruction-step">
      <div class="step-number">${i + 1}</div>
      <div class="step-text">${step}</div>
    </div>
  `).join('');

  const allUsed = [...(recipe.urgentIngredientsUsed || []), ...(recipe.pantryIngredientsUsed || [])];
  const checkboxes = allUsed.map(name => `
    <label class="checkbox-item">
      <input type="checkbox" checked class="ingredient-checkbox" data-name="${name}">
      <span>${getCategoryEmoji('Other')} ${name}</span>
    </label>
  `).join('');

  overlay.innerHTML = `
    <div class="modal" style="max-height:92vh;padding:0;overflow:hidden;border-radius:var(--radius-xl) var(--radius-xl) 0 0">
      <div style="overflow-y:auto;max-height:92vh;padding:var(--space-6)">
        <div class="modal-handle"></div>
        <div class="recipe-detail-hero">
          <span class="recipe-detail-emoji">${recipe.emoji || '🍽'}</span>
          <div class="recipe-detail-name">${recipe.name}</div>
          <div class="recipe-detail-meta">
            <div class="recipe-detail-meta-item">
              <div class="recipe-detail-meta-value">⏱ ${recipe.prepTime || '20m'}</div>
              <div class="recipe-detail-meta-label">Prep Time</div>
            </div>
            <div class="recipe-detail-meta-item">
              <div class="recipe-detail-meta-value">👨‍🍳 ${recipe.difficulty || 'Easy'}</div>
              <div class="recipe-detail-meta-label">Difficulty</div>
            </div>
            <div class="recipe-detail-meta-item">
              <div class="recipe-detail-meta-value">🍽 ${recipe.servings || 2}</div>
              <div class="recipe-detail-meta-label">Servings</div>
            </div>
          </div>
        </div>

        <div class="recipe-rescue-reason" style="margin-bottom:var(--space-5)">
          💡 ${recipe.rescueReason}
        </div>

        ${ingredientRows ? `
        <div class="recipe-section-title">🧾 Ingredients</div>
        <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-5)">
          ${ingredientRows}
        </div>` : ''}

        ${instructionSteps ? `
        <div class="recipe-section-title">👨‍🍳 Instructions</div>
        <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-5)">
          ${instructionSteps}
        </div>` : ''}

        ${checkboxes ? `
        <div class="recipe-section-title">✅ Mark What You Used</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-5)">
          ${checkboxes}
        </div>` : ''}

        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <button class="btn btn-primary btn-full" id="btn-mark-used">Mark Ingredients as Used</button>
          <button class="btn btn-ghost btn-full" id="btn-close-recipe">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#btn-close-recipe').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#btn-mark-used').addEventListener('click', async () => {
    const checked = [...overlay.querySelectorAll('.ingredient-checkbox:checked')].map(c => c.dataset.name);
    if (checked.length === 0) { toast('Select at least one ingredient', 'warning'); return; }

    const activeItems = getActiveItems();
    const toConsume   = matchRecipeIngredients({ urgentIngredientsUsed: checked, pantryIngredientsUsed: [] }, activeItems);

    try {
      for (const id of toConsume) await consumeItem(id);
      toast(`${toConsume.length} ingredient${toConsume.length !== 1 ? 's' : ''} marked as used! 🌿`, 'success');
      overlay.remove();
    } catch { toast('Failed to update pantry', 'error'); }
  });
}

// ── Impact View ───────────────────────────────────────────
viewHandlers.impact = async function() {
  const user = db.getUser();
  if (!user) return;
  try {
    const { stats, events } = await getImpactStats(user.id);
    el('impact-stat-added').textContent    = stats.added;
    el('impact-stat-consumed').textContent = stats.consumed;
    el('impact-stat-rescued').textContent  = stats.rescued;
    el('impact-stat-discarded').textContent= stats.discarded;

    // Timeline
    const timeline = el('impact-timeline');
    timeline.innerHTML = '';
    const typeIcons = { ADDED:'🌿', CONSUMED:'✅', DISCARDED:'🗑', RESCUED:'🍳', UPDATED:'✏️' };
    events.slice(0, 30).forEach((e, i) => {
      const row = document.createElement('div');
      row.className = `timeline-event stagger-${(i % 5) + 1}`;
      row.style.animationDelay = `${i * 40}ms`;
      row.innerHTML = `
        <div class="timeline-dot ${e.event_type.toLowerCase()}">
          ${typeIcons[e.event_type] || '📦'}
        </div>
        <div class="timeline-content">
          <div class="timeline-title">${e.event_type} — ${e.food_name || 'item'}</div>
          <div class="timeline-meta">${new Date(e.timestamp).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
        </div>
      `;
      timeline.appendChild(row);
    });

    if (events.length === 0) {
      timeline.innerHTML = `<div class="empty-state-body" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No activity yet. Start tracking your food!</div>`;
    }
  } catch (err) { toast('Failed to load stats', 'error'); }
};

// ── Settings View ─────────────────────────────────────────
viewHandlers.settings = function() {
  const key = getGeminiKey();
  el('gemini-key-input').value = key ? '•'.repeat(20) + key.slice(-4) : '';
  el('gemini-status').textContent = key ? '✅ Key saved' : '❌ Not set';
  el('gemini-status').style.color = key ? 'var(--color-success)' : 'var(--color-danger)';

  const user = db.getUser();
  if (user) {
    el('settings-email').textContent = user.email;
  }
};

// ── App Init ──────────────────────────────────────────────
export async function initApp(user) {
  currentUser = user;
  setUserId(user.id);
  await loadPantry();

  // Reactive re-render on pantry change
  onPantryChange(() => {
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'pantry')    renderPantry();
    if (currentView === 'rescue')    renderRescueView();
  });

  // Show dashboard by default
  showView('dashboard');
  setupEventListeners();
}

function setupEventListeners() {
  // Nav
  el('nav-home')?.addEventListener('click', () => showView('dashboard'));
  el('nav-pantry')?.addEventListener('click', () => showView('pantry'));
  el('nav-rescue')?.addEventListener('click', () => showView('rescue'));
  el('nav-impact')?.addEventListener('click', () => showView('impact'));
  el('btn-top-settings')?.addEventListener('click', () => showView('settings'));
  el('nav-scan')?.addEventListener('click', () => showScannerModal());

  // Dashboard
  el('rescue-banner')?.addEventListener('click', () => showView('rescue'));
  el('notif-banner')?.addEventListener('click', async () => {
    const perm = await requestPermission();
    if (perm === 'granted') {
      toast('Notifications enabled! 🔔', 'success');
      el('notif-banner')?.classList.add('hidden');
    } else {
      toast('Notification permission denied', 'warning');
    }
  });
  el('btn-view-all-pantry')?.addEventListener('click', () => showView('pantry'));
  el('btn-dash-add')?.addEventListener('click', () => showAddForm());

  // Pantry tabs
  document.querySelectorAll('.pantry-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pantry-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pantryTab = btn.dataset.tab;
      renderPantry();
    });
  });
  el('btn-pantry-add')?.addEventListener('click', () => showAddForm());

  // Rescue
  el('btn-generate-recipes')?.addEventListener('click', handleGenerateRecipes);

  // Settings
  el('btn-save-gemini-key')?.addEventListener('click', () => {
    const val = el('gemini-key-input').value.trim();
    if (!val || val.includes('•')) { toast('Enter your actual Gemini API key', 'warning'); return; }
    setGeminiKey(val);
    el('gemini-status').textContent = '✅ Key saved';
    el('gemini-status').style.color = 'var(--color-success)';
    el('gemini-key-input').value = '•'.repeat(20) + val.slice(-4);
    toast('Gemini API key saved! 🤖', 'success');
  });

  el('btn-clear-gemini-key')?.addEventListener('click', () => {
    localStorage.removeItem('fg_gemini_key');
    el('gemini-key-input').value = '';
    el('gemini-status').textContent = '❌ Not set';
    el('gemini-status').style.color = 'var(--color-danger)';
    toast('API key cleared', '');
  });

  el('btn-test-notif')?.addEventListener('click', async () => {
    const perm = await requestPermission();
    if (perm === 'granted') {
      const { sendTestNotification } = await import('./notifications.js');
      sendTestNotification('your pantry items');
      toast('Test notification sent!', 'success');
    } else {
      toast('Please allow notifications first', 'warning');
    }
  });

  el('btn-sign-out')?.addEventListener('click', async () => {
    if (!confirm('Sign out?')) return;
    await db.signOut();
    location.reload();
  });

  // Sign out from settings
  el('btn-sign-out-settings')?.addEventListener('click', async () => {
    if (!confirm('Sign out?')) return;
    await db.signOut();
    location.reload();
  });
}

// ── Scanner Modal ─────────────────────────────────────────
function showScannerModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'align-items:stretch;padding:0;';
  overlay.innerHTML = `
    <div class="scanner-view" style="width:100%;max-width:430px;margin:0 auto;border-radius:0">
      <!-- Live camera state -->
      <div id="scanner-state-live">
        <div class="top-nav" style="background:rgba(10,26,10,0.8);border-color:transparent;color:white;">
          <button class="top-nav-back" id="btn-scanner-close" style="background:rgba(255,255,255,0.1);color:white">✕</button>
          <div class="top-nav-title" style="color:white">Scan Food</div>
          <button class="btn btn-ghost btn-icon" id="btn-flash" style="color:white" title="Toggle flash">⚡</button>
        </div>
        <div class="camera-container">
          <video id="camera-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;flex:1;min-height:50vh"></video>
          <canvas id="camera-canvas"></canvas>
          <div class="scan-frame">
            <div class="scan-frame-tr"></div>
            <div class="scan-frame-bl"></div>
          </div>
          <div class="scan-ring"></div>
          <div class="scanner-instruction">Position the date label inside the frame</div>
        </div>
        <div class="scanner-controls">
          <label class="scanner-btn">
            <div class="scanner-btn-icon">🖼</div>
            <span>Gallery</span>
            <input type="file" id="gallery-input" accept="image/*" style="display:none">
          </label>
          <button class="capture-btn" id="btn-capture">
            <div class="capture-btn-inner"></div>
          </button>
          <button class="scanner-btn" id="btn-manual-scanner">
            <div class="scanner-btn-icon">✏️</div>
            <span>Manual</span>
          </button>
        </div>
      </div>

      <!-- Processing state -->
      <div id="scanner-state-processing" class="hidden" style="flex:1;display:flex;align-items:center;justify-content:center;background:#0A1A0A;min-height:100%">
        <div class="ai-processing">
          <div class="ai-processing-icon">🤖</div>
          <div style="color:white;font-weight:600;font-size:1.1rem">Analyzing your food…</div>
          <div class="ai-processing-steps">
            <div class="ai-step active"><div class="ai-step-dot"></div>Reading the label…</div>
            <div class="ai-step"><div class="ai-step-dot"></div>Detecting the date…</div>
            <div class="ai-step"><div class="ai-step-dot"></div>Identifying the product…</div>
            <div class="ai-step"><div class="ai-step-dot"></div>Preparing results…</div>
          </div>
        </div>
      </div>

      <!-- Confirm state -->
      <div id="scanner-state-confirm" class="hidden" style="background:var(--color-bg);padding:var(--space-6);overflow-y:auto;flex:1">
        <button class="top-nav-back" id="btn-scan-again" style="margin-bottom:var(--space-4)">← Scan Again</button>
        <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-muted);margin-bottom:var(--space-4)">
          We found this
        </div>
        <div class="confirm-card">
          <div class="confirm-header">
            <div class="confirm-food-emoji" id="confirm-emoji">🥛</div>
            <div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:4px">Product</div>
              <div id="confirm-product-name" style="font-size:var(--font-size-xl);font-weight:800;color:var(--color-text-primary)">Milk</div>
            </div>
          </div>
          <div class="confirm-rows">
            <div>
              <div class="confirm-label">Date Type</div>
              <div class="confirm-value" id="confirm-date-type">Best Before</div>
            </div>
            <div>
              <div class="confirm-label">Listed Date</div>
              <div class="confirm-value" id="confirm-listed-date">Aug 24, 2026</div>
            </div>
            <div>
              <div class="confirm-label">Quantity</div>
              <div class="confirm-value" id="confirm-quantity">500 ml</div>
            </div>
            <div>
              <div class="confirm-label">Category</div>
              <div class="confirm-value" id="confirm-category">Dairy</div>
            </div>
          </div>
          <div style="margin-top:var(--space-4)">
            <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:4px">
              <span>AI Confidence</span>
              <span id="confidence-label">96%</span>
            </div>
            <div class="confidence-bar">
              <div class="confidence-fill" id="confidence-fill" style="width:96%"></div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <button class="btn btn-primary btn-full" id="btn-confirm-add">✅ Add to Pantry</button>
          <button class="btn btn-secondary btn-full" id="btn-confirm-edit">✏️ Edit Details</button>
        </div>
      </div>

      <!-- Low confidence state -->
      <div id="scanner-state-lowconf" class="hidden" style="background:var(--color-bg);padding:var(--space-6);flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Couldn't read clearly</div>
          <div class="empty-state-body" id="lowconf-msg">We couldn't confidently read the date. Try scanning again with better lighting.</div>
          <button class="btn btn-primary" id="btn-try-again">Scan Again</button>
          <button class="btn btn-secondary" id="btn-enter-manually-lowconf">Enter Manually</button>
        </div>
      </div>

      <!-- Error state -->
      <div id="scanner-state-error" class="hidden" style="background:var(--color-bg);padding:var(--space-6);flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Something went wrong</div>
          <div class="empty-state-body" id="scanner-error-msg">We couldn't read that label. Try again.</div>
          <button class="btn btn-primary" id="btn-try-again-err">Try Again</button>
          <button class="btn btn-secondary" id="btn-enter-manually-err">Enter Manually</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => { stopCamera(); overlay.remove(); };

  overlay.querySelector('#btn-scanner-close').addEventListener('click', close);
  overlay.querySelector('#btn-capture').addEventListener('click', handleCapture);

  overlay.querySelector('#btn-flash').addEventListener('click', async () => {
    const on = await toggleFlash();
    overlay.querySelector('#btn-flash').style.color = on ? 'yellow' : 'white';
  });

  overlay.querySelector('#gallery-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { base64, mimeType } = await captureFromFile(file);
    stopCamera();
    el('scanner-state-live').classList.add('hidden');
    el('scanner-state-processing').classList.remove('hidden');
    try {
      const result = await runScanPipeline(base64, mimeType);
      scanResult = result;
      const { valid } = validateScanResult(result);
      el('scanner-state-processing').classList.add('hidden');
      if (valid) {
        renderConfirmCard(result);
        el('scanner-state-confirm').classList.remove('hidden');
      } else {
        el('scanner-state-lowconf').classList.remove('hidden');
      }
    } catch {
      el('scanner-state-processing').classList.add('hidden');
      el('scanner-state-error').classList.remove('hidden');
    }
  });

  overlay.querySelector('#btn-manual-scanner').addEventListener('click', () => { close(); showAddForm(); });
  overlay.querySelector('#btn-scan-again').addEventListener('click', () => {
    el('scanner-state-confirm').classList.add('hidden');
    el('scanner-state-live').classList.remove('hidden');
    startCamera(el('camera-video'));
  });
  overlay.querySelector('#btn-try-again').addEventListener('click', () => {
    el('scanner-state-lowconf').classList.add('hidden');
    el('scanner-state-live').classList.remove('hidden');
    startCamera(el('camera-video'));
  });
  overlay.querySelector('#btn-try-again-err').addEventListener('click', () => {
    el('scanner-state-error').classList.add('hidden');
    el('scanner-state-live').classList.remove('hidden');
    startCamera(el('camera-video'));
  });
  overlay.querySelector('#btn-enter-manually-lowconf').addEventListener('click', () => {
    close();
    showAddForm(scanResult);
  });
  overlay.querySelector('#btn-enter-manually-err').addEventListener('click', () => { close(); showAddForm(); });

  overlay.querySelector('#btn-confirm-add').addEventListener('click', async () => {
    if (!scanResult) return;
    try {
      await addItem({
        name:        scanResult.productName,
        date_type:   scanResult.dateType || 'BEST_BEFORE',
        listed_date: scanResult.listedDate,
        quantity:    scanResult.quantity,
        unit:        scanResult.unit,
        category:    scanResult.category || 'Other',
        status:      'ACTIVE',
      });
      toast(`${scanResult.productName} added to pantry! 🌿`, 'success');
      close();
    } catch { toast('Failed to add item', 'error'); }
  });

  overlay.querySelector('#btn-confirm-edit').addEventListener('click', () => {
    close();
    showAddForm(scanResult ? {
      productName: scanResult.productName,
      dateType:    scanResult.dateType,
      listedDate:  scanResult.listedDate,
      quantity:    scanResult.quantity,
      unit:        scanResult.unit,
      category:    scanResult.category,
    } : null);
  });

  // Start camera
  startCamera(el('camera-video')).catch(() => {
    el('scanner-state-live').classList.add('hidden');
    el('scanner-state-error').classList.remove('hidden');
    el('scanner-error-msg').textContent = 'Camera access is needed to scan food labels.';
  });
}

// Expose global app interface
window.app = { showScan: showScannerModal, showView, showAddForm };
