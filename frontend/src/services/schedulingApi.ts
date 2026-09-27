import apiClient from './apiClient';
import type {
  SchedulingPreferences,
  SchedulingRequest,
  SchedulingResult,
  SchedulingValidationRequest,
  ValidationResponse,
} from '../types/domain';

export const schedulingApi = {
  async generate(scheduleId: string, request: SchedulingRequest) {
    return (await apiClient.post<SchedulingResult>(`/schedules/${scheduleId}/scheduling/generate`, request)).data;
  },
  async optimizePro(scheduleId: string, request: SchedulingRequest) {
    return (await apiClient.post<SchedulingResult>(`/schedules/${scheduleId}/scheduling/optimize-pro`, request)).data;
  },
  async validate(scheduleId: string, request: SchedulingValidationRequest) {
    return (await apiClient.post<ValidationResponse>(`/schedules/${scheduleId}/scheduling/validate`, request)).data;
  },
  async apply(scheduleId: string, plan: SchedulingResult) {
    return (await apiClient.post<SchedulingResult>(`/schedules/${scheduleId}/scheduling/apply`, {
      planId: plan.planId,
      fingerprint: plan.fingerprint,
      slots: plan.slots,
      scheduleVersion: plan.scheduleVersion,
    })).data;
  },
  async getPreferences(scheduleId: string) {
    return (await apiClient.get<SchedulingPreferences>(`/schedules/${scheduleId}/scheduling/preferences`)).data;
  },
  async updatePreferences(scheduleId: string, input: SchedulingPreferences) {
    return (await apiClient.put<SchedulingPreferences>(`/schedules/${scheduleId}/scheduling/preferences`, input)).data;
  },
};
