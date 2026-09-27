import apiClient from './apiClient';
import type { User } from '../types/auth';

export type UpdateUserProfileInput = {
  name?: string;
  avatarUrl?: string | null;
  timezone?: string;
  locale?: string;
};

export type BackendUserResponse = {
  id: string;
  name?: string;
  displayName?: string;
  email: string;
  avatarUrl?: string | null;
  timezone: string;
  locale: string;
  createdAt: string;
  tier?: string;
};

function normalizeUser(data: BackendUserResponse): User {
  return {
    id: data.id,
    email: data.email,
    displayName: data.name || data.displayName || '',
    avatarUrl: data.avatarUrl ?? null,
    enabled: true,
    timezone: data.timezone || 'Asia/Ho_Chi_Minh',
    locale: data.locale || 'vi-VN',
    createdAt: data.createdAt || new Date().toISOString(),
    tier: data.tier === 'FREE' ? 'FREE' : 'PRO',
  };
}

export const userApi = {
  async get(): Promise<User> {
    const { data } = await apiClient.get<BackendUserResponse>('/users/me');
    return normalizeUser(data);
  },
  async update(input: UpdateUserProfileInput): Promise<User> {
    const { data } = await apiClient.patch<BackendUserResponse>('/users/me', input);
    return normalizeUser(data);
  },
  async upgradePro(): Promise<User> {
    const { data } = await apiClient.post<BackendUserResponse>('/users/me/upgrade-pro');
    return normalizeUser(data);
  },
  async downgradeFree(): Promise<User> {
    const { data } = await apiClient.post<BackendUserResponse>('/users/me/downgrade-free');
    return normalizeUser(data);
  },
};
