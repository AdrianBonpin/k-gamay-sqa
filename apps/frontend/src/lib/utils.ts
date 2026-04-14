import { formatDollars } from '@/lib/money';

// Backward-compatible helper: takes a dollars value and returns "$X.YY".
// Internally routes through integer-cents to avoid float drift.
// Prefer `formatMoney` from '@/lib/money' (takes cents) for new code.
export function formatMoney(dollars: number): string {
  return formatDollars(dollars);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function classNames(...xs: (string | number | false | null | undefined)[]): string {
  return xs.filter((x): x is string => typeof x === 'string' && x.length > 0).join(' ');
}

export function statusLabel(s: string): string {
  if (s === 'in_progress') return 'In Progress';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
