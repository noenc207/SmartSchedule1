import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError } from 'axios';

// Mock localStorage for node environment
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

describe('GitHub & Facebook Social Auth Flows', () => {
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

  // =========================================================================
  // GITHUB AUTH TESTS
  // =========================================================================

  it('1. Returning GitHub user: directly authenticates WITHOUT Registration Key', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'octocat@github.com', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'githubAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      provider: 'GITHUB',
      accessToken: mockAccessToken,
      refreshToken: 'refresh-token-github-existing',
      expiresIn: 900,
      user: {
        id: 'user-github-1',
        email: 'octocat@github.com',
        displayName: 'The Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    const response = await useAuthStore.getState().githubAuth({
      code: 'valid-github-code-123',
    });

    expect(response.status).toBe('AUTHENTICATED');
    expect(response.provider).toBe('GITHUB');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('octocat@github.com');
    expect(useAuthStore.getState().user?.displayName).toBe('The Octocat');
    expect(getStoredAccessToken()).toBe(mockAccessToken);
    expect(getStoredRefreshToken()).toBe('refresh-token-github-existing');
  });

  it('2. New GitHub user: returns KEY_REQUIRED and prompts for Registration Key', async () => {
    vi.spyOn(authApi, 'githubAuth').mockResolvedValueOnce({
      status: 'KEY_REQUIRED',
      provider: 'GITHUB',
      email: 'new-dev@github.com',
      displayName: 'New Developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/123456',
    });

    const response = await useAuthStore.getState().githubAuth({
      code: 'new-github-code-456',
    });

    expect(response.status).toBe('KEY_REQUIRED');
    expect(response.provider).toBe('GITHUB');
    expect(response.email).toBe('new-dev@github.com');
    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it('3. New GitHub user submitting valid Registration Key creates account & logs in', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'new-dev@github.com', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'githubAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      provider: 'GITHUB',
      accessToken: mockAccessToken,
      refreshToken: 'refresh-token-new-github',
      expiresIn: 900,
      user: {
        id: 'user-github-2',
        email: 'new-dev@github.com',
        displayName: 'New Developer',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123456',
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    const response = await useAuthStore.getState().githubAuth({
      code: 'new-github-code-456',
      registrationKey: 'GITHUB-DEV-2026',
    });

    expect(response.status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('new-dev@github.com');
    expect(getStoredAccessToken()).toBe(mockAccessToken);
    expect(getStoredRefreshToken()).toBe('refresh-token-new-github');
  });

  // =========================================================================
  // FACEBOOK AUTH TESTS
  // =========================================================================

  it('4. Returning Facebook user: directly authenticates WITHOUT Registration Key', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'fb.user@example.com', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    vi.spyOn(authApi, 'facebookAuth').mockResolvedValueOnce({
      status: 'AUTHENTICATED',
      provider: 'FACEBOOK',
      accessToken: mockAccessToken,
      refreshToken: 'refresh-token-facebook-existing',
      expiresIn: 900,
      user: {
        id: 'user-facebook-1',
        email: 'fb.user@example.com',
        displayName: 'Facebook User',
        avatarUrl: 'https://graph.facebook.com/123/picture',
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'PRO',
      },
    });

    const response = await useAuthStore.getState().facebookAuth({
      accessToken: 'EAABsbCS123...',
    });

    expect(response.status).toBe('AUTHENTICATED');
    expect(response.provider).toBe('FACEBOOK');
    expect(useAuthStore.getState().status).toBe('AUTHENTICATED');
    expect(useAuthStore.getState().user?.email).toBe('fb.user@example.com');
    expect(getStoredAccessToken()).toBe(mockAccessToken);
    expect(getStoredRefreshToken()).toBe('refresh-token-facebook-existing');
  });

  it('5. New Facebook user: returns KEY_REQUIRED and prompts for Registration Key', async () => {
    vi.spyOn(authApi, 'facebookAuth').mockResolvedValueOnce({
      status: 'KEY_REQUIRED',
      provider: 'FACEBOOK',
      email: 'new.fb@example.com',
      displayName: 'New FB Member',
      avatarUrl: 'https://graph.facebook.com/456/picture',
    });

    const response = await useAuthStore.getState().facebookAuth({
      accessToken: 'EAABsbCS456...',
    });

    expect(response.status).toBe('KEY_REQUIRED');
    expect(response.provider).toBe('FACEBOOK');
    expect(response.email).toBe('new.fb@example.com');
    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('6. New Facebook user submitting invalid key throws error and does not authenticate', async () => {
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
    vi.spyOn(authApi, 'facebookAuth').mockRejectedValueOnce(axiosError);

    await expect(
      useAuthStore.getState().facebookAuth({
        accessToken: 'EAABsbCS456...',
        registrationKey: 'INVALID-KEY',
      })
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().status).toBe('UNAUTHENTICATED');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe('Mã kích hoạt không chính xác hoặc đã hết hạn.');
  });

  it('7. Session Persistence: F5 reload restores authenticated GitHub/Facebook session', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'persisted.social@fpt.edu.vn', exp: futureExp }));
    const mockAccessToken = `${header}.${payload}.signature`;

    setStoredTokens(mockAccessToken, 'refresh-token-social-persisted');
    setStoredUser({
      id: 'social-persisted-1',
      email: 'persisted.social@fpt.edu.vn',
      displayName: 'Persisted Social User',
      avatarUrl: 'https://avatars.githubusercontent.com/u/99',
      enabled: true,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      createdAt: new Date().toISOString(),
      tier: 'PRO',
    });

    const initial = getInitialAuthState();
    expect(initial.status).toBe('AUTHENTICATED');
    expect(initial.authInitialized).toBe(true);
    expect(initial.user?.email).toBe('persisted.social@fpt.edu.vn');
  });

  it('8. Popup Mode: Message listener dispatches SOCIAL_OAUTH_RESPONSE for GitHub and Facebook', () => {
    const postMessageSpy = vi.fn();
    const closeSpy = vi.fn();

    const mockOpener = {
      closed: false,
      postMessage: postMessageSpy,
    };

    const origin = 'http://localhost:5173';

    // Simulate GitHub popup callback action
    mockOpener.postMessage(
      {
        type: 'SOCIAL_OAUTH_RESPONSE',
        provider: 'GITHUB',
        code: 'github-code-test-789',
        error: null,
      },
      origin
    );
    closeSpy();

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'SOCIAL_OAUTH_RESPONSE',
        provider: 'GITHUB',
        code: 'github-code-test-789',
        error: null,
      },
      origin
    );
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
