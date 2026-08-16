import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { generateRecipes } from '../services/ai/gemini.service';
import { listUserFoods, logFoodEvent } from '../services/db/store.service';

const router = Router();
router.use(requireAuth);

// POST /api/recipes/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { selectedIngredientIds } = req.body;

    // Get active foods
    const foods = await listUserFoods(req.userJwt!, req.user!.id, 'ACTIVE');

    if (!foods || foods.length === 0) {
      res.status(400).json({ error: 'No active foods in pantry to generate recipes from.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute days remaining for each food
    const enriched = foods.map(f => {
      const listed = new Date(f.listed_date);
      listed.setHours(0, 0, 0, 0);
      const days = Math.round((listed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: f.id,
        name: f.name,
        days,
        quantity: f.quantity !== null ? f.quantity : undefined,
        unit: f.unit || undefined,
      };
    });

    // Determine urgent items — use selected if provided, otherwise auto-detect (≤3 days)
    let urgentItems = enriched.filter(f =>
      selectedIngredientIds?.length
        ? selectedIngredientIds.includes(f.id)
        : f.days <= 3
    );

    if (urgentItems.length === 0) urgentItems = enriched.slice(0, 3);

    const urgentIds = new Set(urgentItems.map(f => f.id));
    const availableItems = enriched.filter(f => !urgentIds.has(f.id));

    const recipes = await generateRecipes(urgentItems, availableItems);

    // Log rescue events
    for (const item of urgentItems) {
      await logFoodEvent(req.userJwt!, req.user!.id, item.id, 'RESCUED', item.name);
    }

    res.json({ recipes, urgentItems, availableCount: availableItems.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recipe generation failed';
    if (message.includes('GEMINI_API_KEY')) {
      res.status(503).json({ error: message, code: 'NO_API_KEY' });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export { router as recipesRoutes };
