import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminState {
  token: string | null;
  adminUser: AdminUser | null;
  setAdminAuth: (token: string, adminUser: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      token: null,
      adminUser: null,
      setAdminAuth: (token, adminUser) => set({ token, adminUser }),
      logout: () => set({ token: null, adminUser: null }),
      isAuthenticated: () => Boolean(get().token && get().adminUser),
    }),
    { name: 'kgamay-admin-auth' },
  ),
);