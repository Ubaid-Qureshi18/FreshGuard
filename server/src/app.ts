import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth.routes';
import { foodsRoutes } from './routes/foods.routes';
import { scanRoutes } from './routes/scan.routes';
import { recipesRoutes } from './routes/recipes.routes';
import { notificationsRoutes } from './routes/notifications.routes';
import { statsRoutes } from './routes/stats.routes';
import { aiRoutes } from './routes/ai.routes';

const app = express();

// ── Security & Middleware ─────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Managed by frontend
}));

// Permissive CORS for seamless local and Vercel serverless execution
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Health Check (Dual Mount for local & Vercel serverless) ───────
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    ai: process.env.GEMINI_API_KEY ? 'configured' : 'not configured (fallbacks active)',
    db: process.env.SUPABASE_URL ? 'configured' : 'not configured',
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ── Routes (Dual Mount to support both /api/path and stripped /path in Vercel serverless) ──
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/foods', '/foods'], foodsRoutes);
app.use(['/api/scan', '/scan'], scanRoutes);
app.use(['/api/recipes', '/recipes'], recipesRoutes);
app.use(['/api/notifications', '/notifications'], notificationsRoutes);
app.use(['/api/stats', '/stats'], statsRoutes);
app.use(['/api/ai', '/ai'], aiRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
