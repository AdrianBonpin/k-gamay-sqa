import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Star, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMenu } from '@/api/menu';
import { useCartStore } from '@/store/cartStore';
import type { MenuItem } from '@/types';
import { formatMoney } from '@/lib/utils';

const CATEGORIES = [
  {
    name: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    emoji: '🍔',
  },
  {
    name: 'Pizza',
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&q=80',
    emoji: '🍕',
  },
  {
    name: 'Asian',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
    emoji: '🍜',
  },
  {
    name: 'Desserts',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
    emoji: '🍰',
  },
  {
    name: 'Drinks',
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80',
    emoji: '🥤',
  },
];

export function Home() {
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const addToCart = useCartStore((s) => s.add);

  useEffect(() => {
    getMenu()
      .then((items) => setFeatured(items.slice(0, 6)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-grain" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8 pt-10 md:pt-20 pb-16 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fadein">
            <span className="inline-flex items-center gap-2 badge bg-brand-50 text-brand-700 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Fresh kitchens, delivered
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] text-balance">
              Craving <em className="text-brand-500 not-italic">something</em>
              <br />
              <span className="italic">good</span>?
            </h1>
            <p className="mt-5 text-lg md:text-xl text-accent-charcoal/65 max-w-lg text-pretty">
              Hand-picked local favorites, from crispy wood-fired pizza to late-night desserts —
              ordered in a tap, at your door in minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/menu" className="btn btn-primary btn-size-lg">
                Browse the menu
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup" className="btn btn-ghost btn-size-lg">
                Create an account
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat icon={<Clock className="h-4 w-4" />} value="30 min" label="Avg delivery" />
              <Stat icon={<Star className="h-4 w-4" />} value="4.9" label="Customer rating" />
              <Stat icon={<Truck className="h-4 w-4" />} value="Free" label="Over $20" />
            </div>
          </div>

          <div className="relative hidden md:block animate-fadein">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-lift">
              <img
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&q=80"
                alt="A freshly served gourmet dish"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 via-transparent to-accent-mustard/20" />
            </div>
            <div
              className="absolute -bottom-6 -left-8 card p-4 flex items-center gap-3 shadow-lift max-w-[240px] animate-fadein"
              style={{ animationDelay: '200ms' }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-accent-charcoal/60">Your order arrives in</p>
                <p className="font-display text-xl font-bold">25 minutes</p>
              </div>
            </div>
            <div
              className="absolute -top-4 -right-6 card px-4 py-3 shadow-lift animate-fadein"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-accent-mustard text-accent-mustard" />
                <Star className="h-4 w-4 fill-accent-mustard text-accent-mustard" />
                <Star className="h-4 w-4 fill-accent-mustard text-accent-mustard" />
                <Star className="h-4 w-4 fill-accent-mustard text-accent-mustard" />
                <Star className="h-4 w-4 fill-accent-mustard text-accent-mustard" />
              </div>
              <p className="mt-1 text-xs text-accent-charcoal/60">
                <span className="font-bold text-accent-charcoal">Rated</span> by real customers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Browse by craving</h2>
            <p className="mt-1.5 text-accent-charcoal/60">
              Jump straight to what hits the spot right now.
            </p>
          </div>
          <Link
            to="/menu"
            className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 menu-stagger">
          {CATEGORIES.map((c) => (
            <div key={c.name} className="animate-fadein">
              <Link
                to={`/menu?cat=${encodeURIComponent(c.name)}`}
                className="group block relative aspect-square rounded-3xl overflow-hidden shadow-soft hover:shadow-lift transition-all"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent-charcoal/80 via-accent-charcoal/20 to-transparent" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <span className="text-3xl mb-1">{c.emoji}</span>
                  <h3 className="font-display text-xl font-bold text-white">{c.name}</h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Tonight&apos;s favorites
            </h2>
            <p className="mt-1.5 text-accent-charcoal/60">
              Trending dishes the neighborhood loves.
            </p>
          </div>
          <Link
            to="/menu"
            className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View full menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible menu-stagger">
          {featured.map((item) => (
            <article
              key={item.id}
              className="card overflow-hidden p-0 group min-w-[280px] md:min-w-0 hover:shadow-lift transition-all animate-fadein"
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 badge bg-white/90 backdrop-blur text-accent-charcoal">
                  {item.category}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl leading-tight">{item.name}</h3>
                  <span className="font-display text-xl text-brand-600 shrink-0">
                    {formatMoney(item.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-accent-charcoal/60 line-clamp-2">
                  {item.description}
                </p>
                <button
                  onClick={() => {
                    addToCart(item);
                    toast.success(`${item.name} added to cart`);
                  }}
                  className="mt-4 btn btn-primary btn-size-sm w-full"
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-hero text-white p-10 md:p-14">
          <div className="absolute inset-0 opacity-20">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight">
                First order?
                <br />
                <span className="italic">15% off, on us.</span>
              </h2>
              <p className="mt-3 text-white/85 text-lg max-w-md">
                Sign up and use code <span className="font-bold tracking-wide">WELCOME</span> at
                checkout.
              </p>
            </div>
            <div className="md:text-right">
              <Link
                to="/signup"
                className="btn btn-size-lg bg-white text-brand-600 hover:bg-surface font-bold"
              >
                Claim my discount
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface StatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}
function Stat({ icon, value, label }: StatProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-brand-600">
        {icon}
        <span className="font-display font-bold text-lg">{value}</span>
      </div>
      <p className="text-xs text-accent-charcoal/60 mt-0.5">{label}</p>
    </div>
  );
}
