import { describe, expect, it, beforeEach, vi } from 'vitest';

// Provide global localStorage mock for Node environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

import { isJwtExpired, useAuthStore, getInitialAuthState } from '../../stores/authStore';
import {
  SMARTSCHEDULE_ACCESS_TOKEN_KEY,
  SMARTSCHEDULE_REFRESH_TOKEN_KEY,
  SMARTSCHEDULE_USER_KEY,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
  clearStoredTokens,
  clearStoredUser,
} from '../../services/apiClient';
import { authApi } from '../../services/authApi';

// Helper to create a mock JWT with exp (seconds from now)
function createMockJwt(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = btoa(JSON.stringify({ sub: 'user-123', exp }));
  return `${header}.${payload}.signature`;
}

describe('AuthSessionPersistence and F5 reload flow', () => {
  beforeEach(() => {
    storageMap.clear();
    clearStoredTokens();
    clearStoredUser();
    useAuthStore.setState({ user: null, status: 'UNAUTHENTICATED', authInitialized: true, error: null });
    vi.restoreAllMocks();
  });

  describe('isJwtExpired', () => {
    it('returns true for null or empty tokens', () => {
      expect(isJwtExpired(null)).toBe(true);
      expect(isJwtExpired('')).toBe(true);
      expect(isJwtExpired('invalid-token')).toBe(true);
    });

    it('returns false for token that expires far in the future', () => {
      const validToken = createMockJwt(3600); // 1 hour future
      expect(isJwtExpired(validToken)).toBe(false);
    });

    it('returns true for token that has already expired', () => {
      const expiredToken = createMockJwt(-60); // 1 minute ago
      expect(isJwtExpired(expiredToken)).toBe(true);
    });

    it('returns true for token expiring within 30 seconds buffer', () => {
      const nearExpiryToken = createMockJwt(15); // 15 seconds future
      expect(isJwtExpired(nearExpiryToken)).toBe(true);
    });
  });

  describe('Token storage helpers', () => {
    it('sets and retrieves access and refresh tokens in localStorage', () => {
      setStoredTokens('test-access', 'test-refresh');
      expect(getStoredAccessToken()).toBe('test-access');
      expect(getStoredRefreshToken()).toBe('test-refresh');
      expect(storageMap.get(SMARTSCHEDULE_ACCESS_TOKEN_KEY)).toBe('test-access');
      expect(storageMap.get(SMARTSCHEDULE_REFRESH_TOKEN_KEY)).toBe('test-refresh');

      clearStoredTokens();
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });

    it('sets and retrieves user profile in storage', () => {
      const user = { id: 'u-1', email: 'test@example.com' };
      setStoredUser(user);
      expect(getStoredUser()).toEqual(user);

      clearStoredUser();
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('Login & Logout lifecycle', () => {
    it('login persists tokens and user profile to localStorage', async () => {
      const mockUser = {
        id: 'user-abc',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO' as const,
      };

      vi.spyOn(authApi, 'login').mockResolvedValueOnce({
        accessToken: createMockJwt(3600),
        refreshToken: 'mock-refresh-token-xyz',
        expiresIn: 3600,
        user: mockUser,
      });

      await useAuthStore.getState().login({ email: 'test@example.com', password: 'password123' });

      expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('test@example.com');
      expect(getStoredRefreshToken()).toBe('mock-refresh-token-xyz');
      expect(storageMap.get(SMARTSCHEDULE_USER_KEY)).toBeTruthy();
      expect(JSON.parse(storageMap.get(SMARTSCHEDULE_USER_KEY)!).email).toBe('test@example.com');
    });

    it('logout clears all tokens and user from localStorage and calls authApi.logout', async () => {
      setStoredTokens('access-tok', 'refresh-tok');
      storageMap.set(SMARTSCHEDULE_USER_KEY, JSON.stringify({ id: '1' }));
      storageMap.set('smartschedule-demo-mode', 'true');

      const logoutSpy = vi.spyOn(authApi, 'logout').mockResolvedValueOnce();

      await useAuthStore.getState().logout();

      expect(logoutSpy).toHaveBeenCalledWith('refresh-tok');
      expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
      expect(storageMap.get(SMARTSCHEDULE_USER_KEY)).toBeUndefined();
      expect(storageMap.get('smartschedule-demo-mode')).toBeUndefined();
    });
  });

  describe('CASE 1: F5 reload with valid unexpired token', () => {
    it('restores authenticated state with background /auth/me verification', async () => {
      const validToken = createMockJwt(3600);
      const storedUser = {
        id: 'u-1',
        email: 'persisted@fpt.edu.vn',
        displayName: 'Persisted User',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO' as const,
      };

      setStoredTokens(validToken, 'refresh-tok');
      storageMap.set(SMARTSCHEDULE_USER_KEY, JSON.stringify(storedUser));

      const meSpy = vi.spyOn(authApi, 'me').mockResolvedValueOnce({
        ...storedUser,
        displayName: 'Updated From Server',
      });

      await useAuthStore.getState().bootstrap();

      expect(meSpy).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(useAuthStore.getState().user?.displayName).toBe('Updated From Server');
    });
  });

  describe('CASE 2 & 3: Close tab / close browser and re-open with expired access token', () => {
    it('automatically refreshes session via refresh token / cookie without kicking user to login', async () => {
      const expiredToken = createMockJwt(-100);
      const newUser = {
        id: 'u-2',
        email: 'refreshed@fpt.edu.vn',
        displayName: 'Refreshed User',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO' as const,
      };

      // Simulated state after tab was closed for 30 minutes
      setStoredTokens(expiredToken, 'valid-refresh-token');

      const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValueOnce({
        accessToken: createMockJwt(3600),
        refreshToken: 'rotated-refresh-token',
        expiresIn: 3600,
        user: newUser,
      });

      await useAuthStore.getState().bootstrap();

      expect(refreshSpy).toHaveBeenCalledWith('valid-refresh-token');
      expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('refreshed@fpt.edu.vn');
      expect(getStoredRefreshToken()).toBe('rotated-refresh-token');
    });
  });

  describe('CASE 5: Expired or revoked refresh token transitions to UNAUTHENTICATED', () => {
    it('sets UNAUTHENTICATED when refresh fails with invalid/expired refresh token', async () => {
      setStoredTokens(createMockJwt(-100), 'expired-refresh-token');

      vi.spyOn(authApi, 'refresh').mockRejectedValueOnce(new Error('Invalid refresh token'));

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });
  });

  describe('StrictMode & Concurrency protection', () => {
    it('deduplicates concurrent bootstrap calls into a single execution', async () => {
      const validToken = createMockJwt(3600);
      setStoredTokens(validToken, 'refresh-tok');

      const meSpy = vi.spyOn(authApi, 'me').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          id: 'u-1',
          email: 'concurrent@fpt.edu.vn',
          displayName: 'User',
          avatarUrl: null,
          enabled: true,
          timezone: 'Asia/Ho_Chi_Minh',
          locale: 'vi',
          createdAt: new Date().toISOString(),
          tier: 'PRO',
        }), 20))
      );

      // Trigger bootstrap twice concurrently as React StrictMode does
      const call1 = useAuthStore.getState().bootstrap();
      const call2 = useAuthStore.getState().bootstrap();

      await Promise.all([call1, call2]);

      // authApi.me should be called EXACTLY once
      expect(meSpy).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
      expect(useAuthStore.getState().authInitialized).toBe(true);
    });
  });

  describe('Startup Initial State (getInitialAuthState)', () => {
    it('starts with INITIALIZING and authInitialized=false when access token is missing or expired', () => {
      // Missing token
      const state1 = getInitialAuthState();
      expect(state1.authInitialized).toBe(false);
      expect(state1.status).toBe('INITIALIZING');

      // Expired token
      setStoredTokens(createMockJwt(-50), 'ref-1');
      const state2 = getInitialAuthState();
      expect(state2.authInitialized).toBe(false);
      expect(state2.status).toBe('INITIALIZING');
    });

    it('starts with AUTHENTICATED and authInitialized=true when valid unexpired token and user exist', () => {
      setStoredTokens(createMockJwt(3600), 'ref-1');
      const user = { id: 'u-1', email: 'valid@example.com' };
      setStoredUser(user);

      const state = getInitialAuthState();
      expect(state.authInitialized).toBe(true);
      expect(state.status).toBe('AUTHENTICATED');
      expect(state.user).toEqual(user);
    });
  });
});
