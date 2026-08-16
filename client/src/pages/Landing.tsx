import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scan, Bell, ChefHat, TrendingDown, ArrowRight, Check } from 'lucide-react';

const features = [
  {
    icon: Scan, title: 'Smart Scanning',
    desc: 'Point your camera at any food package. AI reads the label and extracts the date instantly.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Bell, title: 'Expiry Reminders',
    desc: 'Get notified 7, 3, and 1 day before food reaches its listed date. Never be surprised.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ChefHat, title: 'AI Recipe Rescue',
    desc: 'When food needs attention, FreshGuard generates real recipes using your actual ingredients.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: TrendingDown, title: 'Waste Tracking',
    desc: 'See exactly how much food you save. Every consumed item counts toward your impact.',
    color: 'bg-green-50 text-green-600',
  },
];

const steps = [
  { num: '01', title: 'Scan', desc: 'Point camera at food label' },
  { num: '02', title: 'Track', desc: 'Food added to your pantry' },
  { num: '03', title: 'Use First', desc: 'Prioritized by urgency' },
  { num: '04', title: 'Rescue', desc: 'AI recipes from expiring food' },
];

const demoFoods = [
  { emoji: '🥬', name: 'Spinach', days: 1, status: 'Use Soon', statusCss: 'text-orange-600 bg-orange-50' },
  { emoji: '🥛', name: 'Milk', days: 2, status: 'Use Soon', statusCss: 'text-orange-600 bg-orange-50' },
  { emoji: '🍅', name: 'Tomatoes', days: 3, status: 'Use Soon', statusCss: 'text-orange-600 bg-orange-50' },
  { emoji: '🥚', name: 'Eggs', days: 8, status: 'Fresh', statusCss: 'text-green-600 bg-green-50' },
  { emoji: '🌾', name: 'Rice', days: 36, status: 'Fresh', statusCss: 'text-green-600 bg-green-50' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white text-base">🌿</div>
            <span className="font-bold text-gray-900 text-lg">FreshGuard</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm">Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              AI-Powered Food Tracking
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              Never let good<br />
              <span className="text-green-600">food go to waste.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              FreshGuard scans, tracks and prioritizes your food, then helps you turn ingredients that need attention into meals.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => navigate('/register')}
                className="btn-primary flex items-center gap-2 text-base px-6 py-3"
              >
                Start Tracking Free <ArrowRight size={18} />
              </button>
              <button
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary text-base px-6 py-3"
              >
                See How It Works
              </button>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              {['Free to use', 'No credit card', 'Works offline'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check size={14} className="text-green-500" />
                  {t}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌿</span>
                  <span className="font-bold text-gray-900">FreshGuard</span>
                </div>
                <div className="text-sm text-gray-400 mb-3">Good evening 👋 Here's your pantry</div>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { n: 18, l: 'Foods' },
                    { n: 3, l: 'Use Soon' },
                    { n: 1, l: 'Today' },
                    { n: 0, l: 'Past Date' },
                  ].map(s => (
                    <div key={s.l} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-xl font-bold text-gray-900">{s.n}</div>
                      <div className="text-xs text-gray-400">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use First */}
              <div className="px-5 py-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">USE FIRST</div>
                <div className="space-y-2.5">
                  {demoFoods.slice(0, 3).map(food => (
                    <div key={food.name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="text-2xl">{food.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-sm">{food.name}</div>
                        <div className="text-xs text-gray-400">Best Before · {food.days} day{food.days > 1 ? 's' : ''} left</div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${food.statusCss}`}>
                        {food.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rescue banner */}
                <div className="mt-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-sm">🍳 Rescue My Food</div>
                    <div className="text-orange-100 text-xs mt-0.5">3 ingredients need attention</div>
                  </div>
                  <span className="text-2xl">🔥</span>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-2.5 border border-gray-100"
            >
              <div className="text-xs font-bold text-gray-800">AI Recipe Generated</div>
              <div className="text-xs text-green-600 font-semibold mt-0.5">🥗 Spinach Omelette</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything your pantry needs
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From scanning to cooking, FreshGuard handles the full lifecycle of your food.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              The FreshGuard loop
            </h2>
            <p className="text-gray-500 text-lg">Four simple steps to cut food waste at home.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-black text-green-100 mb-2">{s.num}</div>
                <div className="font-bold text-gray-900 text-lg mb-1">{s.title}</div>
                <div className="text-sm text-gray-500">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-green-600 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Know what you have.<br />Use what needs attention.<br />Waste less.
          </h2>
          <p className="text-green-100 text-lg mb-8">Join thousands of households reducing food waste with FreshGuard.</p>
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-green-700 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-green-50 transition-colors shadow-lg"
          >
            Start Tracking — It's Free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span>🌿</span>
            <span>FreshGuard — Part of NutriMind AI</span>
          </div>
          <div>© 2026 FreshGuard. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
