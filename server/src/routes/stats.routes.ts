import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { listUserEvents, listUserFoods } from '../services/db/store.service';

const router = Router();
router.use(requireAuth);

// GET /api/stats — rich food waste impact stats + live pantry summary
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [events, allFoods] = await Promise.all([
      listUserEvents(req.userJwt!, req.user!.id),
      listUserFoods(req.userJwt!, req.user!.id, 'ALL'),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeFoods = allFoods.filter(f => f.status === 'ACTIVE');

    const stats = {
      added:          events.filter(e => e.event_type === 'ADDED').length,
      consumed:       events.filter(e => e.event_type === 'CONSUMED').length,
      rescued:        events.filter(e => e.event_type === 'RESCUED').length,
      discarded:      events.filter(e => e.event_type === 'DISCARDED').length,
      // Live pantry breakdown
      total:          activeFoods.length,
      expiredCount:   activeFoods.filter(f => {
        const d = new Date(f.listed_date + 'T00:00:00');
        return Math.round((d.getTime() - today.getTime()) / 86400000) < 0;
      }).length,
      urgentCount:    activeFoods.filter(f => {
        const d = new Date(f.listed_date + 'T00:00:00');
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        return diff >= 0 && diff <= 1;
      }).length,
      warningCount:   activeFoods.filter(f => {
        const d = new Date(f.listed_date + 'T00:00:00');
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        return diff >= 2 && diff <= 3;
      }).length,
      freshCount:     activeFoods.filter(f => {
        const d = new Date(f.listed_date + 'T00:00:00');
        return Math.round((d.getTime() - today.getTime()) / 86400000) > 3;
      }).length,
      avgHealthScore: activeFoods.length > 0
        ? Math.round(activeFoods.filter(f => f.health_score).reduce((s, f) => s + (f.health_score || 0), 0) / Math.max(activeFoods.filter(f => f.health_score).length, 1))
        : 0,
      // Category breakdown
      categoryBreakdown: activeFoods.reduce<Record<string, number>>((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({ stats, recentEvents: events.slice(0, 30) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stats calculation failed';
    res.status(500).json({ error: msg });
  }
});

export { router as statsRoutes };
