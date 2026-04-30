import { Elysia } from 'elysia';
import { listMenuItems } from '../services/menuService';

export const menuRoutes = new Elysia({ prefix: '/api/menu' }).get('/', async () => {
  return listMenuItems();
});
