import { describe, it, expect } from 'vitest';
import { toCents, fromCents, applyDiscountCents, formatMoney, formatDollars } from './money';

describe('money', () => {
  describe('toCents / fromCents', () => {
    it('converts 3.49 to 349 cents', () => {
      expect(toCents(3.49)).toBe(349);
    });

    it('handles float repr of 0.1 + 0.2 cleanly', () => {
      expect(toCents(0.1 + 0.2)).toBe(30);
    });

    it('round-trips', () => {
      expect(fromCents(toCents(12.34))).toBeCloseTo(12.34);
    });
  });

  describe('applyDiscountCents', () => {
    it('applies 10% off 1000 cents = 900 cents', () => {
      expect(applyDiscountCents(1000, 0.1)).toBe(900);
    });

    it('applies 15% off 349 cents = 297 cents (rounded)', () => {
      // 349 * 0.85 = 296.65 -> 297
      expect(applyDiscountCents(349, 0.15)).toBe(297);
    });

    it('0% off is identity', () => {
      expect(applyDiscountCents(1234, 0)).toBe(1234);
    });

    it('rejects invalid fraction', () => {
      expect(() => applyDiscountCents(100, 1.5)).toThrow();
      expect(() => applyDiscountCents(100, -0.1)).toThrow();
    });
  });

  describe('formatMoney', () => {
    it('formats 349 cents as ₱3.49', () => {
      expect(formatMoney(349)).toBe('₱3.49');
    });

    it('formats 1000 cents as ₱10.00', () => {
      expect(formatMoney(1000)).toBe('₱10.00');
    });

    it('formatDollars goes via cents and formats', () => {
      expect(formatDollars(3.49)).toBe('₱3.49');
      expect(formatDollars(0.1 + 0.2)).toBe('₱0.30');
    });
  });
});
