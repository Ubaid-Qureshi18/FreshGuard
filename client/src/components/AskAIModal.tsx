import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalFoods, getLocalStats } from '../services/localStore';
import { Sparkles, X, Send, Bot, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

const QUICK_PROMPTS = [
  'What should I cook tonight?',
  'What should I use first?',
  'What do I need to buy?',
  'How to use my leftovers?',
  'What nutrients am I getting today?',
];

export default function AskAIModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'ai',
      text: "Hello! I'm your FreshGuard AI Kitchen Coach. I can analyze your active pantry stock, expiry dates, and shopping habits to help you cook, buy, or rescue food.",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  if (!isOpen) return null;

  const handleSend = (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text) return;

    const userMsg: Message = { id: `u_${Date.now()}`, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setThinking(true);

    const foods = getLocalFoods();
    const stats = getLocalStats();
    const urgent = foods.filter(f => f.status === 'ACTIVE').sort((a, b) => new Date(a.listed_date).getTime() - new Date(b.listed_date).getTime());

    setTimeout(() => {
      let reply = "";
      let actionUrl: string | undefined = undefined;
      let actionLabel: string | undefined = undefined;

      const q = text.toLowerCase();
      if (q.includes('cook') || q.includes('tonight') || q.includes('recipe')) {
        const top = urgent[0];
        if (top) {
          reply = `Based on your pantry, **${top.name}** requires immediate attention! You can make a delicious **${top.name} Zero-Waste Bowl** using ${foods.slice(0, 3).map(f => f.name).join(', ')}.`;
          actionUrl = '/rescue';
          actionLabel = 'View Rescue Recipes';
        } else {
          reply = "Your pantry is looking fresh! You can explore quick high-protein recipes or create a custom meal.";
          actionUrl = '/rescue';
          actionLabel = 'Generate Recipes';
        }
      } else if (q.includes('use first') || q.includes('expire') || q.includes('attention')) {
        if (urgent.length > 0) {
          reply = `You have ${urgent.length} items requiring attention today. Top item: **${urgent[0].name}** (Listed Date: ${urgent[0].listed_date}).`;
          actionUrl = '/pantry';
          actionLabel = 'Go to Pantry';
        } else {
          reply = "All items in your digital pantry are fresh and well within their shelf-life dates!";
        }
      } else if (q.includes('buy') || q.includes('shopping') || q.includes('grocery')) {
        reply = `You currently have ${stats.urgentCount} items needing attention and ${stats.total} total items. You might need fresh milk and leafy greens based on your weekly consumption patterns.`;
        actionUrl = '/shopping';
        actionLabel = 'Open Shopping List';
      } else if (q.includes('leftover')) {
        reply = "Got leftovers? Enter leftover cooked rice, chicken, or vegetables in Leftover Rescue Mode to transform them into fried rice or patties!";
        actionUrl = '/rescue';
        actionLabel = 'Open Leftover Rescue';
      } else {
        reply = `FreshGuard Insights: You have ${stats.freshCount} fresh items in your fridge and ${stats.urgentCount} items near listed dates. Would you like to cook a rescue meal or check your shopping list?`;
        actionUrl = '/dashboard';
        actionLabel = 'View Dashboard';
      }

      setMessages(prev => [
        ...prev,
        { id: `ai_${Date.now()}`, sender: 'ai', text: reply, actionUrl, actionLabel },
      ]);
      setThinking(false);
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[560px] border border-gray-100"
        >
          {/* Top Bar */}
          <div className="p-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot size={20} className="text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">Ask FreshGuard AI</h3>
                <p className="text-[10px] text-emerald-200 font-medium">Real-time Kitchen & Pantry Coach</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages List */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 mt-1">
                    🌿
                  </div>
                )}
                <div className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-800 text-white rounded-tr-none font-medium'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-2xs rounded-tl-none font-medium'
                }`}>
                  <p>{m.text}</p>
                  {m.actionUrl && (
                    <button
                      onClick={() => { onClose(); navigate(m.actionUrl!); }}
                      className="mt-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      {m.actionLabel} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0">
                  🌿
                </div>
                <div className="p-3 bg-white text-gray-400 rounded-2xl text-xs border border-gray-100 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-600 animate-spin" /> Analyzing your pantry data…
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-white border-t border-gray-100 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSend(qp)}
                className="text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-900 px-2.5 py-1 rounded-xl whitespace-nowrap transition-colors border border-gray-200/60 shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask about pantry, recipes, groceries, or nutrition…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-medium outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || thinking}
              className="btn-primary p-2.5 rounded-2xl shrink-0 font-bold"
            >
              <Send size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
