import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminLogin } from '@/api/admin';
import { useAdminStore } from '@/store/adminStore';

export function AdminLogin() {
  const navigate = useNavigate();
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { user } = await adminLogin(email, password);
      setAdminAuth(user);
      toast.success(`Welcome, ${user.name}`);
      navigate('/admin', { replace: true });
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || 'Login failed';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white mb-4">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-accent-charcoal">Admin Sign In</h1>
          <p className="text-sm text-accent-charcoal/50 mt-1">K-Gamay Management Panel</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-5">
          {err && (
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-500/20 text-brand-700 text-sm">
              {err}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-accent-charcoal/50 uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-charcoal/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kgamay.com"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-accent-charcoal/50 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-charcoal/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-accent-charcoal/30">
            This area is restricted to administrators only.
          </p>
        </form>
      </div>
    </div>
  );
}
