import type { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';

type TabKey = 'dashboard' | 'users' | 'orders' | 'menu' | 'promos' | 'ratings';

interface AdminLayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  children: ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-accent-charcoal/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-4 md:px-8 h-16 max-w-[1600px]">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight text-accent-charcoal">
              K-Gamay{' '}
              <span className="text-brand-500">Admin</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto">
        <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
