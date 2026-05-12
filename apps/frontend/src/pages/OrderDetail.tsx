import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChefHat, Clock, MapPin, Package } from 'lucide-react';
import { getOrder } from '@/api/orders';
import type { OrderStatus } from '@/types';
import { classNames, formatDate, formatMoney } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsyncResource } from '@/lib/useAsyncResource';
import { RateItem } from '@/components/RateItem';

const STEPS: readonly OrderStatus[] = ['pending', 'in_progress', 'delivered'] as const;

const STEP_META: Record<OrderStatus, { label: string; description: string; icon: typeof Package }> =
  {
    pending: {
      label: 'Order received',
      description: "We've got your order and sent it to the kitchen.",
      icon: Package,
    },
    in_progress: {
      label: 'Being prepared',
      description: 'Our chefs are cooking it up, fresh and fast.',
      icon: ChefHat,
    },
    delivered: {
      label: 'Delivered',
      description: 'Enjoy your meal! Tap reorder next time.',
      icon: CheckCircle2,
    },
  };

function statusIndex(s: OrderStatus | string): number {
  const idx = STEPS.indexOf(s as OrderStatus);
  return idx === -1 ? 0 : idx;
}

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const validId = Number.isInteger(orderId) && orderId > 0;

  useEffect(() => {
    if (!validId) navigate('/orders', { replace: true });
  }, [validId, navigate]);

  const {
    data: order,
    error,
    refetch,
  } = useAsyncResource(
    (_signal) => (validId ? getOrder(orderId) : Promise.reject(new Error('invalid id'))),
    [orderId, validId],
  );

  // Live polling: refetch every 2s until the order is delivered.
  useEffect(() => {
    if (!order) return;
    if (order.status === 'delivered') return;
    const t = setInterval(() => refetch(), 2_000);
    return () => clearInterval(t);
  }, [order, refetch]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
          <p className="font-semibold">Couldn&apos;t load order.</p>
          <p className="text-sm mt-1">{error}</p>
          <Link to="/orders" className="btn btn-primary btn-size-md mt-4">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <LoadingSpinner size="lg" label="Loading order…" />
      </div>
    );
  }

  const currentIdx = statusIndex(order.status);
  const isLive = order.status !== 'delivered';

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-10">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-charcoal/60 hover:text-brand-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All orders
      </Link>

      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-wide text-accent-charcoal/50">Order</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold">#{order.id}</h1>
          <p className="mt-2 text-accent-charcoal/60 inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} size="md" />
          {isLive && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-forest"
              aria-live="polite"
            >
              <span className="live-dot" aria-hidden />
              Live
            </span>
          )}
        </div>
      </header>

      {/* TIMELINE */}
      <section className="card p-6 md:p-8 mb-6">
        <h2 className="font-display text-2xl font-bold mb-6">Delivery tracking</h2>
        <ol className="relative grid md:grid-cols-3 gap-6 md:gap-0">
          {STEPS.map((stepKey, i) => {
            const meta = STEP_META[stepKey];
            const Icon = meta.icon;
            const reached = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <li key={stepKey} className="relative flex md:flex-col gap-4 md:gap-3 md:text-center">
                {i < STEPS.length - 1 && (
                  <span
                    className={classNames(
                      'hidden md:block absolute top-6 left-[calc(50%+1.75rem)] right-[calc(-50%+1.75rem)] h-0.5',
                      i < currentIdx ? 'bg-brand-500' : 'bg-accent-charcoal/10',
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={classNames(
                    'relative z-10 grid h-12 w-12 md:mx-auto place-items-center rounded-full shrink-0 transition-colors animate-fadein',
                    reached
                      ? 'bg-gradient-hero text-white shadow-glow'
                      : 'bg-surface-muted text-accent-charcoal/40',
                  )}
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping-slow" />
                  )}
                </div>
                <div>
                  <p
                    className={classNames(
                      'font-semibold',
                      reached ? 'text-accent-charcoal' : 'text-accent-charcoal/50',
                    )}
                  >
                    {meta.label}
                  </p>
                  <p className="text-sm text-accent-charcoal/60 mt-0.5">{meta.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-6">
        <section className="card p-6">
          <h2 className="font-display text-2xl font-bold mb-4">Items ordered</h2>
          <ul className="divide-y divide-accent-charcoal/5">
            {order.items.map((it) => (
              <li key={it.id} className="py-4">
                <div className="flex items-center gap-4">
                  <img
                    src={it.imageUrl}
                    alt={it.name}
                    className="h-16 w-16 rounded-2xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{it.name}</p>
                    <p className="text-xs text-accent-charcoal/60 line-clamp-1">{it.description}</p>
                    <p className="text-xs text-accent-charcoal/50 mt-0.5">
                      {formatMoney(it.priceAtOrder)} × {it.qty}
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold">
                    {formatMoney(it.priceAtOrder * it.qty)}
                  </span>
                </div>
                {order.status === 'delivered' && (
                  <div className="mt-3 ml-20">
                    <RateItem menuId={it.menuId} itemName={it.name} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="card p-6 flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Total paid</h2>
          <p className="font-display text-5xl font-bold text-brand-600">
            {formatMoney(order.total)}
          </p>
          <div className="text-sm text-accent-charcoal/60 flex items-start gap-2 pt-2 border-t border-accent-charcoal/5">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            {order.delivery ? (
              <div>
                <p className="font-semibold text-accent-charcoal">{order.delivery.name}</p>
                <p>{order.delivery.address}</p>
                <p>{order.delivery.phone}</p>
              </div>
            ) : (
              <p>Delivery details were submitted at checkout.</p>
            )}
          </div>
          <Link to="/menu" className="btn btn-primary btn-size-md w-full mt-auto">
            Order again
          </Link>
        </aside>
      </div>
    </div>
  );
}
