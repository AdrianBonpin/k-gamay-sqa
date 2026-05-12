import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { getAdminMe } from '@/api/admin';

interface AdminGuardProps {
  children: ReactElement;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const adminUser = useAdminStore((s) => s.adminUser);
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);
  const location = useLocation();

  // Tracks the server verification on mount
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // ALWAYS verify with the server — cached adminUser is NOT proof of auth
    getAdminMe()
      .then(({ user }) => {
        if (!cancelled) {
          setAdminAuth(user);
          setVerified(true);
        }
      })
      .catch(() => {
        // No valid admin session — redirect to login
        if (!cancelled) setVerified(true);
      });

    return () => { cancelled = true; };
  }, [setAdminAuth]);

  // While verifying, show a spinner (or cached user as skeleton hint)
  if (!verified) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}