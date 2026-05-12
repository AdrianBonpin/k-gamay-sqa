import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderRow } from './OrderRow';
import type { ManageOrder } from '@/api/manage';

// Mock formatMoney to avoid needing the full cents pipeline
vi.mock('@/lib/money', () => ({
  formatMoney: (cents: number) => `₱${(cents / 100).toFixed(2)}`,
}));

const makeOrder = (overrides?: Partial<ManageOrder>): ManageOrder => ({
  id: 1,
  userId: 1,
  userEmail: 'test@example.com',
  userName: 'Test User',
  status: 'pending',
  createdAt: '2026-05-13T00:00:00.000Z',
  total: 12.50,
  totalCents: 1250,
  promoCode: 'WELCOME',
  discount: 0.1,
  items: [
    {
      id: 1,
      menuId: 1,
      qty: 2,
      priceAtOrder: 6.25,
      name: 'Burger',
      imageUrl: '/img/burger.jpg',
    },
  ],
  delivery: {
    name: 'Home',
    address: '123 St',
    phone: '555-1234',
  },
  ...overrides,
});

const noop = () => {};

describe('OrderRow', () => {
  it('renders discount as percentage, not as cents', () => {
    render(
      <OrderRow
        order={makeOrder({ discount: 0.15 })}
        expanded={true}
        detail={makeOrder({ discount: 0.15 })}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    // The discount should display "15%", NOT crash on fromCents
    expect(screen.getByText('15%')).toBeDefined();
  });

  it('renders 0% when discount is zero', () => {
    render(
      <OrderRow
        order={makeOrder({ discount: 0 })}
        expanded={true}
        detail={makeOrder({ discount: 0 })}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders totalCents correctly via formatMoney', () => {
    render(
      <OrderRow
        order={makeOrder()}
        expanded={true}
        detail={makeOrder()}
        detailLoading={false}
        updatingStatus={false}
        onToggle={noop}
        onStatusChange={noop}
      />,
    );

    // formatMoney(1250) should produce "₱12.50" — appears in both
    // the summary row and the expanded "Total:" line
    const matches = screen.getAllByText(/₱12\.50/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});