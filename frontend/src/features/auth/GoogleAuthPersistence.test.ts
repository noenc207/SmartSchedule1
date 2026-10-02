import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError } from 'axios';

// Provide global localStorage mock for Node test environment
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

import { useAuthStore, getInitialAuthState } from '../../stores/authStore';
import { authApi } from '../../services/authApi';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  setStoredUser,
  clearStoredTokens,
  clearStoredUser,
} from '../../services/apiClient';

describe('Google Quick Sign-Up & Auth Flow', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    clearStoredTokens();
    clearStoredUser();
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      status: 'UNAUTHENTICATED',
      authInitialized: true,
      error: null,
    });
  });

  it('1. New Google user without key returns KEY_REQUIRED and does not authenticate yet', async () => {
    vi.spyOn(authApi, 'googleAuth').mockResolvedValueOnce({
      status: 'KEY_REQUIRED',
      email: 'new.student@fpt.edu.vn',
      displayName: 'New Student',
      avatarUrl: 'https://example.com/avatar.png',
    });

    const response = await useAuthStore.getState().googleAuth({
      idToken: 'mock-google-token:sub-100:new.student@fpt.edu.vn:New Student',
    });

    expect(response.status).toBe('KEY_REQUIRED');
    expect(response.email).toBe('new.student@fpt.edu.vn');
    // Store must remain unauthenticated
    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it('2. New Google user with valid Registration Key creates account and authenticates', async () => {
    // Generate valid unexpired JWT (1 hour in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'student@fpt.edu.vn', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'googleAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      accessToken: mockAccessToken,
      refreshToken: 'mock-refresh-token-google-1',
      expiresIn: 900,
      user: {
        id: 'user-google-1',
        email: 'student@fpt.edu.vn',
        displayName: 'Student One',
        avatarUrl: 'https://example.com/photo.png',
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    const response = await useAuthStore.getState().googleAuth({
      idToken: 'mock-google-token:sub-101:student@fpt.edu.vn:Student One',
      registrationKey: 'SMART-GOOGLE-KEY-2026',
    });

    expect(response.status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('student@fpt.edu.vn');
    expect(getStoredAccessToken()).toBe(mockAccessToken);
    expect(getStoredRefreshToken()).toBe('mock-refresh-token-google-1');
  });

  it('3. New Google user with invalid key throws error and does not authenticate', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: {} as any,
        data: { message: 'Mã kích hoạt không chính xác hoặc đã hết hạn.' },
      }
    );
    vi.spyOn(authApi, 'googleAuth').mockRejectedValueOnce(axiosError);

    await expect(
      useAuthStore.getState().googleAuth({
        idToken: 'mock-google-token:sub-102:invalid@fpt.edu.vn:Invalid User',
        registrationKey: 'WRONG-KEY',
      })
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe('Mã kích hoạt không chính xác hoặc đã hết hạn.');
  });

  it('4. Existing Google user authenticates directly WITHOUT Registration Key', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'existing@fpt.edu.vn', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'googleAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      accessToken: mockAccessToken,
      refreshToken: 'mock-refresh-existing-google',
      expiresIn: 900,
      user: {
        id: 'user-existing-google',
        email: 'existing@fpt.edu.vn',
        displayName: 'Existing Google Student',
        avatarUrl: 'https://example.com/avatar.png',
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    // Note: NO registrationKey supplied!
    const response = await useAuthStore.getState().googleAuth({
      idToken: 'mock-google-token:sub-existing-999:existing@fpt.edu.vn:Existing Google Student',
    });

    expect(response.status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('existing@fpt.edu.vn');
    expect(getStoredAccessToken()).toBe(mockAccessToken);
  });

  it('5. Session Persistence: F5 / page reload restores authenticated Google session', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'google.persisted@fpt.edu.vn', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    // Simulate active stored tokens from previous Google sign-in using helper functions
    setStoredTokens(mockAccessToken, 'refresh-token-persisted');
    setStoredUser({
      id: 'google-persisted-1',
      email: 'google.persisted@fpt.edu.vn',
      displayName: 'Persisted Google User',
      avatarUrl: null,
      enabled: true,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      createdAt: new Date().toISOString(),
      tier: 'PRO',
    });

    // Call getInitialAuthState (which runs synchronously on browser reload)
    const initial = getInitialAuthState();
    expect(initial.status).toBe('AUTHENTICATED');
    expect(initial.authInitialized).toBe(true);
    expect(initial.user?.email).toBe('google.persisted@fpt.edu.vn');
  });

  it('6. Logout clears Google session and subsequent Google login for existing user does not ask for key', async () => {
    vi.spyOn(authApi, 'logout').mockResolvedValueOnce();

    // User is logged in
    useAuthStore.setState({
      user: {
        id: 'google-logout-user',
        email: 'logout.user@fpt.edu.vn',
        displayName: 'Logout User',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
      status: 'AUTHENTICATED',
      authInitialized: true,
    });
    setStoredTokens('token-to-be-cleared');

    // Perform logout
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
    expect(getStoredAccessToken()).toBeNull();

    // User logs in again with Google (CASE E) -> Backend recognizes existing user -> Directly logs in without key
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'logout.user@fpt.edu.vn', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'googleAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      accessToken: mockAccessToken,
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
      user: {
        id: 'google-logout-user',
        email: 'logout.user@fpt.edu.vn',
        displayName: 'Logout User',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    const secondLogin = await useAuthStore.getState().googleAuth({
      idToken: 'mock-google-token:sub-logout:logout.user@fpt.edu.vn:Logout User',
    });

    expect(secondLogin.status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('logout.user@fpt.edu.vn');
  });
});
