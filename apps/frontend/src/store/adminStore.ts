import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminState {
  adminUser: AdminUser | null;
  setAdminAuth: (adminUser: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      adminUser: null,
      setAdminAuth: (adminUser) => set({ adminUser }),
      logout: () => set({ adminUser: null }),
      isAuthenticated: () => Boolean(get().adminUser),
    }),
    { name: 'kgamay-admin-auth' },
  ),
);