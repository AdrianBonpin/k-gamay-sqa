import { api } from './client';
import type { PromoCode } from '@/types';

export async function fetchActivePromos(signal?: AbortSignal): Promise<PromoCode[]> {
  const { data } = await api.get<PromoCode[]>('/promo/codes', { signal });
  return data;
}
