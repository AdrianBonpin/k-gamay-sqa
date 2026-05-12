import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Stars } from './Stars';
import type { MenuItem } from '@/types';
import { formatMoney } from '@/lib/utils';

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuCard({ item, onAdd }: Props) {
  const r = item.rating;
  const hasRatings = !!(r && r.count > 0);
  return (
    <article className="group card overflow-hidden p-0 flex flex-col hover:shadow-lift transition-all duration-300 hover:-translate-y-1 animate-fadein">
      <Link
        to={`/menu/${item.id}`}
        className="relative aspect-[4/3] overflow-hidden bg-surface-muted block"
        aria-label={`View details for ${item.name}`}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 badge bg-white/90 backdrop-blur text-accent-charcoal shadow-soft">
          {item.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/menu/${item.id}`} className="hover:text-brand-600 transition-colors">
          <h3 className="font-display text-xl text-accent-charcoal leading-tight mb-1.5">
            {item.name}
          </h3>
        </Link>
        <p className="text-sm text-accent-charcoal/60 line-clamp-2 mb-4 flex-1 text-pretty">
          {item.description}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl text-brand-600">{formatMoney(item.price)}</span>
            {hasRatings && r && (
              <span className="inline-flex items-center gap-1.5 text-xs text-accent-charcoal/60">
                <Stars value={Number(r.average)} size="sm" />
                <span className="font-medium">
                  {Number(r.average).toFixed(1)} · {r.count}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={() => onAdd(item)}
            aria-label={`Add ${item.name} to cart`}
            className="btn btn-primary btn-size-sm group-hover:scale-105"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
