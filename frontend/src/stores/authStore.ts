import { create } from 'zustand';
import { authApi } from '../services/authApi';
import {
  setAccessToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
  clearStoredTokens,
  clearStoredUser,
  getApiErrorMessage,
} from '../services/apiClient';
import { isDemoMode, setDemoMode } from '../services/demoMode';
import type { AuthStatus, GoogleAuthInput, GoogleAuthResponse, LoginInput, RegisterInput, User } from '../types/auth';

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
 * Computes initial auth state on app startup.
 * Guarantees that ProtectedRoute NEVER redirects to login or landing while session restoration is in progress!
 */
export function getInitialAuthState(): { user: User | null; status: AuthStatus; authInitialized: boolean } {
  const storage = getStorage();
  if (!storage) {
    return { user: null, status: 'INITIALIZING', authInitialized: false };
  }
  if (isDemoMode()) {
    return {
      user: { ...DEMO_USER_PROFILE, tier: getInitialDemoTier() },
      status: 'AUTHENTICATED',
      authInitialized: true,
    };
  }

  const token = getStoredAccessToken();
  const cachedUser = getStoredUser<User>();

  // 1. If we have an active, unexpired access token and cached user profile:
  // Fast-path: immediately authenticated, with silent verification in bootstrap
  if (token && !isJwtExpired(token) && cachedUser) {
    setAccessToken(token);
    return { user: cachedUser, status: 'AUTHENTICATED', authInitialized: true };
  }

  // 2. Token is missing or expired, but refresh cookie / refresh token might exist:
  // Must remain INITIALIZING with authInitialized = false until bootstrap() attempts refresh!
  return { user: cachedUser, status: 'INITIALIZING', authInitialized: false };
}

export type AuthState = {
  user: User | null;
  status: AuthStatus;
  authInitialized: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  googleAuth: (input: GoogleAuthInput) => Promise<GoogleAuthResponse>;
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
  authInitialized: initialAuth.authInitialized,
  error: null,

  googleAuth: async (input) => {
    set({ error: null });
    try {
      setDemoMode(false);
      localStorage.removeItem('smartschedule-demo-mode');
      const response = await authApi.googleAuth(input);
      if (response.status === 'AUTHENTICATED' && response.accessToken) {
        setStoredTokens(response.accessToken, response.refreshToken);
        const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
        if (user) {
          setStoredUser(user);
        }
        set({ user, status: 'AUTHENTICATED', authInitialized: true, error: null });
      }
      return response;
    } catch (error) {
      const msg = getApiErrorMessage(error);
      set({ error: msg });
      throw error;
    }
  },

  login: async (input) => {
    set({ error: null });
    try {
      setDemoMode(false);
      localStorage.removeItem('smartschedule-demo-mode');
      const response = await authApi.login(input);
      setStoredTokens(response.accessToken, response.refreshToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      if (user) {
        setStoredUser(user);
      }
      set({ user, status: 'AUTHENTICATED', authInitialized: true, error: null });
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
    setStoredUser(demoUser);
    set({
      user: demoUser,
      status: 'AUTHENTICATED',
      authInitialized: true,
      error: null,
    });
  },

  exitDemoMode: () => {
    setDemoMode(false);
    localStorage.removeItem('smartschedule-demo-mode');
    clearStoredTokens();
    clearStoredUser();
    set({ user: null, status: 'UNAUTHENTICATED', authInitialized: true, error: null });
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
        setStoredUser(user);
      }
      set({ user, status: 'AUTHENTICATED', authInitialized: true, error: null });
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
      set({ user: demoUser, status: 'AUTHENTICATED', authInitialized: true });
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

        // 1. If we have a valid unexpired access token:
        if (storedToken && !isJwtExpired(storedToken)) {
          setAccessToken(storedToken);
          const cached = getStoredUser<User>();
          if (cached) {
            set({ user: cached });
          }

          // In background, verify token validity with /auth/me and sync user profile
          try {
            const meUser = await authApi.me();
            const userWithTier = { ...meUser, tier: meUser.tier || 'PRO' };
            setStoredUser(userWithTier);
            set({ user: userWithTier, status: 'AUTHENTICATED', authInitialized: true, error: null });
            return;
          } catch (meError: any) {
            // Only if 401 Unauthorized (token was revoked on server), fall through to refresh
            if (meError?.response?.status !== 401) {
              // Network error or offline: maintain authenticated state!
              if (cached || get().user) {
                set({ status: 'AUTHENTICATED', authInitialized: true, error: null });
                return;
              }
            }
          }
        }

        // 2. Token is missing or expired, or /me returned 401: Refresh session
        // Can refresh via stored refresh token OR via HttpOnly cookie (withCredentials: true)
        try {
          const response = await authApi.refresh(storedRefresh || undefined);
          setStoredTokens(response.accessToken, response.refreshToken);
          const userWithTier = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
          if (userWithTier) {
            setStoredUser(userWithTier);
          }
          set({ user: userWithTier, status: 'AUTHENTICATED', authInitialized: true, error: null });
          return;
        } catch {
          // Both access token and refresh token / cookie failed (or were revoked / expired)
          clearStoredTokens();
          clearStoredUser();
          set({ user: null, status: 'UNAUTHENTICATED', authInitialized: true });
        }
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },

  logout: async () => {
    const refreshToken = getStoredRefreshToken();
    setDemoMode(false);
    localStorage.removeItem('smartschedule-demo-mode');
    clearStoredTokens();
    clearStoredUser();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      } else {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      set({ user: null, status: 'UNAUTHENTICATED', authInitialized: true, error: null });
    }
  },

  updateUser: (updated) => {
    set((state) => {
      const nextUser = state.user ? { ...state.user, ...updated } : null;
      if (nextUser) {
        setStoredUser(nextUser);
      }
      return { user: nextUser };
    });
  },

  setTier: (tier: 'FREE' | 'PRO') => {
    const storage = getStorage();
    if (storage) {
      storage.setItem('smartschedule-demo-tier', tier);
    }
    set((state) => {
      const nextUser = state.user ? { ...state.user, tier } : null;
      if (nextUser) {
        setStoredUser(nextUser);
      }
      return { user: nextUser };
    });
  },

  clearError: () => set({ error: null }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('smartschedule:auth-expired', () => {
    clearStoredTokens();
    clearStoredUser();
    useAuthStore.setState({
      user: null,
      status: 'UNAUTHENTICATED',
      authInitialized: true,
      error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    });
  });
}
