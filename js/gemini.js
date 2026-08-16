// js/gemini.js — Google Gemini AI Integration
// Vision (scanner) + Recipe generation

import { getGeminiKey, GEMINI_MODEL } from './config.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Core Gemini API call.
 */
async function geminiRequest(parts, temperature = 0.3) {
  const key = getGeminiKey();
  if (!key) throw new Error('NO_API_KEY');

  const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  try {
    // Strip markdown fences if present
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error('Gemini returned invalid JSON: ' + text.slice(0, 100));
  }
}

// ── Scanner: Extract Food Info from Image ─────────────────

const SCAN_PROMPT = `You are a food label OCR expert. Analyze this food packaging image and extract structured information.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "productName": "string (the food/product name)",
  "dateType": "BEST_BEFORE" | "USE_BY" | "EXPIRY",
  "listedDate": "YYYY-MM-DD (ISO format)",
  "quantity": number | null,
  "unit": "string (g, ml, kg, L, oz, etc) or null",
  "category": "one of: Dairy, Meat, Seafood, Vegetables, Fruits, Bread, Beverages, Condiments, Snacks, Frozen, Eggs, Grains, Leftovers, Other",
  "confidence": number (0 to 1, how confident you are in the extraction),
  "rawDateText": "string (the date text exactly as seen on packaging)",
  "notes": "string (any important info) or null"
}

Rules:
- If you cannot read the date clearly, set listedDate to null and confidence below 0.6
- Parse date formats like: 24/08/2026, 24-08-2026, 24 Aug 2026, August 24 2026, 08/2026, etc.
- For month/year only (e.g. 08/2026), use the last day of that month
- Be strict about date type: BEST_BEFORE for "BB"/"Best Before", USE_BY for "Use By", EXPIRY for "Exp"/"Expiry"/"EXP"
- If no date is visible, set both listedDate and confidence to null`;

/**
 * Analyze a food label image using Gemini Vision.
 * @param {string} base64Image — base64-encoded image (without data: prefix)
 * @param {string} mimeType — e.g. 'image/jpeg'
 */
export async function analyzeFoodLabel(base64Image, mimeType = 'image/jpeg') {
  const result = await geminiRequest([
    { text: SCAN_PROMPT },
    {
      inline_data: {
        mime_type: mimeType,
        data: base64Image,
      },
    },
  ], 0.1);
  return result;
}

// ── Recipe Generation ─────────────────────────────────────

/**
 * Generate rescue recipes from pantry context.
 * @param {Array} urgentItems — items closest to expiry
 * @param {Array} availableItems — rest of the pantry
 */
export async function generateRecipes(urgentItems, availableItems) {
  const urgentNames   = urgentItems.map(i => `${i.name} (${i.days === 0 ? 'expires today' : i.days + ' days left'})`).join(', ');
  const availNames    = availableItems.map(i => i.name).join(', ');

  const prompt = `You are FreshGuard's AI chef. Generate 3 practical recipes that prioritize using ingredients closest to expiry.

URGENT ingredients (must use at least one per recipe, prioritize these):
${urgentNames}

AVAILABLE pantry ingredients (use as supporting ingredients):
${availNames}

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "emoji": "single food emoji",
      "prepTime": "e.g. 15 mins",
      "difficulty": "Easy | Medium | Hard",
      "rescueReason": "short sentence explaining why this uses urgent ingredients wisely",
      "urgentIngredientsUsed": ["ingredient1", "ingredient2"],
      "pantryIngredientsUsed": ["ingredient3", "ingredient4"],
      "extraIngredients": ["any ingredient not in pantry, keep minimal"],
      "ingredients": [
        { "name": "ingredient", "amount": "quantity", "isUrgent": true/false }
      ],
      "instructions": [
        "Step 1 text",
        "Step 2 text"
      ],
      "servings": 2
    }
  ]
}

Rules:
- Each recipe MUST use at least one urgent ingredient
- Rank recipes: most urgent ingredients used first
- Keep recipes practical and achievable at home
- Prefer using more pantry items over buying new ones
- Instructions should be clear and numbered (3-6 steps)
- Return exactly 3 recipes`;

  const result = await geminiRequest([{ text: prompt }], 0.7);
  return result.recipes || [];
}
