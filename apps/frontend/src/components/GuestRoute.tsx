import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface Props {
  children: ReactNode;
}

/**
 * Renders children only if the user is NOT logged in.
 * Redirects to /menu if already authenticated.
 */
export function GuestRoute({ children }: Props) {
  const token = useAuthStore((s) => s.token);

  if (token) {
    return <Navigate to="/menu" replace />;
  }
  return <>{children}</>;
}
