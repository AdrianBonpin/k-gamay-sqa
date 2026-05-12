import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import { validatePromo } from '@/api/orders';
import { fetchActivePromos } from '@/api/promo';
import type { PromoCode } from '@/types';
import { formatMoney as formatCents, applyDiscountCents } from '@/lib/money';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { extractError } from '@/api/client';

export function Cart() {
  const navigate = useNavigate();
  const { items, updateQty, remove, clear, subtotalCents } = useCartStore();
  const subCents = subtotalCents();
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [activePromos, setActivePromos] = useState<PromoCode[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchActivePromos(ctrl.signal)
      .then(setActivePromos)
      .catch(() => {
        // Silent: hints are decorative.
      });
    return () => ctrl.abort();
  }, []);

  const totalCents = applied ? applyDiscountCents(subCents, applied.discount) : subCents;
  const discountCents = subCents - totalCents;

  const apply = async () => {
    const code = promo.trim();
    if (!code) return;
    setChecking(true);
    try {
      const res = await validatePromo(code);
      if (!res.valid || !res.code) {
        toast.error('Invalid promo code');
        setApplied(null);
        return;
      }
      setApplied({ code: res.code, discount: res.discount });
      toast.success(`${res.code} applied. ${Math.round(res.discount * 100)}% off`);
    } catch (err) {
      toast.error(extractError(err, 'Could not validate code'));
    } finally {
      setChecking(false);
    }
  };

  const removeCode = () => {
    setApplied(null);
    setPromo('');
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-16">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" strokeWidth={2.2} />}
          title="Your cart is empty"
          description="Start browsing and add your favorites. They'll show up here and travel with you to checkout."
          action={
            <Link to="/menu" className="btn btn-primary btn-size-lg">
              Browse the menu <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Your cart</h1>
          <p className="mt-2 text-accent-charcoal/60">
            {items.length} {items.length === 1 ? 'item' : 'items'} ready to go.
          </p>
        </div>
        <button
          onClick={() => {
            clear();
            toast.success('Cart cleared');
          }}
          className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-accent-charcoal/60 hover:text-brand-600 transition"
        >
          <Trash2 className="h-4 w-4" />
          Clear all
        </button>
      </header>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-8">
        <div className="space-y-3 animate-fadein">
          {items.map((it) => (
            <CartItem
              key={it.menuId}
              item={it}
              onInc={(id) => updateQty(id, it.qty + 1)}
              onDec={(id) => updateQty(id, it.qty - 1)}
              onRemove={remove}
            />
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 self-start card p-6 space-y-5">
          <h2 className="font-display text-2xl font-bold">Summary</h2>

          <div>
            <label
              htmlFor="promo"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-accent-charcoal/70"
            >
              Promo code
            </label>
            {applied ? (
              <div className="flex items-center justify-between rounded-2xl bg-brand-50 border border-brand-500/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-brand-600" />
                  <span className="font-semibold text-brand-700">{applied.code}</span>
                  <span className="text-xs text-brand-600">
                    {Math.round(applied.discount * 100)}% off
                  </span>
                </div>
                <button
                  onClick={removeCode}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="promo"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && apply()}
                  placeholder="e.g. WELCOME"
                  className="input"
                  autoCapitalize="characters"
                />
                <Button variant="secondary" onClick={apply} loading={checking}>
                  Apply
                </Button>
              </div>
            )}
            {activePromos.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-accent-charcoal/55">
                {activePromos.map((p) => (
                  <li key={p.code}>
                    Try <span className="font-semibold text-accent-charcoal">{p.code}</span> (
                    {Math.round(p.discount * 100)}% off
                    {p.firstOrderOnly ? ', first order only' : ''})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 text-sm border-t border-accent-charcoal/5 pt-4">
            <Row label="Subtotal" value={formatCents(subCents)} />
            {discountCents > 0 && (
              <Row
                label={`Discount (${applied?.code})`}
                value={`−${formatCents(discountCents)}`}
                accent
              />
            )}
            <Row label="Delivery" value="Free" subtle />
            <div className="border-t border-accent-charcoal/5 pt-3 mt-2" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-display text-3xl font-bold text-accent-charcoal">
                {formatCents(totalCents)}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              navigate('/checkout', {
                state: { promoCode: applied?.code },
              })
            }
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Link
            to="/menu"
            className="block text-center text-sm font-semibold text-accent-charcoal/60 hover:text-brand-600"
          >
            ← Keep browsing
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  subtle,
}: {
  label: string;
  value: string;
  accent?: boolean;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={subtle ? 'text-accent-charcoal/50' : 'text-accent-charcoal/70'}>
        {label}
      </span>
      <span
        className={
          accent
            ? 'font-semibold text-brand-600'
            : subtle
              ? 'text-accent-forest font-semibold'
              : 'font-semibold text-accent-charcoal'
        }
      >
        {value}
      </span>
    </div>
  );
}
