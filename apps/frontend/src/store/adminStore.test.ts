import { describe, it, expect, beforeEach } from 'vitest';
import { useAdminStore } from './adminStore';

describe('adminStore', () => {
  beforeEach(() => {
    useAdminStore.setState({ adminUser: null });
    localStorage.clear();
  });

  it('setAdminAuth stores adminUser without token', () => {
    const user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    useAdminStore.getState().setAdminAuth(user);
    const state = useAdminStore.getState();
    expect(state.adminUser).toEqual(user);
    // Token should not exist on the state at all
    expect((state as any).token).toBeUndefined();
  });

  it('isAuthenticated returns true only when adminUser exists', () => {
    expect(useAdminStore.getState().isAuthenticated()).toBe(false);
    useAdminStore.getState().setAdminAuth({ id: '1', email: 'a@b.com', name: 'A', role: 'admin' });
    expect(useAdminStore.getState().isAuthenticated()).toBe(true);
  });

  it('logout clears adminUser', () => {
    useAdminStore.getState().setAdminAuth({ id: '1', email: 'a@b.com', name: 'A', role: 'admin' });
    useAdminStore.getState().logout();
    expect(useAdminStore.getState().adminUser).toBeNull();
    expect(useAdminStore.getState().isAuthenticated()).toBe(false);
  });

  it('persisted state contains adminUser but NOT token', () => {
    const user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    useAdminStore.getState().setAdminAuth(user);
    const raw = localStorage.getItem('kgamay-admin-auth');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.adminUser).toEqual(user);
    expect((parsed.state as any).token).toBeUndefined();
  });
});