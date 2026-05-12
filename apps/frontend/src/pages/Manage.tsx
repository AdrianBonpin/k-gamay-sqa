import { useState, useEffect, useCallback, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  Lock,
  LayoutDashboard,
  Users,
  ShoppingBag,
  UtensilsCrossed,
  TicketPercent,
  Star,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  getDashboard,
  listUsers,
  getUser,
  deleteUser,
  listOrders,
  getOrder,
  updateOrderStatus,
  listMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listPromos,
  createPromo,
  deletePromo,
  listRatings,
  deleteRating,
  extractError,
  type DashboardStats,
  type ManageUser,
  type ManageUserDetail,
  type ManageOrder,
  type ManageMenuItem,
  type ManagePromo,
  type ManageRatingsResponse,
} from '@/api/manage';
import { formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { key: 'promos', label: 'Promos', icon: TicketPercent },
  { key: 'ratings', label: 'Ratings', icon: Star },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ORDER_STATUSES = ['pending', 'in_progress', 'delivered'] as const;

const CATEGORIES = ['Burgers', 'Pizza', 'Asian', 'Desserts', 'Drinks'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Manage() {
  const [manageKey, setManageKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  // Attempt authentication by calling /manage with the key
  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!manageKey.trim()) {
        setAuthError('Please enter the management password.');
        return;
      }
      setAuthError('');
      try {
        await getDashboard(manageKey.trim());
        setAuthenticated(true);
        toast.success('Authenticated');
      } catch (err) {
        setAuthError(extractError(err, 'Authentication failed'));
      }
    },
    [manageKey],
  );

  if (!authenticated) {
    return <LoginScreen manageKey={manageKey} setManageKey={setManageKey} error={authError} onSubmit={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-accent-charcoal text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-accent-charcoal/95 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-4 md:px-8 h-16 max-w-[1600px]">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight">
              K-Gamay <span className="text-brand-500">Admin</span>
            </span>
          </div>
          <button
            onClick={() => {
              setAuthenticated(false);
              setManageKey('');
              setActiveTab('dashboard');
            }}
            className="btn btn-ghost btn-size-sm text-white/70 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col w-56 border-r border-white/10 min-h-[calc(100vh-4rem)] sticky top-16 self-start">
          <div className="p-4 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile tabs */}
        <nav className="md:hidden flex overflow-x-auto border-b border-white/10 w-full sticky top-16 z-20 bg-accent-charcoal/95 backdrop-blur">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                  active
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
          {activeTab === 'dashboard' && <DashboardTab manageKey={manageKey} />}
          {activeTab === 'users' && <UsersTab manageKey={manageKey} />}
          {activeTab === 'orders' && <OrdersTab manageKey={manageKey} />}
          {activeTab === 'menu' && <MenuTab manageKey={manageKey} />}
          {activeTab === 'promos' && <PromosTab manageKey={manageKey} />}
          {activeTab === 'ratings' && <RatingsTab manageKey={manageKey} />}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------

function LoginScreen({
  manageKey,
  setManageKey,
  error,
  onSubmit,
}: {
  manageKey: string;
  setManageKey: (v: string) => void;
  error: string;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent-charcoal p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-500/20 mb-4">
            <Lock className="h-8 w-8 text-brand-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Admin Panel</h1>
          <p className="mt-2 text-white/50">Enter the management password to continue.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={manageKey}
              onChange={(e) => {
                setManageKey(e.target.value);
              }}
              onFocus={() => {}}
              autoFocus
              placeholder="Management password"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-size-lg w-full"
            disabled={!manageKey.trim()}
          >
            <Lock className="h-4 w-4" />
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard tab
// ---------------------------------------------------------------------------

function DashboardTab({ manageKey }: { manageKey: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { stats: s } = await getDashboard(manageKey);
      setStats(s);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={fetch} />;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.users, color: 'text-blue-400' },
    { label: 'Total Orders', value: stats.orders, color: 'text-emerald-400' },
    { label: 'Menu Items', value: stats.menuItems, color: 'text-amber-400' },
    { label: 'Active Promos', value: stats.promos, color: 'text-purple-400' },
    { label: 'Ratings', value: stats.ratings, color: 'text-pink-400' },
    { label: 'Revenue', value: formatMoney(stats.revenueCents), color: 'text-brand-400' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide">{c.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-display text-lg font-bold mb-3">Orders by Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatusCard
            label="Pending"
            count={stats.ordersByStatus.pending}
            color="border-amber-500/30 bg-amber-500/5"
            textColor="text-amber-400"
          />
          <StatusCard
            label="In Progress"
            count={stats.ordersByStatus.in_progress}
            color="border-blue-500/30 bg-blue-500/5"
            textColor="text-blue-400"
          />
          <StatusCard
            label="Delivered"
            count={stats.ordersByStatus.delivered}
            color="border-emerald-500/30 bg-emerald-500/5"
            textColor="text-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  color,
  textColor,
}: {
  label: string;
  count: number;
  color: string;
  textColor: string;
}) {
  return (
    <div className={`card p-4 border rounded-2xl ${color}`}>
      <p className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${textColor}`}>{count}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab({ manageKey }: { manageKey: string }) {
  const [users, setUsers] = useState<ManageUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<ManageUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const u = await listUsers(manageKey);
      setUsers(u);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleExpand = useCallback(
    async (id: number) => {
      if (expandedId === id) {
        setExpandedId(null);
        setUserDetail(null);
        return;
      }
      setExpandedId(id);
      setDetailLoading(true);
      setUserDetail(null);
      try {
        const detail = await getUser(manageKey, id);
        setUserDetail(detail);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setDetailLoading(false);
      }
    },
    [manageKey, expandedId],
  );

  const handleDelete = useCallback(
    async (id: number, name: string) => {
      if (!window.confirm(`Delete user "${name}" and all their data? This cannot be undone.`)) return;
      try {
        await deleteUser(manageKey, id);
        toast.success(`User "${name}" deleted`);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        if (expandedId === id) {
          setExpandedId(null);
          setUserDetail(null);
        }
      } catch (err) {
        toast.error(extractError(err));
      }
    },
    [manageKey, expandedId],
  );

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={fetchUsers} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          Users <span className="text-white/40 text-base font-normal">({users.length})</span>
        </h2>
        <button onClick={fetchUsers} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id}>
            <div className="card p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleExpand(user.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  {expandedId === user.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{user.name}</p>
                    <p className="text-sm text-white/40 truncate">{user.email}</p>
                  </div>
                </button>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm text-white/40">{user.orderCount ?? 0} orders</span>
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded: user orders */}
            {expandedId === user.id && (
              <div className="mt-2 ml-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading orders...
                  </div>
                ) : userDetail && userDetail.orders.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
                      Orders ({userDetail.orders.length})
                    </p>
                    {userDetail.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-white/50">#{order.id}</span>
                          <StatusBadge status={order.status} />
                          <span className="text-sm text-white/50">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/50">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold">{formatMoney(order.totalCents)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 py-4">No orders yet.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-center text-white/40 py-12">No users found.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------

function OrdersTab({ manageKey }: { manageKey: string }) {
  const [orders, setOrders] = useState<ManageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<ManageOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const o = await listOrders(manageKey, statusFilter || undefined);
      setOrders(o);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = useCallback(
    async (id: number) => {
      if (expandedId === id) {
        setExpandedId(null);
        setOrderDetail(null);
        return;
      }
      setExpandedId(id);
      setDetailLoading(true);
      setOrderDetail(null);
      try {
        const detail = await getOrder(manageKey, id);
        setOrderDetail(detail);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setDetailLoading(false);
      }
    },
    [manageKey, expandedId],
  );

  const handleStatusChange = useCallback(
    async (id: number, newStatus: string) => {
      setUpdatingStatus(id);
      try {
        const updated = await updateOrderStatus(manageKey, id, newStatus);
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)),
        );
        setOrderDetail((prev) => (prev?.id === id ? { ...prev, status: updated.status } : prev));
        toast.success(`Order #${id} → ${newStatus.replace('_', ' ')}`);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setUpdatingStatus(null);
      }
    },
    [manageKey],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold">
          Orders <span className="text-white/40 text-base font-normal">({orders.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500/50"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button onClick={fetchOrders} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetchOrders} />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id}>
              <div className="card p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    {expandedId === order.id ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold">#{order.id}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-white/40 mt-0.5">
                        {order.userName ?? `User #${order.userId}`} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold">{formatMoney(order.totalCents)}</span>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingStatus === order.id}
                      className={`px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500/50 ${
                        updatingStatus === order.id ? 'opacity-50' : ''
                      }`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {updatingStatus === order.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: order items */}
              {expandedId === order.id && (
                <div className="mt-2 ml-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-sm text-white/40 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading details...
                    </div>
                  ) : orderDetail ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-white/40">Customer</span>
                          <p className="font-medium">{orderDetail.userName}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Email</span>
                          <p className="font-medium truncate">{orderDetail.userEmail}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Promo</span>
                          <p className="font-medium">{orderDetail.promoCode || '—'}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Discount</span>
                          <p className="font-medium">{formatMoney(orderDetail.discount)}</p>
                        </div>
                      </div>
                      {orderDetail.delivery && (
                        <div className="p-3 rounded-xl bg-white/5 text-sm">
                          <span className="text-white/40">Delivery</span>
                          <p className="font-medium">
                            {orderDetail.delivery.name} · {orderDetail.delivery.address} ·{' '}
                            {orderDetail.delivery.phone}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">
                          Items ({orderDetail.items.length})
                        </p>
                        <div className="space-y-1">
                          {orderDetail.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-white/30">x{item.qty}</span>
                              </div>
                              <span className="text-white/60">
                                {formatMoney(item.priceAtOrder * item.qty)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end border-t border-white/5 pt-3">
                        <span className="font-display text-lg font-bold">
                          Total: {formatMoney(orderDetail.totalCents)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 py-4">Could not load order details.</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {orders.length === 0 && (
            <p className="text-center text-white/40 py-12">No orders found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu tab
// ---------------------------------------------------------------------------

function MenuTab({ manageKey }: { manageKey: string }) {
  const [items, setItems] = useState<ManageMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listMenu(manageKey);
      setItems(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormImage('');
    setFormCategory(CATEGORIES[0]);
    setEditId(null);
    setShowAdd(false);
  };

  const openEdit = (item: ManageMenuItem) => {
    setFormName(item.name);
    setFormDesc(item.description);
    setFormPrice(String(item.price));
    setFormImage(item.imageUrl);
    setFormCategory(item.category);
    setEditId(item.id);
    setShowAdd(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim() || !formCategory.trim()) return;

    const price = Number(formPrice);
    if (Number.isNaN(price) || price <= 0) {
      toast.error('Price must be a positive number');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const updated = await updateMenuItem(manageKey, editId, {
          name: formName.trim(),
          description: formDesc.trim(),
          price,
          imageUrl: formImage.trim(),
          category: formCategory,
        });
        setItems((prev) => prev.map((it) => (it.id === editId ? { ...it, ...updated } : it)));
        toast.success(`"${updated.name}" updated`);
      } else {
        const created = await createMenuItem(manageKey, {
          name: formName.trim(),
          description: formDesc.trim(),
          price,
          imageUrl: formImage.trim(),
          category: formCategory,
        });
        setItems((prev) => [...prev, created]);
        toast.success(`"${created.name}" created`);
      }
      resetForm();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete menu item "${name}"?`)) return;
    try {
      await deleteMenuItem(manageKey, id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success(`"${name}" deleted`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          Menu <span className="text-white/40 text-base font-normal">({items.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="btn btn-primary btn-size-sm"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showAdd && (
        <form onSubmit={handleSave} className="card p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? 'Edit menu item' : 'New menu item'}</h3>
            <button type="button" onClick={resetForm} className="text-white/40 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Name" value={formName} onChange={setFormName} placeholder="Item name" required />
            <InputField label="Price (PHP)" value={formPrice} onChange={setFormPrice} placeholder="99.00" type="number" step="0.01" required />
            <InputField label="Image URL" value={formImage} onChange={setFormImage} placeholder="https://..." />
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-white/40 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Optional description"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm text-white/50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetch} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{item.category}</p>
                  </div>
                  <span className="font-display font-bold text-brand-400 shrink-0">
                    {formatMoney(item.price * 100)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-white/40 mt-2 line-clamp-2">{item.description}</p>
                )}
                {item.rating && item.rating.count > 0 && (
                  <p className="text-xs text-white/30 mt-2">
                    <Star className="h-3 w-3 inline fill-amber-400 text-amber-400 mr-0.5" />
                    {item.rating.average.toFixed(1)} ({item.rating.count})
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 btn btn-ghost btn-size-sm text-white/60 hover:text-white text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="flex-1 btn btn-ghost btn-size-sm text-red-400/70 hover:text-red-400 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-center text-white/40 py-12 col-span-full">No menu items yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promos tab
// ---------------------------------------------------------------------------

function PromosTab({ manageKey }: { manageKey: string }) {
  const [promos, setPromos] = useState<ManagePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFirstOrderOnly, setFormFirstOrderOnly] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPromos(manageKey);
      setPromos(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const resetForm = () => {
    setFormCode('');
    setFormDiscount('');
    setFormDesc('');
    setFormFirstOrderOnly(false);
    setShowAdd(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formDiscount.trim()) return;

    const discount = Number(formDiscount);
    if (Number.isNaN(discount) || discount <= 0 || discount > 1) {
      toast.error('Discount must be between 0 and 1 (e.g. 0.15 = 15%)');
      return;
    }

    setSaving(true);
    try {
      const created = await createPromo(manageKey, {
        code: formCode.trim(),
        discount,
        description: formDesc.trim(),
        firstOrderOnly: formFirstOrderOnly,
      });
      setPromos((prev) => [...prev, created]);
      toast.success(`Promo "${created.code}" created`);
      resetForm();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete promo "${code}"?`)) return;
    try {
      await deletePromo(manageKey, code);
      setPromos((prev) => prev.filter((p) => p.code !== code));
      toast.success(`Promo "${code}" deleted`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          Promos <span className="text-white/40 text-base font-normal">({promos.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-size-sm">
            <Plus className="h-4 w-4" />
            New promo
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="card p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">New promo code</h3>
            <button type="button" onClick={resetForm} className="text-white/40 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Code" value={formCode} onChange={setFormCode} placeholder="WELCOME" required />
            <InputField label="Discount (0 - 1)" value={formDiscount} onChange={setFormDiscount} placeholder="0.15" type="number" step="0.01" required />
            <div className="md:col-span-2">
              <InputField label="Description" value={formDesc} onChange={setFormDesc} placeholder="Optional description" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={formFirstOrderOnly}
              onChange={(e) => setFormFirstOrderOnly(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-white/70">First-order only</span>
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm text-white/50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create promo
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetch} />
      ) : (
        <div className="space-y-2">
          {promos.map((promo) => (
            <div
              key={promo.code}
              className="card p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand-400">{promo.code}</span>
                  <span className="badge bg-emerald-500/20 text-emerald-400 text-xs">
                    {(promo.discount * 100).toFixed(0)}% off
                  </span>
                  {promo.firstOrderOnly && (
                    <span className="badge bg-amber-500/20 text-amber-400 text-xs">First order</span>
                  )}
                </div>
                {promo.description && (
                  <p className="text-sm text-white/40 mt-0.5 truncate">{promo.description}</p>
                )}
                <p className="text-xs text-white/30 mt-1">
                  Used {promo.useCount} time{promo.useCount !== 1 ? 's' : ''}
                  {promo.maxUses ? ` / ${promo.maxUses} max` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(promo.code)}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                title="Delete promo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {promos.length === 0 && (
            <p className="text-center text-white/40 py-12">No promos yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ratings tab
// ---------------------------------------------------------------------------

function RatingsTab({ manageKey }: { manageKey: string }) {
  const [data, setData] = useState<ManageRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listRatings(manageKey, limit, offset);
      setData(result);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [manageKey, offset]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this rating?')) return;
    try {
      await deleteRating(manageKey, id);
      setData((prev) =>
        prev ? { ...prev, ratings: prev.ratings.filter((r) => r.id !== id), total: prev.total - 1 } : prev,
      );
      toast.success('Rating deleted');
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          Ratings <span className="text-white/40 text-base font-normal">({data?.total ?? 0})</span>
        </h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetch} />
      ) : data && data.ratings.length > 0 ? (
        <>
          <div className="space-y-2">
            {data.ratings.map((rating) => (
              <div
                key={rating.id}
                className="card p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{rating.userName}</span>
                    <span className="text-white/30 text-sm">{rating.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < rating.stars ? 'fill-amber-400 text-amber-400' : 'text-white/15'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-white/40 ml-1.5">on {rating.menuName}</span>
                  </div>
                  {rating.review && (
                    <p className="text-sm text-white/50 mt-1 line-clamp-2">{rating.review}</p>
                  )}
                  <p className="text-xs text-white/25 mt-1">{formatDate(rating.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleDelete(rating.id)}
                  className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                  title="Delete rating"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setOffset(0)}
                disabled={offset === 0}
                className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                disabled={offset === 0}
                className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white/40 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setOffset((prev) => prev + limit)}
                disabled={offset + limit >= data.total}
                className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOffset(Math.floor((data.total - 1) / limit) * limit)}
                disabled={offset + limit >= data.total}
                className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-white/40 py-12">No ratings yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-white/40">Loading...</p>
      </div>
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="card p-6 bg-red-400/10 border border-red-400/20 rounded-2xl max-w-md text-center">
        <p className="text-red-400 font-semibold">Something went wrong</p>
        <p className="text-sm text-red-400/70 mt-1">{message}</p>
      </div>
      <button onClick={onRetry} className="btn btn-ghost btn-size-sm text-white/50 hover:text-white">
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
      />
    </div>
  );
}
