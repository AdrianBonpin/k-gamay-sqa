import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractError } from '@/api/client';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/menu';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (error) {
      const msg = extractError(error, 'Login failed');
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-hero text-white shadow-glow">
              <UtensilsCrossed className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl font-bold">K-Gamay</span>
          </Link>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
            Welcome <em className="text-brand-500 not-italic">back</em>.
          </h1>
          <p className="mt-3 text-accent-charcoal/60">
            Sign in to track your orders and reorder your favorites.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            {err && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-700 px-4 py-3 text-sm font-medium"
              >
                {err}
              </div>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-sm text-accent-charcoal/60">
            New to K-Gamay?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block relative">
        <img
          src="https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1400&q=80"
          alt="Gourmet food flat-lay"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/70 via-brand-500/30 to-accent-mustard/40" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-display italic text-3xl leading-snug max-w-md">
            &ldquo;The best burger I&apos;ve had in years. Arrived still-warm and somehow better
            than pick-up.&rdquo;
          </p>
          <p className="mt-4 text-sm text-white/80">— Priya M. · Regular since 2024</p>
        </div>
      </div>
    </div>
  );
}
