import { useState } from 'react';
import { ai as aiApi, foods as foodsApi } from '../services/api';
import type { ParsedGroceryItem } from '../types';
import { CATEGORIES, CATEGORY_EMOJIS } from '../utils/freshness';
import toast from 'react-hot-toast';
import { Sparkles, X, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AIQuickAddModal({ isOpen, onClose, onSuccess }: AIQuickAddModalProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ParsedGroceryItem[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  if (!isOpen) return null;

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Please enter groceries or paste a list');
      return;
    }
    setParsing(true);
    try {
      const { data } = await aiApi.parseText(text);
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        setStep('review');
        toast.success(`AI parsed ${data.items.length} items! 🌿`);
      } else {
        toast.error('Could not detect grocery items. Try phrasing like "2L Milk, 500g Chicken, 6 Eggs"');
      }
    } catch {
      toast.error('AI parsing failed. Please check connection.');
    } finally {
      setParsing(false);
    }
  };

  const handleSaveAll = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      await foodsApi.batchAdd(items as unknown as Record<string, unknown>[]);
      toast.success(`Added ${items.length} items to pantry! 🎉`);
      onSuccess();
      handleClose();
    } catch {
      toast.error('Failed to save items to pantry');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, key: keyof ParsedGroceryItem, val: unknown) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, [key]: val } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClose = () => {
    setText('');
    setItems([]);
    setStep('input');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-md shadow-green-600/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">AI Smart Quick-Add</h2>
              <p className="text-xs text-gray-500">Type or paste any grocery list — AI organizes everything</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.form
                key="input-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleParse}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Enter your grocery items or receipt text:
                  </label>
                  <textarea
                    rows={5}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="e.g. Bought 2L oat milk expiring Sunday, 500g chicken breast use by Nov 20, 6 organic eggs, 1 bag baby spinach in fridge"
                    className="form-input text-sm p-3.5 leading-relaxed resize-none"
                    autoFocus
                  />
                </div>

                <div className="bg-green-50/70 border border-green-200/60 rounded-2xl p-4 text-xs text-gray-600 space-y-1.5">
                  <div className="font-bold text-green-800 flex items-center gap-1.5">
                    <Sparkles size={13} /> AI will automatically extract:
                  </div>
                  <ul className="list-disc pl-4 text-green-700/90 space-y-0.5">
                    <li>Product names, quantities, and units</li>
                    <li>Estimated or specified expiration dates</li>
                    <li>Category & optimal storage locations (Fridge, Freezer, Pantry)</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  {[
                    '2L Milk, 500g Chicken, 1 loaf Sourdough bread',
                    'Spinach, 3 Avocados, Greek Yogurt, Cheddar cheese',
                  ].map(example => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setText(example)}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors text-left truncate max-w-[50%]"
                    >
                      💡 {example}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={handleClose} className="btn-secondary text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={parsing || !text.trim()}
                    className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-green-600/20"
                  >
                    {parsing ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        AI is Parsing…
                      </>
                    ) : (
                      <>
                        Parse with AI <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="review-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Review & edit items before adding ({items.length} detected):</span>
                  <button
                    onClick={() => setStep('input')}
                    className="text-green-600 font-semibold hover:underline"
                  >
                    ← Edit text
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white transition-all shadow-xs"
                    >
                      <span className="text-2xl">{CATEGORY_EMOJIS[item.category] || '📦'}</span>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Name */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          className="form-input text-xs font-semibold py-1.5 px-2.5"
                          placeholder="Food name"
                        />

                        {/* Category */}
                        <select
                          value={item.category}
                          onChange={e => updateItem(idx, 'category', e.target.value)}
                          className="form-select text-xs py-1.5 px-2"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        {/* Date */}
                        <input
                          type="date"
                          value={item.listedDate}
                          onChange={e => updateItem(idx, 'listedDate', e.target.value)}
                          className="form-input text-xs py-1.5 px-2.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setItems(prev => [
                        ...prev,
                        {
                          name: 'New Item',
                          category: 'Vegetables',
                          quantity: 1,
                          unit: 'pack',
                          dateType: 'BEST_BEFORE',
                          listedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                          storageLocation: 'FRIDGE',
                        },
                      ]);
                    }}
                    className="btn-ghost text-xs flex items-center gap-1.5 text-green-700 font-semibold"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="btn-secondary text-xs py-2 px-3"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={saving || items.length === 0}
                      onClick={handleSaveAll}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md shadow-green-600/20"
                    >
                      <CheckCircle2 size={14} />
                      {saving ? 'Adding to Pantry…' : `Save ${items.length} Items`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
