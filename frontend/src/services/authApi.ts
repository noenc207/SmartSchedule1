import apiClient, { getStoredRefreshToken } from './apiClient';
import type {
  AuthResponse,
  GoogleAuthInput,
  GoogleAuthResponse,
  LoginInput,
  RegisterInput,
  SocialAuthInput,
  SocialAuthResponse,
  User,
} from '../types/auth';

export const authApi = {
  async googleAuth(input: GoogleAuthInput) {
    const { data } = await apiClient.post<GoogleAuthResponse>('/auth/google', input);
    return data;
  },
  async githubAuth(input: SocialAuthInput) {
    const { data } = await apiClient.post<SocialAuthResponse>('/auth/github', input);
    return data;
  },
  async facebookAuth(input: SocialAuthInput) {
    const { data } = await apiClient.post<SocialAuthResponse>('/auth/facebook', input);
    return data;
  },
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
