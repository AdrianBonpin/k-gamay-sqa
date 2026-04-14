// Integer-cents money utilities. Mirrors apps/backend/lib/money.js.

export function toCents(dollars: number): number {
  if (typeof dollars !== 'number' || !Number.isFinite(dollars)) {
    throw new TypeError('toCents expects a finite number');
  }
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new TypeError('fromCents expects an integer');
  }
  return Math.round(cents) / 100;
}

export function applyDiscountCents(cents: number, fraction: number): number {
  if (!Number.isInteger(cents)) {
    throw new TypeError('applyDiscountCents expects integer cents');
  }
  if (fraction < 0 || fraction > 1) {
    throw new RangeError('discount fraction must be between 0 and 1');
  }
  return Math.round(cents * (1 - fraction));
}

export function formatMoney(cents: number): string {
  return `$${fromCents(cents).toFixed(2)}`;
}

export function formatDollars(dollars: number): string {
  return formatMoney(toCents(dollars));
}
