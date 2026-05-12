import { api } from './client';
import type { DeliveryInfo, Order, PlaceOrderResponse, PromoValidation } from '@/types';

export interface PlaceOrderPayload {
  items: { menuId: number; qty: number }[];
  promoCode?: string;
  delivery: DeliveryInfo;
  paymentMethod?: string;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResponse> {
  const { data } = await api.post<PlaceOrderResponse>('/orders', payload);
  return data;
}

export async function listOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/orders');
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

export async function validatePromo(code: string): Promise<PromoValidation> {
  const { data } = await api.post<PromoValidation>('/promo/validate', { code });
  return data;
}
