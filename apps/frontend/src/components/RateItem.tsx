import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { Stars } from './Stars';
import { fetchMyRating, submitRating } from '@/api/ratings';
import { extractError } from '@/api/client';
import type { Rating } from '@/types';

interface Props {
  menuId: number;
  itemName: string;
}

export function RateItem({ menuId, itemName }: Props) {
  const [existing, setExisting] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyRating(menuId)
      .then((res) => {
        if (cancelled) return;
        setExisting(res.rating);
        if (res.rating) {
          setStars(res.rating.stars);
          setReview(res.rating.review ?? '');
        }
      })
      .catch(() => {
        /* ignore — show widget anyway */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  if (loading) return null;

  const showForm = editing || !existing;

  const onSubmit = async () => {
    if (stars < 1 || stars > 5) {
      toast.error('Please pick 1–5 stars');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitRating({
        menuId,
        stars,
        review: review.trim() || undefined,
      });
      setExisting(res.rating);
      setEditing(false);
      toast.success(`Thanks for rating ${itemName}!`);
    } catch (err) {
      toast.error(extractError(err, 'Could not submit rating'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm && existing) {
    return (
      <div className="rounded-2xl bg-surface-muted/60 px-3 py-2 flex items-center gap-3">
        <Stars value={existing.stars} size="sm" />
        <span className="text-xs text-accent-charcoal/70 flex-1 truncate">
          {existing.review ? `“${existing.review}”` : 'You rated this item'}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent-charcoal/10 p-3 space-y-2">
      <p className="text-xs font-semibold text-accent-charcoal/70">Rate this item</p>
      <Stars value={stars} size="md" interactive onChange={setStars} />
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value.slice(0, 500))}
        placeholder="Optional review…"
        rows={2}
        maxLength={500}
        className="input text-sm w-full"
      />
      <div className="flex items-center justify-end gap-2">
        {existing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setStars(existing.stars);
              setReview(existing.review ?? '');
            }}
            className="btn btn-ghost btn-size-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || stars < 1}
          className="btn btn-primary btn-size-sm"
        >
          {submitting ? 'Submitting…' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
