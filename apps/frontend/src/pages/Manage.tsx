import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardTab } from '@/components/admin/DashboardTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { MenuTab } from '@/components/admin/MenuTab';
import { PromosTab } from '@/components/admin/PromosTab';
import { RatingsTab } from '@/components/admin/RatingsTab';

type TabKey = 'dashboard' | 'users' | 'orders' | 'menu' | 'promos' | 'ratings';

export function Manage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'menu' && <MenuTab />}
      {activeTab === 'promos' && <PromosTab />}
      {activeTab === 'ratings' && <RatingsTab />}
    </AdminLayout>
  );
}
