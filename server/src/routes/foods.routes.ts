import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import {
  listUserFoods,
  getUserFoodById,
  addFoodItem,
  batchAddFoodItems,
  updateFoodItem,
  consumeFoodItem,
  discardFoodItem,
  deleteFoodItem
} from '../services/db/store.service';

const router = Router();
router.use(requireAuth);

// GET /api/foods — list user's foods
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'ACTIVE';
    const data = await listUserFoods(req.userJwt!, req.user!.id, status);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list foods';
    res.status(500).json({ error: msg });
  }
});

// GET /api/foods/:id — get food item by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const food = await getUserFoodById(req.userJwt!, req.user!.id, id);
    if (!food) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json(food);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get food item';
    res.status(500).json({ error: msg });
  }
});

// POST /api/foods — add food manually
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, category, quantity, unit, date_type, listed_date, notification_enabled, image_url, storage_location, storage_tip, notes, nutrition, health_score, health_tags, allergens } = req.body;

  if (!name || !listed_date) {
    res.status(400).json({ error: 'Name and listed date are required' });
    return;
  }

  try {
    const food = await addFoodItem(req.userJwt!, req.user!.id, {
      name,
      category: category || 'Other',
      quantity: quantity ? Number(quantity) : null,
      unit: unit || null,
      date_type: date_type || 'BEST_BEFORE',
      listed_date,
      notification_enabled: notification_enabled !== false,
      image_url: image_url || null,
      storage_location: storage_location || 'FRIDGE',
      storage_tip: storage_tip || null,
      notes: notes || null,
      nutrition: nutrition || null,
      health_score: health_score || null,
      health_tags: health_tags || null,
      allergens: allergens || null,
    });
    res.status(201).json(food);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create food item';
    res.status(500).json({ error: msg });
  }
});

// POST /api/foods/batch — batch add foods from AI scanner or quick add
router.post('/batch', async (req: AuthRequest, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Array of items is required' });
    return;
  }

  try {
    const added = await batchAddFoodItems(req.userJwt!, req.user!.id, items);
    res.status(201).json(added);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Batch add failed';
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/foods/:id — update food item details
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await updateFoodItem(req.userJwt!, req.user!.id, id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/foods/:id/quantity — quick update quantity
router.patch('/:id/quantity', async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body;
  if (quantity === undefined) {
    res.status(400).json({ error: 'Quantity is required' });
    return;
  }

  try {
    const id = req.params.id as string;
    const updated = await updateFoodItem(req.userJwt!, req.user!.id, id, { quantity: Number(quantity) });
    if (!updated) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update quantity failed';
    res.status(500).json({ error: msg });
  }
});

// POST /api/foods/:id/consume — mark food as consumed
router.post('/:id/consume', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const consumed = await consumeFoodItem(req.userJwt!, req.user!.id, id);
    if (!consumed) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json(consumed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Consume failed';
    res.status(500).json({ error: msg });
  }
});

// POST /api/foods/:id/discard — mark food as discarded
router.post('/:id/discard', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const discarded = await discardFoodItem(req.userJwt!, req.user!.id, id);
    if (!discarded) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json(discarded);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Discard failed';
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/foods/:id — delete food item permanently
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteFoodItem(req.userJwt!, req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Food item not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    res.status(500).json({ error: msg });
  }
});

export { router as foodsRoutes };
