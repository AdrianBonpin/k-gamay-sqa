import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './client';
import { submitRating, fetchRatings, fetchMyRating, fetchRatingsSummary } from './ratings';

describe('ratings api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('submitRating POSTs to /ratings with payload', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { rating: { id: 1, stars: 5, review: 'yum' } } } as never);
    const res = await submitRating({ menuId: 7, stars: 5, review: 'yum' });
    expect(post).toHaveBeenCalledWith('/ratings', { menuId: 7, stars: 5, review: 'yum' });
    expect(res.rating.stars).toBe(5);
  });

  it('fetchRatings GETs /ratings/:menuId', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: { summary: { menuId: 7, average: 4.2, count: 9 }, ratings: [] },
    } as never);
    const res = await fetchRatings(7);
    expect(get).toHaveBeenCalledWith('/ratings/7');
    expect(res.summary.average).toBe(4.2);
    expect(res.summary.count).toBe(9);
  });

  it('fetchMyRating GETs /ratings/:menuId/mine', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { rating: null } } as never);
    const res = await fetchMyRating(42);
    expect(get).toHaveBeenCalledWith('/ratings/42/mine');
    expect(res.rating).toBeNull();
  });

  it('fetchRatingsSummary GETs /ratings/summary', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { total: 123 } } as never);
    const res = await fetchRatingsSummary();
    expect(get).toHaveBeenCalledWith('/ratings/summary');
    expect(res.total).toBe(123);
  });
});
