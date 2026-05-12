import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';

interface AdminGuardProps {
  children: ReactElement;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const isAuth = useAdminStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
