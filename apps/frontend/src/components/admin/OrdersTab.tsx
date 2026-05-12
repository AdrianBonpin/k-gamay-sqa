import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { listOrders, getOrder, updateOrderStatus, type ManageOrder, type ManageOrdersResponse } from '@/api/manage';
import { OrderRow } from './OrderRow';
import { TabLoading } from './TabLoading';

const ORDER_STATUSES = ['pending', 'in_progress', 'delivered'] as const;

export function OrdersTab() {
  const [data, setData] = useState<ManageOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<ManageOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await listOrders(statusFilter || undefined, limit, offset)); }
    catch (err: any) { setError(err?.message || 'Failed to load orders'); }
    finally { setLoading(false); }
  }, [statusFilter, offset]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset offset when filter changes
  useEffect(() => { setOffset(0); }, [statusFilter]);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setOrderDetail(null); return; }
    setExpandedId(id); setDetailLoading(true);
    try { setOrderDetail(await getOrder(id)); }
    catch (err: any) { toast.error(err?.message || 'Failed to load order'); }
    finally { setDetailLoading(false); }
  }, [expandedId]);

  const handleStatusChange = useCallback(async (id: number, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const updated = await updateOrderStatus(id, newStatus);
      setData((prev) => prev ? {
        ...prev,
        orders: prev.orders.map((o) => (o.id === id ? { ...o, status: updated.status } : o)),
      } : prev);
      setOrderDetail((prev) => (prev?.id === id ? { ...prev, status: updated.status } : prev));
      toast.success(`Order #${id} -> ${newStatus.replace('_', ' ')}`);
    } catch (err: any) { toast.error(err?.message || 'Update failed'); }
    finally { setUpdatingStatus(null); }
  }, []);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetchOrders} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Orders <span className="text-accent-charcoal/30 text-base font-normal">({data?.total ?? 0})</span></h2>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto py-2">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
          </select>
          <button onClick={fetchOrders} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="space-y-2">
        {data?.orders.map((order) => (
          <OrderRow key={order.id} order={order} expanded={expandedId === order.id} detail={expandedId === order.id ? orderDetail : null} detailLoading={detailLoading && expandedId === order.id} updatingStatus={updatingStatus === order.id} onToggle={() => toggleExpand(order.id)} onStatusChange={(s) => handleStatusChange(order.id, s)} />
        ))}
        {data?.orders.length === 0 && <p className="text-center text-accent-charcoal/40 py-12">No orders found.</p>}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-accent-charcoal/40">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= (data?.total ?? 0)} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}