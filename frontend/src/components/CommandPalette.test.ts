import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchesCommandQuery } from './CommandPalette';
import { useHistoryStore } from '../stores/historyStore';
import type { Task } from '../types/domain';

describe('CommandPalette & Power User Utilities', () => {
  describe('matchesCommandQuery', () => {
    it('matches exact substrings case-insensitively', () => {
      const haystack = 'Optimize schedule Review reschedule alternatives';
      expect(matchesCommandQuery(haystack, 'optimize')).toBe(true);
      expect(matchesCommandQuery(haystack, 'OPTIMIZE')).toBe(true);
      expect(matchesCommandQuery(haystack, 'reschedule')).toBe(true);
    });

    it('matches sequential character abbreviations (fuzzy)', () => {
      const haystack = 'Optimize schedule alternatives and conflicts';
      // "opt" matches O-p-t in Optimize
      expect(matchesCommandQuery(haystack, 'opt')).toBe(true);

      const timelineHaystack = 'Timeline View Gantt-style multi-week project roadmap';
      // "tl" matches T-imeline ... L...
      expect(matchesCommandQuery(timelineHaystack, 'tl')).toBe(true);
    });

    it('returns false for non-matching queries', () => {
      const haystack = 'Go to Dashboard Overview of today and deadlines';
      expect(matchesCommandQuery(haystack, 'xyz999')).toBe(false);
      expect(matchesCommandQuery(haystack, 'quantum')).toBe(false);
    });

    it('returns true when query is empty or whitespace', () => {
      expect(matchesCommandQuery('Any command text', '')).toBe(true);
      expect(matchesCommandQuery('Any command text', '   ')).toBe(true);
    });
  });

  describe('Atomic Bulk Operations with Single Undo', () => {
    beforeEach(() => {
      useHistoryStore.setState({ undoStack: [], redoStack: [] });
    });

    it('reverts multiple tasks in a single undo action', async () => {
      const { recordAction, undo, redo, canUndo, canRedo } = useHistoryStore.getState();

      const taskA: Task = {
        id: 'task-1',
        scheduleId: 'sched-1',
        ownerId: 'user-1',
        categoryId: null,
        title: 'Machine Learning Project',
        description: '',
        estimatedDurationMinutes: 120,
        remainingDurationMinutes: 120,
        priority: 'HIGH',
        status: 'TODO',
        deadline: '2026-09-25T17:00:00.000Z',
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 120,
        color: null,
        createdAt: '',
        updatedAt: '',
      };

      const taskB: Task = {
        id: 'task-2',
        scheduleId: 'sched-1',
        ownerId: 'user-1',
        categoryId: null,
        title: 'Database Assignment',
        description: '',
        estimatedDurationMinutes: 90,
        remainingDurationMinutes: 90,
        priority: 'HIGH',
        status: 'TODO',
        deadline: '2026-09-24T17:00:00.000Z',
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 90,
        color: null,
        createdAt: '',
        updatedAt: '',
      };

      let database = [taskA, taskB];

      const originalSnapshot = database.map((t) => ({ ...t }));
      const newDeadline = '2026-10-02T17:00:00.000Z';

      // Simulate executing bulk command
      database = database.map((t) => ({ ...t, deadline: newDeadline }));

      // Record atomic bulk undo entry
      recordAction({
        description: 'Moved 2 HIGH priority tasks to next week',
        undo: async () => {
          // Restores all tasks in one single history operation
          database = originalSnapshot.map((t) => ({ ...t }));
        },
        redo: async () => {
          database = database.map((t) => ({ ...t, deadline: newDeadline }));
        },
      });

      // Verify state after bulk move
      expect(database[0].deadline).toBe(newDeadline);
      expect(database[1].deadline).toBe(newDeadline);
      expect(useHistoryStore.getState().undoStack.length).toBe(1);

      // Trigger single undo
      await useHistoryStore.getState().undo();

      // Both tasks should be restored in one undo step!
      expect(database[0].deadline).toBe('2026-09-25T17:00:00.000Z');
      expect(database[1].deadline).toBe('2026-09-24T17:00:00.000Z');
      expect(useHistoryStore.getState().undoStack.length).toBe(0);
      expect(useHistoryStore.getState().redoStack.length).toBe(1);

      // Trigger redo
      await useHistoryStore.getState().redo();
      expect(database[0].deadline).toBe(newDeadline);
      expect(database[1].deadline).toBe(newDeadline);
    });
  });
});
