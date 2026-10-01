import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isDemoMode } from './demoMode';
import { demoAdapter } from './demoBackend';

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const apiBaseUrl = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios.post<{ accessToken: string }>(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    ).then(({ data }) => {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }).catch(() => {
      setAccessToken(null);
      return null;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      return `Không thể kết nối đến máy chủ backend (${serverUrl}).`;
    }
    return error.message || 'Đã xảy ra lỗi không xác định.';
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}

export default apiClient;
