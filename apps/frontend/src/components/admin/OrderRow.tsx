import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { type ManageOrder } from '@/api/manage';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/money';

const ORDER_STATUSES = ['pending', 'in_progress', 'delivered'] as const;

interface OrderRowProps {
  order: ManageOrder;
  expanded: boolean;
  detail: ManageOrder | null;
  detailLoading: boolean;
  updatingStatus: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
}

export function OrderRow({ order, expanded, detail, detailLoading, updatingStatus, onToggle, onStatusChange }: OrderRowProps) {
  return (
    <div>
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1 min-w-0">
            {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-accent-charcoal/30" /> : <ChevronRight className="h-4 w-4 shrink-0 text-accent-charcoal/30" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold text-accent-charcoal">#{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-accent-charcoal/40 mt-0.5">{order.userName ?? `User #${order.userId}`} · {formatDate(order.createdAt)}</p>
            </div>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-semibold text-accent-charcoal">{formatMoney(order.totalCents)}</span>
            <select value={order.status} onChange={(e) => onStatusChange(e.target.value)} disabled={updatingStatus} className={`input w-auto py-1.5 text-xs ${updatingStatus ? 'opacity-50' : ''}`}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
            </select>
            {updatingStatus && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 ml-8 card p-4 border-accent-charcoal/5">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-accent-charcoal/40 py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading details...</div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-accent-charcoal/40">Customer</span><p className="font-medium text-accent-charcoal">{detail.userName}</p></div>
                <div><span className="text-accent-charcoal/40">Email</span><p className="font-medium text-accent-charcoal truncate">{detail.userEmail}</p></div>
                <div><span className="text-accent-charcoal/40">Promo</span><p className="font-medium text-accent-charcoal">{detail.promoCode || '—'}</p></div>
                <div><span className="text-accent-charcoal/40">Discount</span><p className="font-medium text-accent-charcoal">{Math.round(detail.discount * 100)}%</p></div>
              </div>
              {detail.delivery && <div className="p-3 rounded-xl bg-surface-muted text-sm"><span className="text-accent-charcoal/40">Delivery</span><p className="font-medium text-accent-charcoal">{detail.delivery.name} · {detail.delivery.address} · {detail.delivery.phone}</p></div>}
              <div>
                <p className="text-xs font-medium text-accent-charcoal/30 uppercase tracking-wide mb-2">Items ({detail.items.length})</p>
                {detail.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted text-sm">
                    <div className="flex items-center gap-2"><span className="font-medium text-accent-charcoal">{item.name}</span><span className="text-accent-charcoal/30">x{item.qty}</span></div>
                    <span className="text-accent-charcoal/50">{formatMoney(item.priceAtOrder * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-accent-charcoal/5 pt-3"><span className="font-display text-lg font-bold text-accent-charcoal">Total: {formatMoney(detail.totalCents)}</span></div>
            </div>
          ) : <p className="text-sm text-accent-charcoal/40 py-4">Could not load order details.</p>}
        </div>
      )}
    </div>
  );
}
