import { useDeferredValue, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMenu } from '@/api/menu';
import { useCartStore } from '@/store/cartStore';
import { MenuCard } from '@/components/MenuCard';
import { CategoryChips } from '@/components/CategoryChips';
import { MenuCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/lib/useAsyncResource';

export function Menu() {
  const { data: items, error, loading } = useAsyncResource((_signal) => getMenu(), []);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [params, setParams] = useSearchParams();
  const activeCat = params.get('cat') ?? 'All';
  const sort = params.get('sort') ?? 'default';
  const addToCart = useCartStore((s) => s.add);

  const safeItems = useMemo(() => items ?? [], [items]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    safeItems.forEach((i) => set.add(i.category));
    return ['All', ...Array.from(set).sort()];
  }, [safeItems]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const list = safeItems.filter((it) => {
      if (activeCat !== 'All' && it.category !== activeCat) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      );
    });
    if (sort === 'top') {
      return [...list].sort((a, b) => {
        const ar = a.rating?.average ?? 0;
        const br = b.rating?.average ?? 0;
        if (br !== ar) return br - ar;
        const ac = a.rating?.count ?? 0;
        const bc = b.rating?.count ?? 0;
        return bc - ac;
      });
    }
    return list;
  }, [safeItems, activeCat, deferredSearch, sort]);

  const setCat = (cat: string) => {
    const next = new URLSearchParams(params);
    if (cat === 'All') next.delete('cat');
    else next.set('cat', cat);
    setParams(next, { replace: true });
  };

  const toggleTopSort = () => {
    const next = new URLSearchParams(params);
    if (sort === 'top') next.delete('sort');
    else next.set('sort', 'top');
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 md:py-14">
      <header className="mb-8 md:mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Our menu</h1>
        <p className="mt-2 text-accent-charcoal/60 text-pretty max-w-xl">
          From comfort classics to chef&apos;s specials — pick what you&apos;re in the mood for.
        </p>
      </header>

      <div className="sticky top-16 md:top-20 z-20 -mx-4 px-4 md:mx-0 md:px-0 py-4 mb-6 bg-surface/80 backdrop-blur-lg border-b border-accent-charcoal/5">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
          <label className="relative flex-1 max-w-xl" aria-label="Search menu">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-charcoal/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, ingredients, cravings…"
              className="input pl-11"
            />
          </label>
          <div className="hidden md:flex items-center gap-2 text-xs text-accent-charcoal/50">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              Showing <span className="font-bold text-accent-charcoal">{filtered.length}</span> of{' '}
              {safeItems.length}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CategoryChips categories={categories} active={activeCat} onChange={setCat} />
          <button
            type="button"
            onClick={toggleTopSort}
            aria-pressed={sort === 'top'}
            className={
              sort === 'top'
                ? 'badge bg-brand-500 text-white border-brand-500'
                : 'badge bg-white text-accent-charcoal border-accent-charcoal/15 hover:bg-surface-muted'
            }
          >
            ⭐ Top rated
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700 mb-6" role="alert">
          <p className="font-semibold">Couldn&apos;t load the menu.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" strokeWidth={2.2} />}
          title="No matches"
          description="Try a different search, or clear the filter to see everything we've got."
          action={
            <button
              onClick={() => {
                setSearch('');
                setCat('All');
              }}
              className="btn btn-primary btn-size-md"
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 menu-stagger">
          {filtered.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              onAdd={(m) => {
                addToCart(m);
                toast.success(`${m.name} added to cart`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
