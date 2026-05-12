/** Shared types between backend and frontend */

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  rating?: {
    menuId: number;
    average: number;
    count: number;
  };
}

export interface OrderItem {
  id: number;
  menuId: number;
  qty: number;
  priceAtOrder: number;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}

export interface Order {
  id: number;
  userId: string;
  total: number;
  totalCents: number;
  status: 'pending' | 'in_progress' | 'delivered';
  createdAt: string;
  promoCode: string | null;
  discount: number;
  paymentMethod: string | null;
  items: OrderItem[];
  delivery: {
    name: string;
    address: string;
    phone: string;
  } | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Rating {
  id: number;
  userId: string;
  menuId: number;
  stars: number;
  review: string | null;
  createdAt: string;
}

export interface RatingSummary {
  menuId: number;
  average: number;
  count: number;
}

export interface Promo {
  code: string;
  discount: number;
  description: string;
  firstOrderOnly: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
