import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User as UserIcon, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { signup } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractError } from '@/api/client';

export function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await signup(email, password, name);
      if (res.token && res.user) {
        setAuth(res.token, res.user);
        toast.success(`Welcome, ${res.user.name.split(' ')[0]}! Here's 15% off with code WELCOME`);
        navigate('/menu', { replace: true });
      } else {
        // Anti-enumeration: server returned a generic ok for a duplicate email.
        toast.success(res.message ?? 'Check your inbox to verify your account');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      const msg = extractError(error, 'Signup failed');
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      <div className="hidden md:block relative rounded-3xl overflow-hidden aspect-[4/5] max-h-[640px] shadow-lift order-2 md:order-1">
        <img
          src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&q=80"
          alt="A chef plating a dish"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tl from-accent-charcoal/80 via-accent-charcoal/20 to-brand-500/40" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <p className="font-display italic text-2xl lg:text-3xl leading-snug">
            "Signed up, got 15% off, and ate like royalty. The app is almost too easy."
          </p>
          <p className="mt-4 text-sm text-white/80">Marcus L. · K-Gamay member</p>
        </div>
      </div>

      <div className="flex items-center justify-center md:py-8 order-1 md:order-2">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-hero text-white shadow-glow">
              <UtensilsCrossed className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl font-bold">K-Gamay</span>
          </Link>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
            Join the <em className="text-brand-500 not-italic">table</em>.
          </h1>
          <p className="mt-3 text-accent-charcoal/60">
            Create an account to place orders, earn rewards, and reorder favorites in a tap.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input
              label="Your name"
              name="name"
              autoComplete="name"
              required
              leftIcon={<UserIcon className="h-4 w-4" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Chen"
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              error={err ?? undefined}
            />
            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-sm text-accent-charcoal/60">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
