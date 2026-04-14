import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemT } from '@/types';
import { classNames, formatMoney } from '@/lib/utils';

interface Props {
  item: CartItemT;
  onInc: (menuId: number) => void;
  onDec: (menuId: number) => void;
  onRemove: (menuId: number) => void;
}

export function CartItem({ item, onInc, onDec, onRemove }: Props) {
  const decDisabled = item.qty === 1;
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-accent-charcoal/5">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-20 w-20 rounded-xl object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-accent-charcoal truncate">{item.name}</h4>
        <p className="text-sm text-accent-charcoal/60">{formatMoney(item.price)} each</p>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent-charcoal/10 bg-surface-soft p-1">
          <button
            onClick={() => !decDisabled && onDec(item.menuId)}
            aria-label={`Decrease ${item.name} quantity`}
            aria-disabled={decDisabled}
            disabled={decDisabled}
            className={classNames(
              'h-7 w-7 rounded-full bg-white grid place-items-center transition',
              decDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-muted',
            )}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[1.75rem] text-center text-sm font-semibold">{item.qty}</span>
          <button
            onClick={() => onInc(item.menuId)}
            aria-label={`Increase ${item.name} quantity`}
            className="h-7 w-7 rounded-full bg-brand-500 text-white grid place-items-center hover:bg-brand-600 transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg text-accent-charcoal">
          {formatMoney(item.price * item.qty)}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.menuId)}
          aria-label={`Remove ${item.name}`}
          className="mt-2 inline-flex items-center justify-center text-accent-charcoal/40 hover:text-brand-600 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
