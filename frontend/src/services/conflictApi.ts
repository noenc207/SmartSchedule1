import apiClient from './apiClient';
import type { ConflictAnalysis } from '../types/domain';

export const conflictApi = {
  async analyze(scheduleId: string, from: string, to: string) {
    return (await apiClient.get<ConflictAnalysis>(`/schedules/${scheduleId}/conflicts`, { params: { from, to } })).data;
  },
};
