import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  User,
  LogOut,
  UtensilsCrossed,
  Utensils,
  Home as HomeIcon,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { classNames } from '@/lib/utils';

export function Navbar() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user dropdown on outside click + Escape.
  useEffect(() => {
    if (!userMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenu]);

  const handleLogout = () => {
    logout();
    setUserMenu(false);
    navigate('/');
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    classNames(
      'inline-flex items-center gap-2 text-sm font-semibold transition-colors',
      isActive ? 'text-brand-600' : 'text-accent-charcoal/65 hover:text-accent-charcoal',
    );

  return (
    <header
      className={classNames(
        'sticky top-0 z-40 transition-all duration-300 bg-surface/80 backdrop-blur-lg',
        scrolled ? 'shadow-soft border-b border-accent-charcoal/5' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="K-Gamay home">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-hero text-white shadow-glow transition-transform group-hover:scale-105">
              <UtensilsCrossed className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl font-bold text-accent-charcoal">K-Gamay</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            <NavLink to="/" end className={linkCls}>
              <HomeIcon className="h-4 w-4" strokeWidth={2.2} />
              Home
            </NavLink>
            <NavLink to="/menu" className={linkCls}>
              <Utensils className="h-4 w-4" strokeWidth={2.2} />
              Menu
            </NavLink>
            {token && (
              <NavLink to="/orders" className={linkCls}>
                <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
                Orders
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to="/cart"
              aria-label={`Cart with ${count} items`}
              className="relative grid h-11 w-11 place-items-center rounded-full bg-white border border-accent-charcoal/10 hover:border-accent-charcoal/30 hover:shadow-soft transition"
            >
              <ShoppingBag className="h-5 w-5 text-accent-charcoal" />
              {count > 0 && (
                <span
                  key={count}
                  className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold grid place-items-center shadow-glow animate-pulse"
                >
                  {count}
                </span>
              )}
            </Link>

            {token && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                  className="hidden md:flex items-center gap-2 rounded-full bg-white border border-accent-charcoal/10 hover:border-accent-charcoal/30 hover:shadow-soft pr-3 pl-1 py-1 transition"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-charcoal text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-accent-charcoal truncate max-w-[8rem]">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                {userMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 card p-2 z-50 animate-fadein"
                    role="menu"
                  >
                    <div className="px-3 py-2 border-b border-accent-charcoal/5 mb-1">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-accent-charcoal/60 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/orders"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-soft text-sm font-medium"
                      role="menuitem"
                    >
                      <User className="h-4 w-4" />
                      My Orders
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-soft text-sm font-medium text-brand-600"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="hidden md:inline-flex btn btn-primary btn-size-md">
                Sign in
              </Link>
            )}

            <button
              onClick={() => setMobile((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden grid h-11 w-11 place-items-center rounded-full bg-white border border-accent-charcoal/10 text-accent-charcoal"
            >
              {mobile ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobile && (
        <div className="md:hidden overflow-hidden bg-white border-t border-accent-charcoal/5 animate-fadein">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            <NavLink
              to="/"
              end
              onClick={() => setMobile(false)}
              className="px-3 py-3 rounded-xl hover:bg-surface-soft font-semibold"
            >
              Home
            </NavLink>
            <NavLink
              to="/menu"
              onClick={() => setMobile(false)}
              className="px-3 py-3 rounded-xl hover:bg-surface-soft font-semibold"
            >
              Menu
            </NavLink>
            {token ? (
              <>
                <NavLink
                  to="/orders"
                  onClick={() => setMobile(false)}
                  className="px-3 py-3 rounded-xl hover:bg-surface-soft font-semibold"
                >
                  My Orders
                </NavLink>
                <button
                  onClick={() => {
                    setMobile(false);
                    handleLogout();
                  }}
                  className="px-3 py-3 rounded-xl hover:bg-surface-soft font-semibold text-brand-600 text-left"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobile(false)}
                className="btn btn-primary btn-size-md mt-2"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
