import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDashboard, type DashboardStats } from '@/api/manage';
import { StatCard } from './StatCard';
import { TabLoading } from './TabLoading';
import { formatMoney } from '@/lib/money';

const ORDER_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  in_progress: 'text-blue-500',
  delivered: 'text-emerald-500',
};

export function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { stats: s } = await getDashboard();
      setStats(s);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <TabLoading />;
  if (error) {
    return (
      <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
        <p className="font-semibold">{error}</p>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Dashboard</h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.users} color="text-blue-600" />
        <StatCard label="Total Orders" value={stats.orders} color="text-emerald-600" />
        <StatCard label="Menu Items" value={stats.menuItems} color="text-amber-600" />
        <StatCard label="Active Promos" value={stats.promos} color="text-purple-600" />
        <StatCard label="Ratings" value={stats.ratings} color="text-pink-600" />
        <StatCard label="Revenue" value={formatMoney(stats.revenueCents)} color="text-brand-500" />
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-accent-charcoal mb-3">Orders by Status</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'delivered'] as const).map((status) => (
            <div key={status} className="card p-4 border-accent-charcoal/5">
              <p className="text-xs font-medium text-accent-charcoal/40 uppercase tracking-wide">
                {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
              <p className={`mt-1 font-display text-3xl font-bold ${ORDER_COLORS[status]}`}>
                {stats.ordersByStatus[status]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
