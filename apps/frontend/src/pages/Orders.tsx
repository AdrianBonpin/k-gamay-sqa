import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ReceiptText } from 'lucide-react';
import { listOrders } from '@/api/orders';
import { formatDate, formatMoney } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsyncResource } from '@/lib/useAsyncResource';

export function Orders() {
  const { data: orders, error, loading } = useAsyncResource((_signal) => listOrders(), []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
          <p className="font-semibold">Couldn&apos;t load your orders.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || orders === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <LoadingSpinner size="lg" label="Loading your orders…" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ReceiptText className="h-10 w-10" strokeWidth={2.2} />}
          title="No orders yet"
          description="When you place your first order, it'll show up here so you can track it and reorder in one tap."
          action={
            <Link to="/menu" className="btn btn-primary btn-size-lg">
              Browse the menu
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Your orders</h1>
        <p className="mt-2 text-accent-charcoal/60">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} — tap any to see details.
        </p>
      </header>

      <div className="space-y-4 menu-stagger">
        {orders.map((order) => (
          <div key={order.id} className="animate-fadein">
            <Link
              to={`/orders/${order.id}`}
              className="card p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lift transition-shadow group"
            >
              <div className="flex -space-x-3">
                {order.items.slice(0, 3).map((it) => (
                  <img
                    key={it.id}
                    src={it.imageUrl}
                    alt={it.name}
                    className="h-14 w-14 rounded-2xl object-cover border-2 border-white"
                  />
                ))}
                {order.items.length > 3 && (
                  <span className="h-14 w-14 rounded-2xl bg-surface-muted grid place-items-center text-xs font-semibold border-2 border-white">
                    +{order.items.length - 3}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-display text-lg font-bold">Order #{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-accent-charcoal/60 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(order.createdAt)} · {order.items.length} item
                  {order.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="md:text-right">
                <p className="font-display text-2xl font-bold">{formatMoney(order.total)}</p>
                <p className="text-xs text-accent-charcoal/50 group-hover:text-brand-600 font-semibold">
                  View details →
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
