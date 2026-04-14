import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, Phone, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { placeOrder } from '@/api/orders';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatMoney } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { extractError } from '@/api/client';

interface LocationState {
  promoCode?: string;
}

export function Checkout() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const promoCode = (state as LocationState | null)?.promoCode;
  const { items, subtotal, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name ?? '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ id: number; total: number } | null>(null);

  useEffect(() => {
    if (!confirmed && items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, confirmed, navigate]);

  const sub = subtotal();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !phone.trim()) {
      toast.error('Please fill out every field');
      return;
    }
    setSubmitting(true);
    try {
      const res = await placeOrder({
        items: items.map((it) => ({ menuId: it.menuId, qty: it.qty })),
        promoCode,
        delivery: {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
        },
      });
      // Server-confirmed total (use cents if provided, else dollars).
      const serverTotal = typeof res.totalCents === 'number' ? res.totalCents / 100 : res.total;
      setConfirmed({ id: res.orderId, total: serverTotal });
      clear();
      toast.success('Order placed!');
    } catch (err) {
      toast.error(extractError(err, 'Failed to place order'));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:px-8 py-16 text-center">
        <div className="success-check mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-hero text-white shadow-glow">
          {/* Animated SVG checkmark: stroke-dasharray reveal */}
          <svg
            viewBox="0 0 64 64"
            className="h-20 w-20"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="32" cy="32" r="26" />
            <path d="M20 33 L29 42 L45 24" />
          </svg>
        </div>
        <div className="animate-fadein" style={{ animationDelay: '180ms' }}>
          <h1 className="mt-8 font-display text-5xl font-bold">Order placed!</h1>
          <p className="mt-3 text-accent-charcoal/60 text-lg text-pretty">
            Thanks, {name.split(' ')[0]}. Your food is being prepped and will be on its way soon.
          </p>
          <div className="mt-8 card inline-flex flex-col sm:flex-row gap-4 sm:gap-10 px-8 py-6 text-left">
            <div>
              <p className="text-xs uppercase tracking-wide text-accent-charcoal/50">Order #</p>
              <p className="font-display text-2xl font-bold">#{confirmed.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent-charcoal/50">Total</p>
              <p className="font-display text-2xl font-bold text-brand-600">
                {formatMoney(confirmed.total)}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/orders/${confirmed.id}`} className="btn btn-primary btn-size-lg">
              Track my order
            </Link>
            <Link to="/menu" className="btn btn-ghost btn-size-lg">
              Order more
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-10">
      <h1 className="font-display text-4xl md:text-5xl font-bold">Checkout</h1>
      <p className="mt-2 text-accent-charcoal/60">
        Almost there — one more step and dinner&apos;s on its way.
      </p>

      <form onSubmit={submit} className="mt-8 grid lg:grid-cols-[1fr_22rem] gap-8">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-2xl font-bold mb-4">Delivery details</h2>
            <div className="space-y-4">
              <Input
                label="Recipient name"
                name="name"
                required
                leftIcon={<UserIcon className="h-4 w-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Who should we hand it to?"
              />
              <Input
                label="Delivery address"
                name="address"
                required
                leftIcon={<MapPin className="h-4 w-4" />}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Apt 4B, City"
              />
              <Input
                label="Phone number"
                type="tel"
                name="phone"
                required
                leftIcon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-2xl font-bold mb-4">Payment</h2>
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-accent-charcoal/70">
              This is a coursework demo — no payment is charged. Your order will be recorded and
              delivered as pending in the system.
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 self-start card p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">Order summary</h2>
          <ul className="divide-y divide-accent-charcoal/5">
            {items.map((it) => (
              <li key={it.menuId} className="flex items-center gap-3 py-3">
                <img
                  src={it.imageUrl}
                  alt={it.name}
                  className="h-12 w-12 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.name}</p>
                  <p className="text-xs text-accent-charcoal/60">× {it.qty}</p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-accent-charcoal/5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-accent-charcoal/70">Subtotal</span>
              <span className="font-semibold">{formatMoney(sub)}</span>
            </div>
            {promoCode && (
              <div className="flex justify-between">
                <span className="text-accent-charcoal/70">Promo</span>
                <span className="font-semibold text-brand-600">{promoCode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-accent-charcoal/70">Delivery</span>
              <span className="font-semibold text-accent-forest">Free</span>
            </div>
          </div>

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            <Home className="h-4 w-4" />
            Place order
          </Button>
        </aside>
      </form>
    </div>
  );
}
