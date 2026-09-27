import apiClient from './apiClient';
import type { Schedule, ScheduleSummary, EventItem } from '../types/domain';

export interface AiPlannerRecommendation {
  freeSlot: {
    dayOfWeek: number;
    dayName: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    durationFormatted: string;
  };
  recommendedTasks: Array<{
    taskId: string;
    title: string;
    durationMinutes: number;
    durationFormatted: string;
    priority: string;
  }>;
  message: string;
}

export interface AcademicKpiSummary {
  coursesCount: number;
  tasksCount: number;
  deadlinesCount: number;
  freeTimeMinutes: number;
  freeTimeFormatted: string;
  ongoingEventTitle: string;
  ongoingEventLocation: string;
  ongoingEventTime: string;
  nextEventTitle: string;
  nextEventLocation: string;
  nextEventTime: string;
  nextEventCountdown: string;
  upcomingDeadlines: Array<{
    taskId: string;
    title: string;
    deadline: string;
    countdown: string;
    formattedDate: string;
  }>;
}

export const scheduleApi = {
  async list() { return (await apiClient.get<ScheduleSummary[]>('/schedules')).data; },
  async get(id: string) { return (await apiClient.get<Schedule>(`/schedules/${id}`)).data; },
  async create(input: { name: string; description?: string; timezone: string; visibility: string }) { return (await apiClient.post<Schedule>('/schedules', input)).data; },
  async update(id: string, input: { name: string; description?: string; timezone: string; visibility: string }) { return (await apiClient.put<Schedule>(`/schedules/${id}`, input)).data; },
  async remove(id: string) { await apiClient.delete(`/schedules/${id}`); },
  async getAiRecommendation(scheduleId: string) {
    return (await apiClient.get<AiPlannerRecommendation>(`/schedules/${scheduleId}/scheduling/ai-recommendation`)).data;
  },
  async applyQuickSlot(scheduleId: string, input: { taskId: string; startsAt: string; endsAt: string }) {
    return (await apiClient.post<EventItem>(`/schedules/${scheduleId}/scheduling/apply-quick-slot`, input)).data;
  },
  async getAcademicSummary(scheduleId: string) {
    return (await apiClient.get<AcademicKpiSummary>(`/schedules/${scheduleId}/scheduling/academic-summary`)).data;
  },
};

