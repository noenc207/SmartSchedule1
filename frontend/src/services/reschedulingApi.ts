import apiClient from './apiClient';
import type { RescheduleAlternative, RescheduleResult, ReschedulingRequest, RescheduleImpact, WhatIfResult } from '../types/domain';

export const reschedulingApi = {
  async analyze(scheduleId: string, request: ReschedulingRequest) {
    return (await apiClient.post<RescheduleImpact>(`/schedules/${scheduleId}/rescheduling/analyze`, request)).data;
  },
  async generate(scheduleId: string, request: ReschedulingRequest) {
    return (await apiClient.post<RescheduleResult>(`/schedules/${scheduleId}/rescheduling/generate`, request)).data;
  },
  async apply(scheduleId: string, alternative: RescheduleAlternative) {
    return (await apiClient.post<RescheduleResult>(`/schedules/${scheduleId}/rescheduling/apply`, alternative)).data;
  },
  async whatIf(scheduleId: string, request: ReschedulingRequest) {
    return (await apiClient.post<WhatIfResult>(`/schedules/${scheduleId}/what-if`, request)).data;
  },
};
