import apiClient, { getStoredRefreshToken } from './apiClient';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types/auth';

export const authApi = {
  async login(input: LoginInput) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
    return data;
  },
  async register(input: RegisterInput) {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
    return data;
  },
  async refresh(refreshToken?: string) {
    const token = refreshToken || getStoredRefreshToken();
    const { data } = await apiClient.post<AuthResponse>(
      '/auth/refresh',
      token ? { refreshToken: token } : {}
    );
    return data;
  },
  async me() {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
  async logout(refreshToken?: string) {
    const token = refreshToken || getStoredRefreshToken();
    await apiClient.post(
      '/auth/logout',
      token ? { refreshToken: token } : {}
    );
  },
};
