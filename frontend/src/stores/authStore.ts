import { create } from 'zustand';
import { authApi } from '../services/authApi';
import {
  setAccessToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
  getApiErrorMessage,
  SMARTSCHEDULE_USER_KEY,
} from '../services/apiClient';
import { isDemoMode, setDemoMode } from '../services/demoMode';
import type { AuthStatus, LoginInput, RegisterInput, User } from '../types/auth';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

const getInitialDemoTier = (): 'FREE' | 'PRO' => {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem('smartschedule-demo-tier');
    if (saved === 'FREE' || saved === 'PRO') return saved;
  }
  return 'PRO';
};

const DEMO_USER_PROFILE: User = {
  id: 'demo-user',
  email: 'nhi.vn@fpt.edu.vn',
  displayName: 'Vũ Ngọc Nhi',
  avatarUrl: '/avatar-nhi.png',
  enabled: true,
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  createdAt: new Date().toISOString(),
  tier: getInitialDemoTier(),
};

/**
 * Checks whether a JWT token is expired (or will expire within 30 seconds).
 */
export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Buffer by 30 seconds so we refresh slightly before hard expiry
    return Date.now() >= payload.exp * 1000 - 30000;
  } catch {
    return true;
  }
}

/**
 * Restores synchronous authentication state on initial page load / F5.
 * This guarantees ProtectedRoute NEVER flashes login or redirects prematurely on refresh!
 */
export function getInitialAuthState(): { user: User | null; status: AuthStatus } {
  const storage = getStorage();
  if (!storage) {
    return { user: null, status: 'INITIALIZING' };
  }
  if (isDemoMode()) {
    return {
      user: { ...DEMO_USER_PROFILE, tier: getInitialDemoTier() },
      status: 'AUTHENTICATED',
    };
  }

  const token = getStoredAccessToken();
  let user: User | null = null;
  try {
    const rawUser = storage.getItem(SMARTSCHEDULE_USER_KEY);
    if (rawUser) {
      user = JSON.parse(rawUser);
    }
  } catch {
    user = null;
  }

  // 1. If we have an unexpired access token and stored user:
  if (token && !isJwtExpired(token) && user) {
    setAccessToken(token);
    return { user, status: 'AUTHENTICATED' };
  }

  // 2. If we have a refresh token or an access token that might need refresh:
  const refreshToken = getStoredRefreshToken();
  if (refreshToken || token) {
    if (user) {
      return { user, status: 'INITIALIZING' };
    }
    return { user: null, status: 'INITIALIZING' };
  }

  // 3. No stored credentials at all:
  return { user: null, status: 'UNAUTHENTICATED' };
}

type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  demoLogin: () => void;
  exitDemoMode: () => void;
  register: (input: RegisterInput) => Promise<void>;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  setTier: (tier: 'FREE' | 'PRO') => void;
  clearError: () => void;
};

let bootstrapPromise: Promise<void> | null = null;

const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialAuth.user,
  status: initialAuth.status,
  error: null,

  login: async (input) => {
    set({ error: null });
    try {
      setDemoMode(false);
      localStorage.removeItem('smartschedule-demo-mode');
      const response = await authApi.login(input);
      setStoredTokens(response.accessToken, response.refreshToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      if (user) {
        localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(user));
      }
      set({ user, status: 'AUTHENTICATED', error: null });
    } catch (error) {
      set({ error: getApiErrorMessage(error) });
      throw error;
    }
  },

  demoLogin: () => {
    setDemoMode(true);
    localStorage.setItem('smartschedule-demo-mode', 'true');
    setStoredTokens('local-demo-token');
    const tier = getInitialDemoTier();
    const demoUser = { ...DEMO_USER_PROFILE, tier };
    localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(demoUser));
    set({
      user: demoUser,
      status: 'AUTHENTICATED',
      error: null,
    });
  },

  exitDemoMode: () => {
    setDemoMode(false);
    localStorage.removeItem('smartschedule-demo-mode');
    clearStoredTokens();
    localStorage.removeItem(SMARTSCHEDULE_USER_KEY);
    set({ user: null, status: 'UNAUTHENTICATED', error: null });
  },

  register: async (input) => {
    set({ error: null });
    try {
      setDemoMode(false);
      localStorage.removeItem('smartschedule-demo-mode');
      const response = await authApi.register(input);
      setStoredTokens(response.accessToken, response.refreshToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      if (user) {
        localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(user));
      }
      set({ user, status: 'AUTHENTICATED', error: null });
    } catch (error) {
      set({ error: getApiErrorMessage(error) });
      throw error;
    }
  },

  bootstrap: async () => {
    if (isDemoMode()) {
      setAccessToken('local-demo-token');
      const tier = getInitialDemoTier();
      const demoUser = { ...DEMO_USER_PROFILE, tier };
      set({ user: demoUser, status: 'AUTHENTICATED' });
      return;
    }

    // Deduplicate in-flight bootstrap requests (protects against React StrictMode calling bootstrap twice)
    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = (async () => {
      try {
        const storedToken = getStoredAccessToken();
        const storedRefresh = getStoredRefreshToken();

        // 1. If we already have a valid unexpired access token:
        if (storedToken && !isJwtExpired(storedToken)) {
          setAccessToken(storedToken);
          // In background, verify token validity with /auth/me and sync user profile
          try {
            const meUser = await authApi.me();
            const userWithTier = { ...meUser, tier: meUser.tier || 'PRO' };
            localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(userWithTier));
            set({ user: userWithTier, status: 'AUTHENTICATED' });
            return;
          } catch (meError: any) {
            // Only fall through to refresh if 401 Unauthorized (token invalid / revoked on server)
            if (meError?.response?.status !== 401) {
              // Network error or offline: maintain existing authenticated state!
              if (get().user) {
                set({ status: 'AUTHENTICATED' });
              }
              return;
            }
          }
        }

        // 2. Access token is missing, expired, or rejected with 401: Refresh session
        if (storedRefresh || storedToken) {
          try {
            const response = await authApi.refresh(storedRefresh || undefined);
            setStoredTokens(response.accessToken, response.refreshToken);
            const userWithTier = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
            if (userWithTier) {
              localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(userWithTier));
            }
            set({ user: userWithTier, status: 'AUTHENTICATED', error: null });
            return;
          } catch {
            // Refresh failed (refresh token expired or revoked): cleanly reset to unauthenticated
            clearStoredTokens();
            localStorage.removeItem(SMARTSCHEDULE_USER_KEY);
            set({ user: null, status: 'UNAUTHENTICATED' });
            return;
          }
        }

        // 3. No stored tokens: attempt cookie-only refresh (e.g. HttpOnly cookie from same-origin)
        try {
          const response = await authApi.refresh();
          setStoredTokens(response.accessToken, response.refreshToken);
          const userWithTier = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
          if (userWithTier) {
            localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(userWithTier));
          }
          set({ user: userWithTier, status: 'AUTHENTICATED', error: null });
        } catch {
          clearStoredTokens();
          localStorage.removeItem(SMARTSCHEDULE_USER_KEY);
          set({ user: null, status: 'UNAUTHENTICATED' });
        }
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },

  logout: async () => {
    const refreshToken = getStoredRefreshToken();
    localStorage.removeItem('smartschedule-demo-mode');
    clearStoredTokens();
    localStorage.removeItem(SMARTSCHEDULE_USER_KEY);
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      } else {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      set({ user: null, status: 'UNAUTHENTICATED', error: null });
    }
  },

  updateUser: (updated) => {
    set((state) => {
      const nextUser = state.user ? { ...state.user, ...updated } : null;
      if (nextUser) {
        try {
          localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(nextUser));
        } catch {}
      }
      return { user: nextUser };
    });
  },

  setTier: (tier: 'FREE' | 'PRO') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-tier', tier);
    }
    set((state) => {
      const nextUser = state.user ? { ...state.user, tier } : null;
      if (nextUser) {
        try {
          localStorage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(nextUser));
        } catch {}
      }
      return { user: nextUser };
    });
  },

  clearError: () => set({ error: null }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('smartschedule:auth-expired', () => {
    clearStoredTokens();
    localStorage.removeItem(SMARTSCHEDULE_USER_KEY);
    useAuthStore.setState({
      user: null,
      status: 'UNAUTHENTICATED',
      error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    });
  });
}
