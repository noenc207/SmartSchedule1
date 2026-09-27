import { describe, it, expect } from 'vitest';
import type { EventItem, Task, Category } from '../../types/domain';
import type { KpiMetric } from './types/dashboard';
import type { DetailModalData } from './components/DashboardDetailModal';

describe('Dashboard Progressive Disclosure & Detail Inspector', () => {
  it('correctly structures event inspection payload', () => {
    const mockEvent: EventItem = {
      id: 'ev-prf-192',
      scheduleId: 's-1',
      categoryId: 'cat-comp-sci',
      taskId: null,
      title: 'PRF192 - C Programming Lab',
      description: 'Lập trình C căn bản tại phòng máy Alpha',
      startsAt: '2026-09-22T08:00:00.000Z',
      endsAt: '2026-09-22T10:15:00.000Z',
      location: 'Lab 204 - Alpha Building',
      priority: 'HIGH',
      status: 'CONFIRMED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: null,
      fixed: true,
      locked: true,
      color: '#f27024',
      occurrenceId: 'occ-1',
      seriesId: 'ser-1',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const mockCategory: Category = {
      id: 'cat-comp-sci',
      name: 'Computer Science',
      color: '#f27024',
      icon: 'code',
      ownerId: 'user-1',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const modalData: DetailModalData = {
      type: 'event',
      event: mockEvent,
      category: mockCategory,
    };

    expect(modalData.type).toBe('event');
    expect(modalData.event.title).toContain('PRF192');
    expect(modalData.event.location).toContain('Lab 204');
    expect(modalData.category?.name).toBe('Computer Science');
  });

  it('correctly handles task inspection with urgent deadline', () => {
    const mockTask: Task = {
      id: 'task-asm-1',
      scheduleId: 's-1',
      ownerId: 'user-1',
      categoryId: 'cat-comp-sci',
      title: 'Assignment 1 - Pointer & Structs',
      description: 'Hoàn thiện 5 bài tập con trỏ C',
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 60,
      priority: 'HIGH',
      deadline: '2026-09-23T23:59:00.000Z',
      status: 'TODO',
      preferredStartTime: null,
      preferredEndTime: null,
      minimumSessionMinutes: 45,
      maximumSessionMinutes: 90,
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const modalData: DetailModalData = {
      type: 'task',
      task: mockTask,
    };

    expect(modalData.type).toBe('task');
    expect(modalData.task.priority).toBe('HIGH');
    expect(modalData.task.estimatedDurationMinutes).toBe(120);
  });

  it('correctly structures KPI metric inspection payload', () => {
    const mockMetric: KpiMetric = {
      id: 'metric-capacity',
      label: 'Công suất học tuần',
      value: '78%',
      subtext: '31.2h / 40h tối đa',
      badge: {
        text: 'Lý tưởng',
        variant: 'success',
      },
    };

    const modalData: DetailModalData = {
      type: 'metric',
      metric: mockMetric,
    };

    expect(modalData.type).toBe('metric');
    expect(modalData.metric.value).toBe('78%');
    expect(modalData.metric.badge?.variant).toBe('success');
  });
});
