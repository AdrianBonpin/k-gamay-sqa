import { api } from './client';
import type { Rating, RatingSummary } from '@/types';

export interface SubmitRatingPayload {
  menuId: number;
  stars: number;
  review?: string;
}

export async function submitRating(payload: SubmitRatingPayload): Promise<{ rating: Rating }> {
  const { data } = await api.post<{ rating: Rating }>('/ratings', payload);
  return data;
}

export async function fetchRatings(
  menuId: number,
): Promise<{ summary: RatingSummary; ratings: Rating[] }> {
  const { data } = await api.get<{ summary: RatingSummary; ratings: Rating[] }>(
    `/ratings/${menuId}`,
  );
  return data;
}

export async function fetchMyRating(menuId: number): Promise<{ rating: Rating | null }> {
  const { data } = await api.get<{ rating: Rating | null }>(`/ratings/${menuId}/mine`);
  return data;
}

export async function fetchRatingsSummary(): Promise<{ total: number }> {
  const { data } = await api.get<{ total: number }>('/ratings/summary');
  return data;
}
