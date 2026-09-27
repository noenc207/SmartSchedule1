import { create } from 'zustand';
import { authApi } from '../services/authApi';
import { setAccessToken, getApiErrorMessage } from '../services/apiClient';
import { isDemoMode } from '../services/demoMode';
import type { AuthStatus, LoginInput, RegisterInput, User } from '../types/auth';

const getInitialDemoTier = (): 'FREE' | 'PRO' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smartschedule-demo-tier');
    if (saved === 'FREE' || saved === 'PRO') return saved;
  }
  return 'PRO'; // Default to PRO unlocked for demo testing
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'INITIALIZING',
  error: null,
  login: async (input) => {
    set({ error: null });
    try {
      const response = await authApi.login(input);
      setAccessToken(response.accessToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      set({ user, status: 'AUTHENTICATED' });
    } catch (error) {
      set({ error: getApiErrorMessage(error) });
      throw error;
    }
  },
  demoLogin: () => {
    localStorage.setItem('smartschedule-demo-mode', 'true');
    setAccessToken('local-demo-token');
    const tier = getInitialDemoTier();
    set({
      user: { ...DEMO_USER_PROFILE, tier },
      status: 'AUTHENTICATED',
      error: null,
    });
  },
  exitDemoMode: () => {
    localStorage.removeItem('smartschedule-demo-mode');
    setAccessToken(null);
    set({ user: null, status: 'UNAUTHENTICATED', error: null });
  },
  register: async (input) => {
    set({ error: null });
    try {
      const response = await authApi.register(input);
      setAccessToken(response.accessToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      set({ user, status: 'AUTHENTICATED' });
    } catch (error) {
      set({ error: getApiErrorMessage(error) });
      throw error;
    }
  },
  bootstrap: async () => {
    if (isDemoMode()) {
      setAccessToken('local-demo-token');
      const tier = getInitialDemoTier();
      set({ user: { ...DEMO_USER_PROFILE, tier }, status: 'AUTHENTICATED' });
      return;
    }
    set({ status: 'INITIALIZING' });
    try {
      const response = await authApi.refresh();
      setAccessToken(response.accessToken);
      const user = response.user ? { ...response.user, tier: response.user.tier || 'PRO' } : null;
      set({ user, status: 'AUTHENTICATED' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'UNAUTHENTICATED' });
    }
  },
  logout: async () => {
    localStorage.removeItem('smartschedule-demo-mode');
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'UNAUTHENTICATED', error: null });
    }
  },
  updateUser: (updated) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updated } : null,
    }));
  },
  setTier: (tier: 'FREE' | 'PRO') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-tier', tier);
    }
    set((state) => ({
      user: state.user ? { ...state.user, tier } : null,
    }));
  },
  clearError: () => set({ error: null }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('smartschedule:auth-expired', () => {
    useAuthStore.setState({ user: null, status: 'UNAUTHENTICATED', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  });
}
