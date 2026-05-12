import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  UtensilsCrossed,
  TicketPercent,
  Star,
} from 'lucide-react';

const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users' as const, label: 'Users', icon: Users },
  { key: 'orders' as const, label: 'Orders', icon: ShoppingBag },
  { key: 'menu' as const, label: 'Menu', icon: UtensilsCrossed },
  { key: 'promos' as const, label: 'Promos', icon: TicketPercent },
  { key: 'ratings' as const, label: 'Ratings', icon: Star },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface AdminSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 border-r border-accent-charcoal/5 bg-white min-h-[calc(100vh-4rem)] sticky top-16 self-start">
        <div className="p-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-500/10 text-brand-600'
                    : 'text-accent-charcoal/50 hover:text-accent-charcoal hover:bg-surface-soft'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-accent-charcoal/5">
        <div className="flex justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-all ${
                  active
                    ? 'text-brand-500'
                    : 'text-accent-charcoal/40 hover:text-accent-charcoal/60'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
