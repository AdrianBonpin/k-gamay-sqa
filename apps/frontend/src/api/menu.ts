import { api } from './client';
import type { MenuItem } from '@/types';

export async function getMenu(): Promise<MenuItem[]> {
  const { data } = await api.get<MenuItem[]>('/menu');
  return data;
}
