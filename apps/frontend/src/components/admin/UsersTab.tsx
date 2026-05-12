import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { listUsers, deleteUser, getUser, type ManageUser, type ManageUserDetail } from '@/api/manage';
import { UserRow } from './UserRow';
import { TabLoading } from './TabLoading';
import toast from 'react-hot-toast';

export function UsersTab() {
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
      setUsers(await listUsers());
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setUserDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      setUserDetail(await getUser(id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load user');
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const handleDelete = useCallback(async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}" and all their data?`)) return;
    try {
      await deleteUser(id);
      toast.success(`User "${name}" deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  }, []);

  if (loading) return <TabLoading />;
  if (error) {
    return (
      <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700">
        <p className="font-semibold">{error}</p>
        <button onClick={fetchUsers} className="btn btn-ghost btn-size-sm mt-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">
          Users <span className="text-accent-charcoal/30 text-base font-normal">({users.length})</span>
        </h2>
        <button onClick={fetchUsers} className="btn btn-ghost btn-size-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            expanded={expandedId === user.id}
            detail={expandedId === user.id ? userDetail : null}
            detailLoading={detailLoading && expandedId === user.id}
            onToggle={() => toggleExpand(user.id)}
            onDelete={() => handleDelete(user.id, user.name)}
          />
        ))}
        {users.length === 0 && (
          <p className="text-center text-accent-charcoal/40 py-12">No users found.</p>
        )}
      </div>
    </div>
  );
}
