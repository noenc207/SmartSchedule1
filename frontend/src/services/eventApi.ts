import apiClient from './apiClient';
import type { EventItem, LocationRef, RecurrenceRule } from '../types/domain';
export type EventInput = {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  locationId?: string | null;
  locationRef?: LocationRef | null;
  categoryId?: string;
  taskId?: string | null;
  sourceTaskId?: string | null;
  priority: string;
  status: string;
  recurrence?: RecurrenceRule | null;
  reminderMinutes?: number;
  notes?: string;
  fixed: boolean;
  locked: boolean;
  color?: string | null;
};
export type ConflictResponse = { hasConflict: boolean; conflicts: { eventId: string; title: string; overlapMinutes: number }[] };
export const eventApi = {
  async list(scheduleId: string, from?: string, to?: string, signal?: AbortSignal) {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return (await apiClient.get<EventItem[]>(`/schedules/${scheduleId}/events`, { params, signal })).data;
  },
  async create(scheduleId: string, input: EventInput) {
    const payload = {
      ...input,
      sourceTaskId: input.sourceTaskId ?? input.taskId ?? null,
      taskId: input.taskId ?? input.sourceTaskId ?? null,
    };
    return (await apiClient.post<EventItem>(`/schedules/${scheduleId}/events`, payload)).data;
  },
  async get(id: string) { return (await apiClient.get<EventItem>(`/events/${id}`)).data; },
  async update(id: string, input: EventInput) {
    const payload = {
      ...input,
      sourceTaskId: input.sourceTaskId ?? input.taskId ?? null,
      taskId: input.taskId ?? input.sourceTaskId ?? null,
    };
    return (await apiClient.put<EventItem>(`/events/${id}`, payload)).data;
  },
  async remove(id: string) { await apiClient.delete(`/events/${id}`); },
  async duplicate(id: string) { return (await apiClient.post<EventItem>(`/events/${id}/duplicate`)).data; },
  async checkConflict(scheduleId: string, startsAt: string, endsAt: string, excludeEventId?: string) {
    return (await apiClient.post<ConflictResponse>('/events/check-conflict', null, { params: { scheduleId, startsAt, endsAt, excludeEventId } })).data;
  },
};
