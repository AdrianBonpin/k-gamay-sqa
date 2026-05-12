import { ChevronDown, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { type ManageUser, type ManageUserDetail } from '@/api/manage';
import { StatusBadge } from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';

interface UserRowProps {
  user: ManageUser;
  expanded: boolean;
  detail: ManageUserDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function UserRow({ user, expanded, detail, detailLoading, onToggle, onDelete }: UserRowProps) {
  return (
    <div>
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1 min-w-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-accent-charcoal/30" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-accent-charcoal truncate">{user.name}</p>
              <p className="text-sm text-accent-charcoal/40 truncate">{user.email}</p>
            </div>
          </button>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-accent-charcoal/40">{user.orderCount ?? 0} orders</span>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-8 card p-4 border-accent-charcoal/5">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-accent-charcoal/40 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
            </div>
          ) : detail?.orders.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-accent-charcoal/30 uppercase tracking-wide mb-3">
                Orders ({detail.orders.length})
              </p>
              {detail.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-accent-charcoal/40">#{order.id}</span>
                    <StatusBadge status={order.status} />
                    <span className="text-sm text-accent-charcoal/40">{formatDate(order.createdAt)}</span>
                  </div>
                  <span className="font-semibold text-accent-charcoal">{formatMoney(order.totalCents)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-accent-charcoal/40 py-4">No orders yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
