import apiClient from './apiClient';
import type { PublicSchedule } from '../types/domain';

export const publicScheduleApi = {
  async get(token: string) {
    return (await apiClient.get<PublicSchedule>(`/shared/${encodeURIComponent(token)}`)).data;
  },
};
