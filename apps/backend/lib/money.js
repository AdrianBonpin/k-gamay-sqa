// Integer-cents money utilities. Use cents everywhere internally to avoid float drift.

function toCents(dollars) {
  if (typeof dollars !== 'number' || !Number.isFinite(dollars)) {
    throw new TypeError('toCents expects a finite number');
  }
  return Math.round(dollars * 100);
}

function fromCents(cents) {
  if (!Number.isInteger(cents)) {
    throw new TypeError('fromCents expects an integer');
  }
  return Math.round(cents) / 100;
}

function applyDiscountCents(cents, fraction) {
  if (!Number.isInteger(cents)) {
    throw new TypeError('applyDiscountCents expects integer cents');
  }
  if (typeof fraction !== 'number' || fraction < 0 || fraction > 1) {
    throw new RangeError('discount fraction must be between 0 and 1');
  }
  return Math.round(cents * (1 - fraction));
}

function formatMoney(cents) {
  const dollars = fromCents(cents);
  return `$${dollars.toFixed(2)}`;
}

module.exports = { toCents, fromCents, applyDiscountCents, formatMoney };
