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
const PORT = Number(process.env.PORT) || 4000;

// ── Security & Middleware ─────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Managed by frontend
}));

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:4173', // Vite preview
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    ai: process.env.GEMINI_API_KEY ? 'configured' : 'not configured (fallbacks active)',
    db: process.env.SUPABASE_URL ? 'configured' : 'not configured',
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  if (err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ── Graceful Shutdown ─────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🌿 FreshGuard API  →  http://localhost:${PORT}/api/health`);
  console.log(`   Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️  Not set — using intelligent fallbacks'}`);
  console.log(`   Supabase:  ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
});

process.on('SIGTERM', () => {
  console.log('\n📌 SIGTERM received. Closing server...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
