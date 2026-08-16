import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import {
  listUserNotifications,
  listUserFoods,
  addNotification,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/db/store.service';

const router = Router();
router.use(requireAuth);

// GET /api/notifications — list with food item details
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await listUserNotifications(req.userJwt!, req.user!.id);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list notifications';
    res.status(500).json({ error: msg });
  }
});

// POST /api/notifications/check-alarms — scan pantry and create alarm notifications
router.post('/check-alarms', async (req: AuthRequest, res: Response) => {
  try {
    const foods = await listUserFoods(req.userJwt!, req.user!.id, 'ACTIVE');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let urgentCount = 0;
    let warningCount = 0;
    const urgentFoods: typeof foods = [];
    const warningFoods: typeof foods = [];

    const existingNotifs = await listUserNotifications(req.userJwt!, req.user!.id);
    const yesterdayISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    for (const food of foods) {
      if (!food.notification_enabled) continue;

      const listed = new Date(food.listed_date + 'T00:00:00');
      const diffDays = Math.round((listed.getTime() - today.getTime()) / 86400000);

      if (diffDays <= 1) { urgentCount++; urgentFoods.push(food); }
      else if (diffDays <= 3) { warningCount++; warningFoods.push(food); }

      let notifType = '';
      let title = '';
      let message = '';
      let severity = 'NORMAL';

      if (diffDays < 0) {
        notifType = 'EXPIRED';
        title = `🚨 ${food.name} has passed its listed date`;
        message = `${food.name} was listed as best before ${food.listed_date}. Inspect for safety or discard.`;
        severity = 'CRITICAL';
      } else if (diffDays === 0) {
        notifType = 'URGENT';
        title = `🚨 ${food.name} expires TODAY`;
        message = `Use ${food.name} today — cook or freeze it immediately to prevent waste.`;
        severity = 'CRITICAL';
      } else if (diffDays === 1) {
        notifType = 'URGENT';
        title = `⚠️ ${food.name} expires tomorrow`;
        message = `${food.name} has 1 day left. Plan a meal or freeze it tonight.`;
        severity = 'HIGH';
      } else if (diffDays <= 3) {
        notifType = 'REMINDER';
        title = `🔔 ${food.name} expires in ${diffDays} days`;
        message = `Use ${food.name} within the next ${diffDays} days to avoid waste.`;
        severity = 'MEDIUM';
      }

      if (notifType) {
        const hasRecent = existingNotifs.some(n =>
          n.food_id === food.id &&
          n.type === notifType &&
          n.created_at >= yesterdayISO
        );

        if (!hasRecent) {
          await addNotification(req.userJwt!, req.user!.id, {
            food_id: food.id,
            title,
            message,
            type: notifType,
            severity,
            due_date: food.listed_date,
          });
        }
      }
    }

    res.json({ urgentCount, warningCount, urgentFoods, warningFoods });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Alarm check failed';
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/notifications/read-all — mark all notifications read
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await markAllNotificationsRead(req.userJwt!, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Mark read-all failed';
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/notifications/:id/read — mark single notification read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await markNotificationRead(req.userJwt!, req.user!.id, id);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Mark read failed';
    res.status(500).json({ error: msg });
  }
});

export { router as notificationsRoutes };
