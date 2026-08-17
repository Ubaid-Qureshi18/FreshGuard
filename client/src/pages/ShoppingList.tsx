import { useState, useEffect } from 'react';
import { foods as foodsApi } from '../services/api';
import type { FoodItem } from '../types';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Trash2, Check, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  checked: boolean;
  autoSuggested?: boolean;
}

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem('fg_shopping_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Vegetables');

  useEffect(() => {
    try {
      localStorage.setItem('fg_shopping_list', JSON.stringify(items));
    } catch {}
  }, [items]);

  // Auto-generate restock suggestions from consumed items
  const handleAutoSuggest = async () => {
    try {
      const { data } = await foodsApi.list('CONSUMED');
      const consumed = Array.isArray(data) ? data : [];
      if (consumed.length === 0) {
        toast('No consumed items found for restock suggestions yet.', { icon: '🛒' });
        return;
      }

      const existingNames = new Set(items.map(i => i.name.toLowerCase()));
      const suggestions: ShoppingItem[] = [];

      consumed.forEach((food: FoodItem) => {
        if (!existingNames.has(food.name.toLowerCase())) {
          existingNames.add(food.name.toLowerCase());
          suggestions.push({
            id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: food.name,
            category: food.category || 'Groceries',
            quantity: '1 pack',
            checked: false,
            autoSuggested: true,
          });
        }
      });

      if (suggestions.length > 0) {
        setItems(prev => [...suggestions, ...prev]);
        toast.success(`Added ${suggestions.length} restock suggestions based on consumed items! 🛒`);
      } else {
        toast('All consumed items are already in your shopping list!', { icon: '✨' });
      }
    } catch {
      toast.error('Could not generate restock suggestions');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const item: ShoppingItem = {
      id: `shop_${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: '1 pack',
      checked: false,
    };
    setItems(prev => [item, ...prev]);
    setNewItemName('');
    toast.success(`${item.name} added to shopping list`);
  };

  const toggleCheck = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    setItems(prev => prev.filter(i => !i.checked));
    toast.success('Cleared completed items!');
  };

  const copyListAsText = () => {
    if (items.length === 0) {
      toast.error('Shopping list is empty');
      return;
    }
    const text = items
      .map(i => `${i.checked ? '[x]' : '[ ]'} ${i.name} (${i.category})`)
      .join('\n');
    navigator.clipboard.writeText(`🛒 FreshGuard Grocery Shopping List:\n\n${text}`);
    toast.success('Shopping list copied to clipboard! 📋');
  };

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingCart size={24} className="text-emerald-700" /> Smart Shopping List
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Restock smart & prevent duplicate grocery purchases</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyListAsText}
            className="btn-ghost p-2 text-gray-600 hover:text-gray-900"
            title="Copy list text"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handleAutoSuggest}
            className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles size={13} className="text-emerald-600" /> Restock AI
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="fresh-card p-3 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Add grocery item (e.g. Avocado, Whole Milk)..."
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
        <select
          value={newItemCategory}
          onChange={e => setNewItemCategory(e.target.value)}
          className="form-select text-xs py-2.5 px-3 w-28 shrink-0"
        >
          {['Vegetables', 'Dairy', 'Meat', 'Fruits', 'Bread', 'Beverages', 'Snacks', 'Other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1 shrink-0">
          <Plus size={15} /> Add
        </button>
      </form>

      {/* Progress Bar & Actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-100/80 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">{checkedCount} / {items.length} items checked</span>
          </div>
          {checkedCount > 0 && (
            <button onClick={clearChecked} className="text-emerald-800 font-bold hover:underline">
              Clear Completed
            </button>
          )}
        </div>
      )}

      {/* Shopping List Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3">
            🛒
          </div>
          <div className="font-bold text-gray-800 text-sm">Your shopping list is empty</div>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto mb-4">
            Add items manually above or tap <strong>Restock AI</strong> to auto-suggest items you've consumed!
          </p>
          <button onClick={handleAutoSuggest} className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5">
            <Sparkles size={14} /> Generate Restock Suggestions
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`fresh-card flex items-center justify-between p-3.5 transition-all cursor-pointer ${
                  item.checked ? 'bg-gray-50/80 opacity-60' : 'bg-white'
                }`}
                onClick={() => toggleCheck(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    item.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {item.checked && <Check size={12} />}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <span>{item.category}</span>
                      {item.autoSuggested && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 rounded">
                          AI Restock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
