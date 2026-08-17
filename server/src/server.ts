import app from './app';

const PORT = Number(process.env.PORT) || 4000;

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
