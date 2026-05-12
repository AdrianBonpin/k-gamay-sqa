import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { Menu } from '@/pages/Menu';
import { MenuItemDetail } from '@/pages/MenuItemDetail';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { Orders } from '@/pages/Orders';
import { OrderDetail } from '@/pages/OrderDetail';
import { About } from '@/pages/About';
import { Help } from '@/pages/Help';
import { Privacy } from '@/pages/Privacy';
import { NotFound } from '@/pages/NotFound';

interface RouteDef {
  path: string;
  element: ReactElement;
  protected?: boolean;
}

const ROUTES: RouteDef[] = [
  { path: '/', element: <Home /> },
  { path: '/menu', element: <Menu /> },
  { path: '/menu/:id', element: <MenuItemDetail /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/about', element: <About /> },
  { path: '/help', element: <Help /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/cart', element: <Cart /> },
  { path: '/checkout', element: <Checkout />, protected: true },
  { path: '/orders', element: <Orders />, protected: true },
  { path: '/orders/:id', element: <OrderDetail />, protected: true },
  { path: '*', element: <NotFound /> },
];

function PageShell({ children }: { children: ReactElement }): ReactElement {
  return <div className="animate-fadein">{children}</div>;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {ROUTES.map((r) => {
            const wrapped = <PageShell>{r.element}</PageShell>;
            const finalElement = r.protected ? <ProtectedRoute>{wrapped}</ProtectedRoute> : wrapped;
            return <Route key={r.path} path={r.path} element={finalElement} />;
          })}
        </Routes>
      </main>

      <Footer />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: '1rem',
            background: '#1A1A1A',
            color: '#FAF7F2',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#FF4B3A', secondary: '#FAF7F2' } },
          error: { iconTheme: { primary: '#FF4B3A', secondary: '#FAF7F2' } },
        }}
      />
    </div>
  );
}
