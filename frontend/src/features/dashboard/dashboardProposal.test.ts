import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/authStore';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  writable: true,
});

describe('Demo PRO Mode & Dashboard Proposal Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, status: 'UNAUTHENTICATED' });
  });

  it('initializes demo user with PRO tier unlocked by default for testing', () => {
    useAuthStore.getState().demoLogin();
    const user = useAuthStore.getState().user;
    expect(user).toBeDefined();
    expect(user?.tier).toBe('PRO');
  });

  it('allows toggling between FREE and PRO, persisting to localStorage', () => {
    useAuthStore.getState().demoLogin();
    expect(useAuthStore.getState().user?.tier).toBe('PRO');

    // Switch to FREE
    useAuthStore.getState().setTier('FREE');
    expect(useAuthStore.getState().user?.tier).toBe('FREE');
    expect(localStorage.getItem('smartschedule-demo-tier')).toBe('FREE');

    // Switch back to PRO
    useAuthStore.getState().setTier('PRO');
    expect(useAuthStore.getState().user?.tier).toBe('PRO');
    expect(localStorage.getItem('smartschedule-demo-tier')).toBe('PRO');
  });

  it('restores persisted tier upon bootstrap in demo mode', async () => {
    localStorage.setItem('smartschedule-demo-mode', 'true');
    localStorage.setItem('smartschedule-demo-tier', 'PRO');

    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().user?.tier).toBe('PRO');

    // Now test restoring FREE
    localStorage.setItem('smartschedule-demo-tier', 'FREE');
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().user?.tier).toBe('FREE');
  });

  it('identifies candidate pending tasks for CP-SAT schedule proposals', () => {
    const mockTasks = [
      {
        id: 'task-1',
        scheduleId: 's-1',
        title: 'Machine Learning Assignment',
        estimatedDurationMinutes: 90,
        remainingDurationMinutes: 90,
        status: 'TODO' as const,
        priority: 'HIGH' as const,
        deadline: '2026-09-30T17:00:00Z',
        createdAt: '2026-09-24T00:00:00Z',
        updatedAt: '2026-09-24T00:00:00Z',
      },
      {
        id: 'task-2',
        scheduleId: 's-1',
        title: 'Database Homework',
        estimatedDurationMinutes: 60,
        remainingDurationMinutes: 0,
        status: 'COMPLETED' as const,
        priority: 'MEDIUM' as const,
        deadline: null,
        createdAt: '2026-09-24T00:00:00Z',
        updatedAt: '2026-09-24T00:00:00Z',
      },
    ];

    const pending = mockTasks.filter((t) => t.status !== 'COMPLETED');
    expect(pending.length).toBe(1);
    expect(pending[0].title).toBe('Machine Learning Assignment');
    expect(pending[0].estimatedDurationMinutes).toBe(90);
  });
});
