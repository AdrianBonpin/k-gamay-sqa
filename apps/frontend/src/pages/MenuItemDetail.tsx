import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMenu } from '@/api/menu';
import { fetchRatings } from '@/api/ratings';
import { useCartStore } from '@/store/cartStore';
import { useAsyncResource } from '@/lib/useAsyncResource';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Stars } from '@/components/Stars';
import { formatDate, formatMoney } from '@/lib/utils';

export function MenuItemDetail() {
  const { id } = useParams();
  const menuId = Number(id);
  const valid = Number.isInteger(menuId) && menuId > 0;
  const addToCart = useCartStore((s) => s.add);

  const {
    data: items,
    error: menuError,
    loading: menuLoading,
  } = useAsyncResource((_signal) => getMenu(), []);

  const { data: ratingsData, loading: ratingsLoading } = useAsyncResource(
    (_signal) => (valid ? fetchRatings(menuId) : Promise.resolve(null)),
    [menuId, valid],
  );

  const item = useMemo(() => {
    if (!items) return null;
    return items.find((i) => i.id === menuId) ?? null;
  }, [items, menuId]);

  if (!valid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-accent-charcoal/60">Invalid menu item.</p>
        <Link to="/menu" className="btn btn-primary btn-size-md mt-4">
          Back to menu
        </Link>
      </div>
    );
  }

  if (menuLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <LoadingSpinner size="lg" label="Loading item…" />
      </div>
    );
  }

  if (menuError || !item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
          <p className="font-semibold">Item not found</p>
          <p className="text-sm mt-1">{menuError ?? 'We could not find that menu item.'}</p>
          <Link to="/menu" className="btn btn-primary btn-size-md mt-4">
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  const summary = ratingsData?.summary ?? item.rating ?? { menuId, average: 0, count: 0 };
  const reviews = ratingsData?.ratings ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-10">
      <Link
        to="/menu"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-charcoal/60 hover:text-brand-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to menu
      </Link>

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 mb-10">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-surface-muted shadow-soft">
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="badge bg-brand-50 text-brand-700 self-start">{item.category}</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-3">{item.name}</h1>
          <p className="mt-3 text-accent-charcoal/70 text-pretty">{item.description}</p>
          <div className="mt-5 flex items-center gap-3">
            <Stars value={summary.average} size="lg" />
            <span className="font-semibold text-accent-charcoal">
              {summary.count > 0 ? summary.average.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-accent-charcoal/60">
              ({summary.count} review{summary.count === 1 ? '' : 's'})
            </span>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="font-display text-4xl text-brand-600">{formatMoney(item.price)}</span>
            <button
              type="button"
              onClick={() => {
                addToCart(item);
                toast.success(`${item.name} added to cart`);
              }}
              className="btn btn-primary btn-size-lg"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-2xl font-bold">Reviews</h2>
        </div>
        {ratingsLoading ? (
          <LoadingSpinner size="sm" label="Loading reviews…" />
        ) : reviews.length === 0 ? (
          <p className="text-accent-charcoal/60 text-sm">
            No reviews yet — be the first after your next delivery!
          </p>
        ) : (
          <ul className="divide-y divide-accent-charcoal/5">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 font-semibold">
                    {(r.userName ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-accent-charcoal text-sm">
                      {r.userName ?? 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Stars value={r.stars} size="sm" />
                      <span className="text-xs text-accent-charcoal/50">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {r.review && (
                  <p className="mt-2 ml-12 text-sm text-accent-charcoal/80 text-pretty">
                    {r.review}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
