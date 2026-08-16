import type { EnrichedFood } from '../types';
import { formatQuantity, getStatusCss } from '../utils/freshness';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flame } from 'lucide-react';

interface FoodCardProps {
  food: EnrichedFood;
  onQuickConsume?: (id: string) => void;
  compact?: boolean;
}

const LOCATION_ICONS: Record<string, string> = {
  FRIDGE: '🧊',
  FREEZER: '❄️',
  PANTRY: '🥫',
  COUNTER: '🍎',
};

export default function FoodCard({ food, onQuickConsume, compact = false }: FoodCardProps) {
  const navigate = useNavigate();
  const statusCss = getStatusCss(food.freshnessStatus);
  const locationIcon = LOCATION_ICONS[food.storage_location || 'FRIDGE'] || '🧊';

  return (
    <div
      className="fresh-card flex items-center gap-3 px-4 py-3.5 cursor-pointer group"
      onClick={() => navigate(`/food/${food.id}`)}
    >
      {/* Emoji container with subtle bg */}
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform border border-gray-100">
        {food.emoji}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-gray-900 text-sm truncate group-hover:text-emerald-900 transition-colors">
            {food.name}
          </div>
          {food.nutrition?.calories ? (
            <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100 flex items-center gap-0.5 shrink-0">
              <Flame size={10} className="text-orange-500" />
              {food.nutrition.calories} kcal
            </span>
          ) : null}
        </div>

        {!compact && (
          <div className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
            <span>{formatQuantity(food) || '1 pack'}</span>
            <span>·</span>
            <span>{food.category}</span>
            <span>·</span>
            <span>{locationIcon}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCss}`}>
            {food.statusLabel}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">{food.countdown}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onQuickConsume && food.freshnessStatus !== 'fresh' && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickConsume(food.id); }}
            className="text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded-xl transition-colors border border-emerald-200"
          >
            ✓ Consumed
          </button>
        )}
        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
      </div>
    </div>
  );
}
