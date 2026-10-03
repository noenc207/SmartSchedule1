import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isDemoMode } from './demoMode';
import { demoAdapter } from './demoBackend';

export const CUSTOM_API_URL_KEY = 'smartschedule_custom_api_url';

export function getRawApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Check query parameter ?backendUrl=... or ?apiUrl=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryBackend = urlParams.get('backendUrl') || urlParams.get('apiUrl');
      if (queryBackend && queryBackend.trim()) {
        const cleaned = queryBackend.trim().replace(/\/+$/, '');
        localStorage.setItem(CUSTOM_API_URL_KEY, cleaned);
        return cleaned;
      }
    } catch {}

    // 2. Check localStorage override
    try {
      const stored = localStorage.getItem(CUSTOM_API_URL_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {}
  }

  // 3. Environment variables
  const envUrl =
    import.meta.env.VITEAPIURL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  if (envUrl && envUrl.trim() && envUrl !== 'http://localhost:8080') {
    return envUrl.trim();
  }

  return envUrl || 'http://localhost:8080';
}

export function getApiBaseUrl(): string {
  const raw = getRawApiUrl();
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/+$/, '')}/api/v1`;
}

export function setCustomApiUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (url && url.trim()) {
    const cleaned = url.trim().replace(/\/+$/, '');
    localStorage.setItem(CUSTOM_API_URL_KEY, cleaned);
    apiClient.defaults.baseURL = cleaned.endsWith('/api/v1') ? cleaned : `${cleaned}/api/v1`;
  } else {
    localStorage.removeItem(CUSTOM_API_URL_KEY);
    apiClient.defaults.baseURL = getApiBaseUrl();
  }
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const SMARTSCHEDULE_ACCESS_TOKEN_KEY = 'smartschedule_access_token';
export const SMARTSCHEDULE_REFRESH_TOKEN_KEY = 'smartschedule_refresh_token';
export const SMARTSCHEDULE_USER_KEY = 'smartschedule_user';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  return null;
}

export function getStoredAccessToken(): string | null {
  return getStorage()?.getItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY) ?? null;
}

export function getStoredRefreshToken(): string | null {
  return getStorage()?.getItem(SMARTSCHEDULE_REFRESH_TOKEN_KEY) ?? null;
}

export function setStoredTokens(token: string | null, refreshToken?: string | null) {
  accessToken = token;
  const storage = getStorage();
  if (!storage) return;
  try {
    if (token) {
      storage.setItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY, token);
    } else {
      storage.removeItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY);
    }
    if (refreshToken !== undefined) {
      if (refreshToken) {
        storage.setItem(SMARTSCHEDULE_REFRESH_TOKEN_KEY, refreshToken);
      } else {
        storage.removeItem(SMARTSCHEDULE_REFRESH_TOKEN_KEY);
      }
    }
  } catch {
    // localStorage might be unavailable/restricted in some environments
  }
}

export function clearStoredTokens() {
  accessToken = null;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY);
    storage.removeItem(SMARTSCHEDULE_REFRESH_TOKEN_KEY);
  } catch {
    // ignore storage error
  }
}

export function getStoredUser<T = any>(): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SMARTSCHEDULE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (user) {
      storage.setItem(SMARTSCHEDULE_USER_KEY, JSON.stringify(user));
    } else {
      storage.removeItem(SMARTSCHEDULE_USER_KEY);
    }
  } catch {
    // ignore storage error
  }
}

export function clearStoredUser(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(SMARTSCHEDULE_USER_KEY);
  } catch {
    // ignore storage error
  }
}

let accessToken: string | null = getStoredAccessToken();
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  const storage = getStorage();
  if (!storage) return;
  try {
    if (token) {
      storage.setItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY, token);
    } else {
      storage.removeItem(SMARTSCHEDULE_ACCESS_TOKEN_KEY);
    }
  } catch {
    // ignore storage error
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const storedRefresh = getStoredRefreshToken();
    refreshPromise = axios.post<{ accessToken: string; refreshToken?: string }>(
      `${getApiBaseUrl()}/auth/refresh`,
      storedRefresh ? { refreshToken: storedRefresh } : {},
      { withCredentials: true },
    ).then(({ data }) => {
      setStoredTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    }).catch(() => {
      clearStoredTokens();
      return null;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiBaseUrl();
  if (isDemoMode()) {
    config.adapter = demoAdapter;
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  const isAuthEndpoint = original?.url?.includes('/auth/login')
    || original?.url?.includes('/auth/register')
    || original?.url?.includes('/auth/refresh');
  if (error.response?.status !== 401 || !original || original._retry || isAuthEndpoint) {
    return Promise.reject(error);
  }
  original._retry = true;
  const token = await refreshAccessToken();
  if (!token) {
    window.dispatchEvent(new CustomEvent('smartschedule:auth-expired'));
    return Promise.reject(error);
  }
  original.headers.Authorization = `Bearer ${token}`;
  return apiClient(original);
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { code?: string; message?: string; fields?: Record<string, string> } | undefined;
    if (data?.message) {
      if (data.fields && Object.keys(data.fields).length > 0) {
        const details = Object.entries(data.fields).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `${data.message} (${details})`;
      }
      return data.message;
    }
    if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (error.response?.status === 404) return 'Không tìm thấy tài nguyên yêu cầu.';
    if (error.response?.status === 409) return 'Xung đột dữ liệu hoặc phiên bản lịch đã thay đổi.';
    if (error.response?.status === 422) return 'Dữ liệu gửi lên không hợp lệ.';
    if (error.response?.status && error.response.status >= 500) return 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.';
    if (error.message === 'Network Error') {
      const currentTarget = getRawApiUrl();
      const isProductionHost =
        typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';
      const isLocalhostTarget =
        currentTarget.includes('localhost') || currentTarget.includes('127.0.0.1');

      if (isProductionHost && isLocalhostTarget) {
        return `Không thể kết nối đến máy chủ backend (${currentTarget}). Vui lòng cấu hình biến môi trường VITE_API_URL trong Vercel Settings trỏ về URL Render của bạn.`;
      }
      return `Không thể kết nối đến máy chủ backend (${currentTarget}). Vui lòng kiểm tra kết nối mạng hoặc trạng thái máy chủ.`;
    }
    return error.message || 'Đã xảy ra lỗi không xác định.';
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}

export default apiClient;
