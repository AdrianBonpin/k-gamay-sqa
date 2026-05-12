import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { listRatings, deleteRating, type ManageRatingsResponse } from '@/api/manage';
import { TabLoading } from './TabLoading';
import { formatDate } from '@/lib/utils';

export function RatingsTab() {
  const [data, setData] = useState<ManageRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await listRatings(limit, offset)); } catch (err: any) { setError(err?.message || 'Failed'); } finally { setLoading(false); }
  }, [offset]);
  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete thisrating?')) return;
    try {
      await deleteRating(id);
      setData((prev) => prev ? { ...prev, ratings: prev.ratings.filter((r) => r.id !== id), total: prev.total - 1 } : prev);
      toast.success('Rating deleted');
    } catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Ratings <span className="text-accent-charcoal/30 text-base font-normal">({data?.total ?? 0})</span></h2>
        <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {data?.ratings.length ? (
        <>
          <div className="space-y-2">
            {data.ratings.map((r) => (
              <div key={r.id} className="card p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-accent-charcoal">{r.userName}</span>
                    <span className="text-accent-charcoal/30 text-sm">{r.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-accent-charcoal/10'}`} />
                    ))}
                    <span className="text-xs text-accent-charcoal/40 ml-1.5">on {r.menuName}</span>
                  </div>
                  {r.review && <p className="text-sm text-accent-charcoal/50 mt-1 line-clamp-2">{r.review}</p>}
                  <p className="text-xs text-accent-charcoal/25 mt-1">{formatDate(r.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-accent-charcoal/40">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= data.total} className="btn btn-ghost btn-size-sm disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-accent-charcoal/40 py-12">No ratings yet.</p>
      )}
    </div>
  );
}
