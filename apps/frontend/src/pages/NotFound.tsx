import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-8xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 font-display text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-accent-charcoal/60">
        The page you're looking for has either moved or doesn't exist. Let's get you somewhere
        tasty.
      </p>
      <Link to="/" className="mt-8 inline-flex btn btn-primary btn-size-lg">
        <Home className="h-4 w-4" />
        Back home
      </Link>
    </div>
  );
}
