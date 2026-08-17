import { useState, useEffect } from 'react';
import { foods as foodsApi } from '../services/api';
import { getLocalFoods, addLocalFood } from '../services/localStore';
import type { FoodItem } from '../types';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Trash2, Check, Sparkles, AlertTriangle, Store, Share2 } from 'lucide-react';

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
      return saved ? JSON.parse(saved) : [
        { id: 's1', name: 'Whole Milk 1L', category: 'Dairy', quantity: '1 L', checked: false },
        { id: 's2', name: 'Free Range Eggs', category: 'Eggs', quantity: '6 pcs', checked: false },
        { id: 's3', name: 'Fresh Spinach', category: 'Vegetables', quantity: '100 g', checked: true },
      ];
    } catch {
      return [];
    }
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Vegetables');
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; pantryCount: number } | null>(null);
  const [storeMode, setStoreMode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('fg_shopping_list', JSON.stringify(items));
    } catch {}
  }, [items]);

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

    // DUPLICATE PURCHASE PROTECTION CHECK
    const activePantry = getLocalFoods().filter(f => f.status === 'ACTIVE');
    const existingPantryMatch = activePantry.filter(f => f.name.toLowerCase().includes(newItemName.trim().toLowerCase()));

    if (existingPantryMatch.length > 0) {
      setDuplicateWarning({ name: newItemName.trim(), pantryCount: existingPantryMatch.length });
      return;
    }

    commitAddItem(newItemName.trim());
  };

  const commitAddItem = (name: string) => {
    const item: ShoppingItem = {
      id: `shop_${Date.now()}`,
      name,
      category: newItemCategory,
      quantity: '1 pack',
      checked: false,
    };
    setItems(prev => [item, ...prev]);
    setNewItemName('');
    setDuplicateWarning(null);
    toast.success(`${item.name} added to grocery list`);
  };

  const toggleCheck = (id: string) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const nextState = !i.checked;
        if (nextState) {
          // SHOPPING -> PANTRY CONVERSION
          toast.success(`Added ${i.name} directly to digital pantry! 🌿`, { duration: 3000 });
          addLocalFood({
            name: i.name,
            category: (i.category as any) || 'Groceries',
            quantity: 1,
            unit: 'pack',
            date_type: 'BEST_BEFORE',
            listed_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            source: 'MANUAL',
            storage_location: 'FRIDGE',
          });
        }
        return { ...i, checked: nextState };
      }
      return i;
    }));
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingCart size={24} className="text-emerald-700" /> Smart Groceries
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Restock smart & prevent duplicate grocery purchases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyListAsText}
            className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl"
            title="Copy list text"
          >
            <Share2 size={15} />
          </button>
          <button
            onClick={() => setStoreMode(!storeMode)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              storeMode ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <Store size={14} /> {storeMode ? 'Exit Store Mode' : 'Store Mode'}
          </button>
          <button
            onClick={handleAutoSuggest}
            className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles size={13} className="text-emerald-600" /> Restock AI
          </button>
        </div>
      </div>

      {/* STORE MODE PROGRESS BANNER */}
      {storeMode && (
        <div className="p-4 rounded-3xl bg-emerald-900 text-white flex items-center justify-between shadow-lg shadow-emerald-900/20">
          <div>
            <div className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">STORE SHOPPING MODE</div>
            <div className="text-base font-black mt-0.5">{checkedCount} of {items.length} Purchased</div>
          </div>
          <div className="w-24 h-2 bg-emerald-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* DUPLICATE PURCHASE PROTECTION MODAL */}
      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
            <AlertTriangle size={16} className="text-amber-600" /> Duplicate Purchase Protection
          </div>
          <p className="text-xs text-amber-800 font-medium">
            You already have <strong>{duplicateWarning.pantryCount} item(s)</strong> of "{duplicateWarning.name}" in your active pantry inventory. Are you sure you want to add it anyway?
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => commitAddItem(duplicateWarning.name)}
              className="btn-primary text-xs py-1.5 px-3 font-bold"
            >
              Add Anyway
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-emerald-500 bg-white"
        >
          <option value="Vegetables">Vegetables</option>
          <option value="Fruits">Fruits</option>
          <option value="Dairy">Dairy</option>
          <option value="Protein">Protein</option>
          <option value="Bakery">Bakery</option>
          <option value="Groceries">Groceries</option>
        </select>
        <button type="submit" className="btn-primary p-2.5 text-xs shrink-0 font-bold">
          <Plus size={16} />
        </button>
      </form>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-xs">
            <div className="text-3xl mb-2">🛒</div>
            <div className="font-bold text-gray-900 text-sm">Your shopping list is empty</div>
            <p className="text-xs text-gray-400 mt-0.5">Use Restock AI or add items to plan your groceries.</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`fresh-card p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                item.checked ? 'bg-emerald-50/40 border-emerald-200 opacity-70' : 'bg-white hover:border-emerald-300'
              } ${storeMode ? 'py-4' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                }`}>
                  {item.checked && <Check size={14} />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {item.category} • {item.quantity}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                className="p-2 text-gray-300 hover:text-red-600 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {checkedCount > 0 && (
        <div className="flex justify-end">
          <button onClick={clearChecked} className="text-xs text-gray-400 hover:text-red-600 font-medium">
            Clear {checkedCount} completed items
          </button>
        </div>
      )}
    </div>
  );
}
