# K-Gamay — Frontend

Modern React 18 + TypeScript + Vite frontend for the SQA Food Delivery App.

## Stack

- Vite + React 18 + TypeScript (strict)
- TailwindCSS v3 (warm, appetizing theme)
- React Router v6
- Zustand (persisted) for auth + cart
- Axios with auth interceptor
- Framer Motion for micro-interactions
- React Hot Toast
- Lucide-react icons

## Scripts

Run from the **repo root** (workspaces handle the install):

```bash
npm install                                # installs frontend + backend deps
npm run dev:frontend                       # vite dev server on :5173
npm --workspace apps/frontend run build    # typecheck + production build
```

Or from `apps/frontend`:

```bash
npm run dev        # vite
npm run build      # tsc && vite build
npm run typecheck  # tsc --noEmit
npm run preview    # preview built assets
```

## Structure

```
src/
├── api/           axios client + per-domain calls (auth, menu, orders)
├── components/    Navbar, Footer, MenuCard, CartItem, StatusBadge, EmptyState, ProtectedRoute
│   └── ui/        Button, Input, Card, LoadingSpinner, Skeleton
├── lib/           utils (formatMoney, formatDate, classNames)
├── pages/         Home, Menu, Login, Signup, Cart, Checkout, Orders, OrderDetail, NotFound
├── store/         Zustand stores (authStore, cartStore, both persisted)
├── types/         Shared TypeScript types mirroring backend contracts
├── App.tsx        Router + animated page transitions + Toaster
├── main.tsx       React entry
└── index.css      Tailwind directives + component classes + utilities
```

## Design tokens

Defined in `tailwind.config.js`:

- `brand` — coral/red-orange (`#FF4B3A`) primary scale
- `accent.mustard`, `accent.forest`, `accent.cream`, `accent.charcoal`
- `surface` — warm off-white backgrounds
- Fonts — Inter (UI), Playfair Display (display/serif)
- Custom shadows: `soft`, `lift`, `glow`

## Dev proxy

`vite.config.ts` proxies `/api/*` to `http://localhost:3001` so the frontend works against the real backend with zero CORS fuss during development.

## Accessibility

- `alt` text on every image
- `aria-label` on icon-only buttons
- Keyboard-focusable controls with visible focus rings
- Semantic landmarks (`<header>`, `<main>`, `<footer>`, `<nav>`, `<aside>`)
- Respects `prefers-reduced-motion` via Framer Motion's defaults
