export interface User {
  id: number;
  email: string;
  name: string;
}

export interface RatingSummary {
  menuId: number;
  average: number; // 0..5, 1 decimal
  count: number;
}

export interface Rating {
  id: number;
  userId: number;
  menuId: number;
  stars: number;
  review: string | null;
  createdAt: string;
  userName?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  rating?: RatingSummary;
}

export interface CartItem {
  menuId: number;
  name: string;
  price: number;
  priceCents: number;
  imageUrl: string;
  qty: number;
}

export type OrderStatus = 'pending' | 'in_progress' | 'delivered';

export interface OrderItem {
  id: number;
  menuId: number;
  qty: number;
  priceAtOrder: number;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
}

// Alias retained for backward-compatibility with existing frontend imports.
export type OrderLineItem = OrderItem;

export interface DeliveryInfo {
  name: string;
  address: string;
  phone: string;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  totalCents?: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  promoCode?: string | null;
  discount?: number;
  delivery?: DeliveryInfo | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupGenericResponse {
  ok: true;
  message: string;
}

export type SignupResponse =
  | (AuthResponse & { ok?: undefined; message?: undefined })
  | (SignupGenericResponse & { token?: undefined; user?: undefined });

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PromoCode {
  code: string;
  discount: number;
  description: string;
  firstOrderOnly?: boolean;
}

export interface PromoValidation {
  valid: boolean;
  discount: number;
  code?: string;
  message?: string;
}

export interface PlaceOrderPayload {
  items: { menuId: number; qty: number }[];
  promoCode?: string;
  delivery: DeliveryInfo;
}

export interface PlaceOrderResponse {
  orderId: number;
  total: number;
  totalCents?: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  promoCode: string | null;
  discount: number;
  delivery?: DeliveryInfo | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}
