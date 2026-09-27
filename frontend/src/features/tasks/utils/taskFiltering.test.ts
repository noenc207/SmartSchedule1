import { describe, expect, it } from 'vitest';
import type { Task, EventItem } from '../../../types/domain';
import { filterAndSortTasks } from './taskFiltering';

describe('taskFiltering engine', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      scheduleId: 'sched-1',
      ownerId: 'user-1',
      title: 'AIG201 Machine Learning Assignment',
      description: 'Train deep neural network model',
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 120,
      priority: 'HIGH',
      status: 'TODO',
      deadline: '2026-09-23T12:00:00.000Z', // tomorrow
      categoryId: 'cat-academic',
      color: '#ea580c',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      preferredStartTime: null,
      preferredEndTime: null,
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    },
    {
      id: 'task-2',
      scheduleId: 'sched-1',
      ownerId: 'user-1',
      title: 'Database Lab Report',
      description: 'SQL queries optimization',
      estimatedDurationMinutes: 60,
      remainingDurationMinutes: 60,
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: '2026-09-22T15:00:00.000Z', // today
      categoryId: 'cat-projects',
      color: '#2563eb',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 60,
      preferredStartTime: null,
      preferredEndTime: null,
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    },
    {
      id: 'task-3',
      scheduleId: 'sched-1',
      ownerId: 'user-1',
      title: 'Capstone Review',
      description: 'Prepare pitch slides',
      estimatedDurationMinutes: 180,
      remainingDurationMinutes: 0,
      priority: 'LOW',
      status: 'SCHEDULED',
      deadline: '2026-09-29T10:00:00.000Z', // 7 days later
      categoryId: 'cat-review',
      color: '#16a34a',
      minimumSessionMinutes: 60,
      maximumSessionMinutes: 180,
      preferredStartTime: null,
      preferredEndTime: null,
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    },
  ];

  const mockEvents: EventItem[] = [
    {
      id: 'ev-1',
      scheduleId: 'sched-1',
      taskId: 'task-3',
      categoryId: null,
      title: 'Capstone Review Session',
      description: null,
      location: null,
      startsAt: '2026-09-22T13:00:00.000Z',
      endsAt: '2026-09-22T16:00:00.000Z',
      priority: 'LOW',
      status: 'SCHEDULED',
      fixed: false,
      locked: false,
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: null,
      color: null,
      occurrenceId: 'ev-1',
      seriesId: 'ev-1',
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    },
  ];

  // Base timestamp: 2026-09-22T08:00:00.000Z
  const nowTs = new Date('2026-09-22T08:00:00.000Z').getTime();

  it('filters by search query matching title or description', () => {
    const result1 = filterAndSortTasks(mockTasks, { searchQuery: 'neural' });
    expect(result1.map((t) => t.id)).toEqual(['task-1']);

    const result2 = filterAndSortTasks(mockTasks, { searchQuery: 'database' });
    expect(result2.map((t) => t.id)).toEqual(['task-2']);
  });

  it('filters by priority', () => {
    const result = filterAndSortTasks(mockTasks, { priorityFilter: 'HIGH' });
    expect(result.map((t) => t.id)).toEqual(['task-1']);
  });

  it('filters by scheduling status', () => {
    const unscheduled = filterAndSortTasks(mockTasks, { statusFilter: 'UNSCHEDULED', events: mockEvents });
    expect(unscheduled.map((t) => t.id)).toEqual(['task-2', 'task-1']); // default sort deadline: task-2 is today, task-1 is tomorrow

    const scheduled = filterAndSortTasks(mockTasks, { statusFilter: 'SCHEDULED', events: mockEvents });
    expect(scheduled.map((t) => t.id)).toEqual(['task-3']);
  });

  it('filters by deadline buckets', () => {
    const today = filterAndSortTasks(mockTasks, { deadlineFilter: 'TODAY', nowTimestamp: nowTs });
    expect(today.map((t) => t.id)).toEqual(['task-2']);

    const tomorrow = filterAndSortTasks(mockTasks, { deadlineFilter: 'TOMORROW', nowTimestamp: nowTs });
    expect(tomorrow.map((t) => t.id)).toEqual(['task-1']);
  });

  it('sorts by priority, duration, and title', () => {
    const byPriority = filterAndSortTasks(mockTasks, { sortBy: 'PRIORITY' });
    expect(byPriority.map((t) => t.id)).toEqual(['task-1', 'task-2', 'task-3']);

    const byDurationDesc = filterAndSortTasks(mockTasks, { sortBy: 'DURATION_DESC', events: mockEvents });
    expect(byDurationDesc.map((t) => t.id)).toEqual(['task-1', 'task-2', 'task-3']); // task-1 has 120m, task-2 has 60m, task-3 has 0m

    const byTitle = filterAndSortTasks(mockTasks, { sortBy: 'TITLE' });
    expect(byTitle.map((t) => t.id)).toEqual(['task-1', 'task-3', 'task-2']);
  });

  it('preserves selection without mutating input tasks', () => {
    const selectedIds = ['task-1', 'task-3'];
    const filtered = filterAndSortTasks(mockTasks, { priorityFilter: 'HIGH', selectedIds });
    expect(filtered.length).toBe(1);
    expect(selectedIds).toEqual(['task-1', 'task-3']); // unchanged
  });
});
