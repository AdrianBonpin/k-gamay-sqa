import { useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface Props {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
  ariaLabel?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function Stars({ value, size = 'md', interactive = false, onChange, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const rounded = Math.round(display);
  const sizeClass = SIZE_MAP[size];

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, Math.max(1, Math.round(value || 0)) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, Math.round(value || 0) - 1));
    } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault();
      onChange(Number(e.key));
    }
  };

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel ?? `Rating: ${value} out of 5`}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={handleKey}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= rounded;
        const star = (
          <Star
            className={classNames(
              sizeClass,
              filled ? 'text-amber-400 fill-amber-400' : 'text-accent-charcoal/20',
              interactive && 'transition-transform',
            )}
            strokeWidth={2}
          />
        );
        if (!interactive) {
          return (
            <span key={i} data-testid={`star-${i}`} data-filled={filled ? 'true' : 'false'}>
              {star}
            </span>
          );
        }
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === rounded}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            data-testid={`star-${i}`}
            data-filled={filled ? 'true' : 'false'}
            onClick={() => onChange?.(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="cursor-pointer p-0.5 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
