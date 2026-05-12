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
  const token = useAdminStore((s) => s.token);
  const adminUser = useAdminStore((s) => s.adminUser);
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);
  const location = useLocation();

  // Tracks the auto-detection attempt on first mount
  const [checking, setChecking] = useState(!token || !adminUser);

  useEffect(() => {
    // If we already have a stored token + user, skip the check
    if (token && adminUser) {
      setChecking(false);
      return;
    }

    // Try to detect an existing Better-Auth admin session via cookie
    let cancelled = false;
    getAdminMe()
      .then(({ token: t, user }) => {
        if (!cancelled) {
          setAdminAuth(t, user);
          setChecking(false);
        }
      })
      .catch(() => {
        // No valid admin session — show the login page
        if (!cancelled) setChecking(false);
      });

    return () => { cancelled = true; };
  }, [token, adminUser, setAdminAuth]);

  // While checking the session, show a spinner
  if (checking) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!token || !adminUser) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
