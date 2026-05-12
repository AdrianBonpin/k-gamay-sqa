import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { extractError } from './client';

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

export { extractError };

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(): Promise<{ ok: boolean; stats: DashboardStats }> {
  const { data } = await manageApi.get('/api/manage');
  return data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<ManageUser[]> {
  const { data } = await manageApi.get('/manage/users');
  return data;
}

export async function getUser(id: number): Promise<ManageUserDetail> {
  const { data } = await manageApi.get(`/api/manage/users/${id}`);
  return data;
}

export async function deleteUser(id: number): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/api/manage/users/${id}`);
  return data;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function listOrders(
  status?: string,
): Promise<ManageOrder[]> {
  const params: Record<string, string> = {};
  if (status && ['pending', 'in_progress', 'delivered'].includes(status)) {
    params.status = status;
  }
  const { data } = await manageApi.get('/manage/orders', { params });
  return data;
}

export async function getOrder(id: number): Promise<ManageOrder> {
  const { data } = await manageApi.get(`/api/manage/orders/${id}`);
  return data;
}

export async function updateOrderStatus(
  id: number,
  status: string,
): Promise<ManageOrder & { previousStatus: string }> {
  const { data } = await manageApi.patch(`/api/manage/orders/${id}/status`, { status });
  return data;
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export async function listMenu(): Promise<ManageMenuItem[]> {
  const { data } = await manageApi.get('/manage/menu');
  return data;
}

export async function createMenuItem(
  item: { name: string; description?: string; price: number; imageUrl?: string; category: string },
): Promise<ManageMenuItem> {
  const { data } = await manageApi.post('/manage/menu', item);
  return data;
}

export async function updateMenuItem(
  id: number,
  updates: Partial<{ name: string; description: string; price: number; imageUrl: string; category: string }>,
): Promise<ManageMenuItem> {
  const { data } = await manageApi.patch(`/api/manage/menu/${id}`, updates);
  return data;
}

export async function deleteMenuItem(id: number): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/api/manage/menu/${id}`);
  return data;
}

// ---------------------------------------------------------------------------
// Promos
// ---------------------------------------------------------------------------

export async function listPromos(): Promise<ManagePromo[]> {
  const { data } = await manageApi.get('/manage/promos');
  return data;
}

export async function createPromo(
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
  const { data } = await manageApi.post('/manage/promos', promo);
  return data;
}

export async function deletePromo(code: string): Promise<{ ok: boolean; deleted: string }> {
  const { data } = await manageApi.delete(`/api/manage/promos/${encodeURIComponent(code)}`);
  return data;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export async function listRatings(
  limit?: number,
  offset?: number,
): Promise<ManageRatingsResponse> {
  const params: Record<string, number> = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  const { data } = await manageApi.get('/manage/ratings', { params });
  return data;
}

export async function deleteRating(id: number): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await manageApi.delete(`/api/manage/ratings/${id}`);
  return data;
}
