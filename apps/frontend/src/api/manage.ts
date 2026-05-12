import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { extractError } from './client';

// Manage routes live at /manage (not /api/manage).
// Use bare relative paths so they work regardless of VITE_API_BASE_URL.
// Always use empty baseURL — manage routes live at /manage, not /api/manage
const manageApi = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

manageApi.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = uuidv4();
  }
  return config;
});

// ---------------------------------------------------------------------------
// Types for manage responses
// ---------------------------------------------------------------------------

export interface DashboardStats {
  users: number;
  orders: number;
  menuItems: number;
  promos: number;
  ratings: number;
  revenue: number;
  revenueCents: number;
  ordersByStatus: {
    pending: number;
    in_progress: number;
    delivered: number;
  };
}

export interface ManageUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  orderCount?: number;
}

export interface ManageUserDetail extends ManageUser {
  orders: ManageOrder[];
}

export interface ManageOrderItem {
  id: number;
  menuId: number;
  qty: number;
  priceAtOrder: number;
  name: string;
  description?: string;
  imageUrl: string;
  category?: string;
}

export interface ManageDelivery {
  name: string;
  address: string;
  phone: string;
}

export interface ManageOrder {
  id: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  status: string;
  createdAt: string;
  total: number;
  totalCents: number;
  promoCode: string | null;
  discount: number;
  items: ManageOrderItem[];
  delivery: ManageDelivery | null;
}

export interface ManageMenuItem {
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

export interface ManagePromo {
  code: string;
  discount: number;
  description: string;
  expiresAt: string | null;
  maxUses: number | null;
  maxPerUser: number | null;
  firstOrderOnly: boolean;
  useCount: number;
}

export interface ManageRating {
  id: number;
  userId: number;
  menuId: number;
  stars: number;
  review: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  menuName: string;
}

export interface ManageRatingsResponse {
  ratings: ManageRating[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headers(manageKey: string) {
  return { 'x-manage-key': manageKey };
}

export { extractError };

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(manageKey: string): Promise<{ ok: boolean; stats: DashboardStats }> {
  const { data } = await manageApi.get('/manage', { headers: headers(manageKey) });
  return data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(manageKey: string): Promise<ManageUser[]> {
  const { data } = await manageApi.get('/manage/users', { headers: headers(manageKey) });
  return data;
}

export async function getUser(manageKey: string, id: number): Promise<ManageUserDetail> {
  const { data } = await manageApi.get(`/manage/users/${id}`, { headers: headers(manageKey) });
  return data;
}

export async function deleteUser(manageKey: string, id: number): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/manage/users/${id}`, { headers: headers(manageKey) });
  return data;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function listOrders(
  manageKey: string,
  status?: string,
): Promise<ManageOrder[]> {
  const params: Record<string, string> = {};
  if (status && ['pending', 'in_progress', 'delivered'].includes(status)) {
    params.status = status;
  }
  const { data } = await manageApi.get('/manage/orders', {
    headers: headers(manageKey),
    params,
  });
  return data;
}

export async function getOrder(manageKey: string, id: number): Promise<ManageOrder> {
  const { data } = await manageApi.get(`/manage/orders/${id}`, { headers: headers(manageKey) });
  return data;
}

export async function updateOrderStatus(
  manageKey: string,
  id: number,
  status: string,
): Promise<ManageOrder & { previousStatus: string }> {
  const { data } = await manageApi.patch(
    `/manage/orders/${id}/status`,
    { status },
    { headers: headers(manageKey) },
  );
  return data;
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export async function listMenu(manageKey: string): Promise<ManageMenuItem[]> {
  const { data } = await manageApi.get('/manage/menu', { headers: headers(manageKey) });
  return data;
}

export async function createMenuItem(
  manageKey: string,
  item: { name: string; description?: string; price: number; imageUrl?: string; category: string },
): Promise<ManageMenuItem> {
  const { data } = await manageApi.post('/manage/menu', item, { headers: headers(manageKey) });
  return data;
}

export async function updateMenuItem(
  manageKey: string,
  id: number,
  updates: Partial<{ name: string; description: string; price: number; imageUrl: string; category: string }>,
): Promise<ManageMenuItem> {
  const { data } = await manageApi.patch(`/manage/menu/${id}`, updates, { headers: headers(manageKey) });
  return data;
}

export async function deleteMenuItem(
  manageKey: string,
  id: number,
): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/manage/menu/${id}`, { headers: headers(manageKey) });
  return data;
}

// ---------------------------------------------------------------------------
// Promos
// ---------------------------------------------------------------------------

export async function listPromos(manageKey: string): Promise<ManagePromo[]> {
  const { data } = await manageApi.get('/manage/promos', { headers: headers(manageKey) });
  return data;
}

export async function createPromo(
  manageKey: string,
  promo: {
    code: string;
    discount: number;
    description?: string;
    expiresAt?: string;
    maxUses?: number;
    maxPerUser?: number;
    firstOrderOnly?: boolean;
  },
): Promise<ManagePromo> {
  const { data } = await manageApi.post('/manage/promos', promo, { headers: headers(manageKey) });
  return data;
}

export async function deletePromo(
  manageKey: string,
  code: string,
): Promise<{ ok: boolean; deleted: string }> {
  const { data } = await manageApi.delete(`/manage/promos/${encodeURIComponent(code)}`, {
    headers: headers(manageKey),
  });
  return data;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export async function listRatings(
  manageKey: string,
  limit?: number,
  offset?: number,
): Promise<ManageRatingsResponse> {
  const params: Record<string, number> = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  const { data } = await manageApi.get('/manage/ratings', {
    headers: headers(manageKey),
    params,
  });
  return data;
}

export async function deleteRating(
  manageKey: string,
  id: number,
): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/manage/ratings/${id}`, { headers: headers(manageKey) });
  return data;
}
