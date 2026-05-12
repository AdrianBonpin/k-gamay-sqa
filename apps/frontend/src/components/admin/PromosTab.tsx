import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listPromos, createPromo, deletePromo, type ManagePromo } from '@/api/manage';
import { TabLoading } from './TabLoading';

export function PromosTab() {
  const [promos, setPromos] = useState<ManagePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [desc, setDesc] = useState('');
  const [firstOrder, setFirstOrder] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try { setPromos(await listPromos()); } catch (err: any) { setError(err?.message || 'Failed'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => { setCode(''); setDiscount(''); setDesc(''); setFirstOrder(false); setShowForm(false); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const discNum = Number(discount);
    if (!code.trim() || Number.isNaN(discNum) || discNum <= 0 || discNum > 1) { toast.error('Valid code and discount (0-1) required'); return; }
    setSaving(true);
    try {
      const created = await createPromo({ code: code.trim(), discount: discNum, description: desc.trim(), firstOrderOnly: firstOrder });
      setPromos((prev) => [...prev, created]);
      toast.success(`Promo "${created.code}" created`);
      resetForm();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (promoCode: string) => {
    if (!confirm(`Delete promo "${promoCode}"?`)) return;
    try { await deletePromo(promoCode); setPromos((prev) => prev.filter((p) => p.code !== promoCode)); toast.success('Deleted'); }
    catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Promos <span className="text-accent-charcoal/30 text-base font-normal">({promos.length})</span></h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-size-sm"><Plus className="h-4 w-4" />New promo</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-accent-charcoal">New promo code</h3><button type="button" onClick={resetForm} className="text-accent-charcoal/30 hover:text-accent-charcoal">✕</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Code</label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Discount (0-1)</label><input className="input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} required /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Description</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={firstOrder} onChange={(e) => setFirstOrder(e.target.checked)} className="rounded" /><span className="text-accent-charcoal/60">First-order only</span></label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {promos.map((p) => (
          <div key={p.code} className="card p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-brand-500">{p.code}</span>
                <span className="badge bg-emerald-100 text-emerald-700">{(p.discount * 100).toFixed(0)}% off</span>
                {p.firstOrderOnly && <span className="badge bg-amber-100 text-amber-700">First order</span>}
              </div>
              {p.description && <p className="text-sm text-accent-charcoal/40 mt-0.5 truncate">{p.description}</p>}
              <p className="text-xs text-accent-charcoal/30 mt-1">Used {p.useCount} time{p.useCount !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => handleDelete(p.code)} className="p-2 rounded-lg text-accent-charcoal/20 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {promos.length === 0 && <p className="text-center text-accent-charcoal/40 py-12">No promos yet.</p>}
      </div>
    </div>
  );
}
