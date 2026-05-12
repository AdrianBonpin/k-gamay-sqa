import { formatDollars } from '@/lib/money';

/**
 * LEGACY — DO NOT USE IN NEW CODE.
 *
 * Input: DOLLARS (float, e.g. 12.50), NOT cents.
 * Routes through formatDollars → toCents → formatMoney internally.
 *
 * ⚠️ WARNING: @/lib/money also exports `formatMoney` but expects CENTS (integers).
 * Passing cents to THIS function will produce 100× inflated output.
 * Passing dollars to THE OTHER function will crash with `fromCents expects an integer`.
 *
 * For new code importing directly from API responses with `totalCents` fields,
 * use `import { formatMoney } from '@/lib/money'` instead.
 */
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
