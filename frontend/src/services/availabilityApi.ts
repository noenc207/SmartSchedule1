import apiClient from './apiClient';
import type { Availability } from '../types/domain';
export type AvailabilityInput = { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean };
export const availabilityApi = {
  async list(scheduleId: string) { return (await apiClient.get<Availability[]>(`/schedules/${scheduleId}/availability`)).data; },
  async create(scheduleId: string, input: AvailabilityInput) { return (await apiClient.post<Availability>(`/schedules/${scheduleId}/availability`, input)).data; },
  async update(scheduleId: string, id: string, input: AvailabilityInput) { return (await apiClient.put<Availability>(`/schedules/${scheduleId}/availability/${id}`, input)).data; },
  async remove(scheduleId: string, id: string) { await apiClient.delete(`/schedules/${scheduleId}/availability/${id}`); },
};
