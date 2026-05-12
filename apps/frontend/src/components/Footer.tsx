import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-accent-charcoal/5 bg-white/50">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero text-white">
            <UtensilsCrossed className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold">K-Gamay</span>
        </div>
        <p className="text-sm text-accent-charcoal/50">
          © {new Date().getFullYear()} K-Gamay. Coursework project for IT 3202N SQA.
        </p>
        <div className="flex gap-6 text-sm text-accent-charcoal/60">
          <Link to="/about" className="hover:text-brand-600 transition">
            About
          </Link>
          <Link to="/help" className="hover:text-brand-600 transition">
            Help
          </Link>
          <Link to="/privacy" className="hover:text-brand-600 transition">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
