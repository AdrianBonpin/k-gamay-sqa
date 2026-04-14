import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';
import type { MenuItem } from '@/types';

const ITEM_A: MenuItem = {
  id: 1,
  name: 'Lemonade',
  description: '',
  price: 3.49,
  imageUrl: '',
  category: 'Drinks',
};

const ITEM_B: MenuItem = {
  id: 2,
  name: 'Cola',
  description: '',
  price: 2.99,
  imageUrl: '',
  category: 'Drinks',
};

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    localStorage.clear();
  });

  it('add() merges qty when item already exists', () => {
    useCartStore.getState().add(ITEM_A, 2);
    useCartStore.getState().add(ITEM_A, 3);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(5);
  });

  it('add() appends new items', () => {
    useCartStore.getState().add(ITEM_A);
    useCartStore.getState().add(ITEM_B);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQty(0) removes item', () => {
    useCartStore.getState().add(ITEM_A, 3);
    useCartStore.getState().updateQty(ITEM_A.id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('updateQty(n) updates qty', () => {
    useCartStore.getState().add(ITEM_A, 1);
    useCartStore.getState().updateQty(ITEM_A.id, 4);
    expect(useCartStore.getState().items[0].qty).toBe(4);
  });

  it('subtotal rounds correctly: 3.49 x 3 = 10.47 (no float drift)', () => {
    useCartStore.getState().add(ITEM_A, 3);
    expect(useCartStore.getState().subtotal()).toBe(10.47);
    expect(useCartStore.getState().subtotalCents()).toBe(1047);
  });

  it('count() sums quantities', () => {
    useCartStore.getState().add(ITEM_A, 2);
    useCartStore.getState().add(ITEM_B, 1);
    expect(useCartStore.getState().count()).toBe(3);
  });

  it('clear() empties the cart', () => {
    useCartStore.getState().add(ITEM_A, 2);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
