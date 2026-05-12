import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listMenu, createMenuItem, updateMenuItem, deleteMenuItem, type ManageMenuItem } from '@/api/manage';
import { TabLoading } from './TabLoading';
import { formatMoney } from '@/lib/money';

const CATEGORIES = ['Burgers', 'Pizza', 'Asian', 'Desserts', 'Drinks'];

export function MenuTab() {
  const [items, setItems] = useState<ManageMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await listMenu()); } catch (err: any) { setError(err?.message || 'Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => { setName(''); setDesc(''); setPrice(''); setImage(''); setCategory(CATEGORIES[0]); setEditId(null); setShowForm(false); };

  const openEdit = (item: ManageMenuItem) => {
    setName(item.name); setDesc(item.description); setPrice(String(item.price)); setImage(item.imageUrl); setCategory(item.category);
    setEditId(item.id); setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim() || !price.trim() || Number.isNaN(priceNum) || priceNum <= 0) { toast.error('Name and valid price required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: desc.trim(), price: priceNum, imageUrl: image.trim(), category };
      if (editId) {
        const updated = await updateMenuItem(editId, payload);
        setItems((prev) => prev.map((it) => (it.id === editId ? { ...it, ...updated } : it)));
        toast.success(`"${updated.name}" updated`);
      } else {
        const created = await createMenuItem(payload);
        setItems((prev) => [...prev, created]);
        toast.success(`"${created.name}" created`);
      }
      resetForm();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return;
    try { await deleteMenuItem(id); setItems((prev) => prev.filter((it) => it.id !== id)); toast.success(`"${itemName}" deleted`); }
    catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  if (loading) return <TabLoading />;
  if (error) return <div className="card p-6 bg-brand-50 border-brand-500/20 text-brand-700"><p className="font-semibold">{error}</p><button onClick={fetch} className="btn btn-ghost btn-size-sm mt-2"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-accent-charcoal">Menu <span className="text-accent-charcoal/30 text-base font-normal">({items.length})</span></h2>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="btn btn-ghost btn-size-sm"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary btn-size-sm"><Plus className="h-4 w-4" />Add item</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-accent-charcoal">{editId ? 'Edit menu item' : 'New menu item'}</h3><button type="button" onClick={resetForm} className="text-accent-charcoal/30 hover:text-accent-charcoal">✕</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Price (PHP)</label><input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Image URL</label><input className="input" value={image} onChange={(e) => setImage(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Category</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-accent-charcoal/40 uppercase mb-1.5 block">Description</label><textarea className="input resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-size-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-size-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editId ? 'Save' : 'Create'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="font-semibold text-accent-charcoal truncate">{item.name}</h3><p className="text-xs text-accent-charcoal/40 mt-0.5">{item.category}</p></div>
                <span className="font-display font-bold text-brand-500 shrink-0">{formatMoney(item.price * 100)}</span>
              </div>
              {item.description && <p className="text-sm text-accent-charcoal/50 mt-2 line-clamp-2">{item.description}</p>}
              {item.rating?.count ? <p className="text-xs text-accent-charcoal/30 mt-2"><Star className="h-3 w-3 inline fill-amber-400 text-amber-400 mr-0.5" />{item.rating.average.toFixed(1)} ({item.rating.count})</p> : null}
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(item)} className="flex-1 btn btn-ghost btn-size-sm text-xs">Edit</button>
                <button onClick={() => handleDelete(item.id, item.name)} className="flex-1 btn btn-ghost btn-size-sm text-xs text-red-500"><Trash2 className="h-3.5 w-3.5" />Delete</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-accent-charcoal/40 py-12 col-span-full">No menu items yet.</p>}
      </div>
    </div>
  );
}
