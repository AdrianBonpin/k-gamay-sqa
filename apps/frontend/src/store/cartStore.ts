import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem } from '@/types';
import { toCents, fromCents } from '@/lib/money';

interface CartState {
  items: CartItem[];
  add: (item: MenuItem, qty?: number) => void;
  remove: (menuId: number) => void;
  updateQty: (menuId: number, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.menuId === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuId === item.id ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          const priceCents = toCents(item.price);
          return {
            items: [
              ...state.items,
              {
                menuId: item.id,
                name: item.name,
                price: item.price,
                priceCents,
                imageUrl: item.imageUrl,
                qty,
              },
            ],
          };
        }),
      remove: (menuId) =>
        set((state) => ({ items: state.items.filter((i) => i.menuId !== menuId) })),
      updateQty: (menuId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.menuId !== menuId) };
          }
          return {
            items: state.items.map((i) => (i.menuId === menuId ? { ...i, qty } : i)),
          };
        }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotalCents: () =>
        get().items.reduce((s, i) => {
          const cents = i.priceCents ?? toCents(i.price);
          return s + cents * i.qty;
        }, 0),
      subtotal: () => fromCents(get().subtotalCents()),
    }),
    {
      name: 'kgamay-cart',
      // Migrate legacy items that were persisted without priceCents.
      migrate: (state: unknown) => {
        const s = state as { items?: CartItem[] } | undefined;
        if (s && Array.isArray(s.items)) {
          s.items = s.items.map((i) => ({
            ...i,
            priceCents: i.priceCents ?? toCents(i.price),
          }));
        }
        return s as CartState;
      },
      version: 1,
    },
  ),
);
