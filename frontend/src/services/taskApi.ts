import apiClient from './apiClient';
import type { PageResponse, Task } from '../types/domain';

export type TaskInput = {
  title: string;
  description?: string | null;
  estimatedDurationMinutes: number;
  remainingDurationMinutes: number;
  priority: string;
  deadline?: string | null;
  status: string;
  categoryId?: string | null;
  minimumSessionMinutes: number;
  maximumSessionMinutes: number;
  color?: string | null;
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
};

/**
 * Canonical task normalization function.
 * Normalizes backend payload variants to guarantee consistent positive duration
 * and valid task structure across all features.
 */
export function normalizeTask(raw: any): Task {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid task payload received: payload must be an object');
  }

  // Detect estimated duration from known backend/legacy field contracts
  const rawEstimated = raw.estimatedDurationMinutes ?? raw.durationMinutes ?? raw.estimatedMinutes ?? raw.duration;
  const estimated = Number(rawEstimated);

  if (rawEstimated === undefined || rawEstimated === null || isNaN(estimated) || estimated <= 0) {
    console.warn(`[SmartSchedule] Task "${raw.title || raw.id}" has invalid or missing duration:`, rawEstimated);
  }

  // Detect remaining duration
  const rawRemaining = raw.remainingDurationMinutes ?? raw.remainingMinutes ?? raw.remaining;
  let remaining = Number(rawRemaining);
  if (rawRemaining === undefined || rawRemaining === null || isNaN(remaining)) {
    remaining = !isNaN(estimated) && estimated > 0 ? estimated : 0;
  }

  return {
    id: String(raw.id ?? ''),
    scheduleId: String(raw.scheduleId ?? ''),
    ownerId: String(raw.ownerId ?? ''),
    categoryId: raw.categoryId ?? null,
    title: String(raw.title ?? 'Untitled Task'),
    description: raw.description ?? null,
    estimatedDurationMinutes: !isNaN(estimated) && estimated > 0 ? estimated : 60,
    remainingDurationMinutes: Math.max(0, remaining),
    priority: raw.priority ?? 'MEDIUM',
    deadline: raw.deadline ?? null,
    status: raw.status ?? 'TODO',
    preferredStartTime: raw.preferredStartTime ?? null,
    preferredEndTime: raw.preferredEndTime ?? null,
    minimumSessionMinutes: Number(raw.minimumSessionMinutes ?? 30),
    maximumSessionMinutes: Number(raw.maximumSessionMinutes ?? Math.max(120, !isNaN(estimated) && estimated > 0 ? estimated : 120)),
    color: raw.color ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export const taskApi = {
  async list(scheduleId: string, page = 0): Promise<PageResponse<Task>> {
    const res = await apiClient.get<PageResponse<Task>>(`/schedules/${scheduleId}/tasks`, { params: { page, size: 20 } });
    return {
      ...res.data,
      content: (res.data.content || []).map(normalizeTask),
    };
  },
  async create(scheduleId: string, input: TaskInput): Promise<Task> {
    const res = await apiClient.post<Task>(`/schedules/${scheduleId}/tasks`, input);
    return normalizeTask(res.data);
  },
  async get(id: string): Promise<Task> {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return normalizeTask(res.data);
  },
  async update(id: string, input: TaskInput): Promise<Task> {
    const res = await apiClient.put<Task>(`/tasks/${id}`, input);
    return normalizeTask(res.data);
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};
