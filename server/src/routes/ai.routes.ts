import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import {
  parseNaturalLanguageGroceries,
  getStorageAdvice,
  generateMealPlan
} from '../services/ai/gemini.service';
import { listUserFoods } from '../services/db/store.service';

const router = Router();
router.use(requireAuth);

// POST /api/ai/parse-text — parse natural language / receipt text
router.post('/parse-text', async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Text input is required' });
    return;
  }

  try {
    const items = await parseNaturalLanguageGroceries(text);
    res.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Parsing failed';
    res.status(500).json({ error: msg });
  }
});

// POST /api/ai/storage-advice — get specific food storage tips
router.post('/storage-advice', async (req: AuthRequest, res: Response) => {
  const { foodName, category, location } = req.body;
  if (!foodName) {
    res.status(400).json({ error: 'Food name is required' });
    return;
  }

  try {
    const advice = await getStorageAdvice(foodName, category || 'Other', location || 'FRIDGE');
    res.json(advice);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Advice generation failed';
    res.status(500).json({ error: msg });
  }
});

// POST /api/ai/meal-plan — generate 3-day meal plan from pantry items
router.post('/meal-plan', async (req: AuthRequest, res: Response) => {
  try {
    const foods = await listUserFoods(req.userJwt!, req.user!.id, 'ACTIVE');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pantryItems = foods.map(f => {
      const listed = new Date(f.listed_date);
      listed.setHours(0, 0, 0, 0);
      const days = Math.round((listed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { name: f.name, category: f.category, days };
    });

    const plan = await generateMealPlan(pantryItems);
    res.json({ plan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Meal plan generation failed';
    res.status(500).json({ error: msg });
  }
});

export { router as aiRoutes };
