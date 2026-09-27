import { describe, it, expect } from 'vitest';
import { calculateYAxisConfig, formatWorkloadHours } from './utils/chartCalculations';
import { generateSmartInsights, detectTodayFreeGaps } from './utils/insightGenerator';
import type { DayWorkloadMetric } from './types/dashboard';
import type { Task, EventItem } from '../../types/domain';

const createMockMetric = (overrides: Partial<DayWorkloadMetric>): DayWorkloadMetric => ({
  date: new Date('2026-09-22'),
  dateKey: '2026-09-22',
  dayLabel: 'Tue',
  fullDayLabel: 'Tuesday, Sep 22',
  fixedMinutes: 0,
  plannedMinutes: 0,
  totalWorkloadMinutes: 0,
  capacityMinutes: 360,
  isToday: false,
  isOverloaded: false,
  eventCount: 0,
  events: [],
  ...overrides,
});

const createMockEvent = (overrides: Partial<EventItem>): EventItem => ({
  id: 'ev-test',
  scheduleId: 's-1',
  categoryId: 'c-1',
  taskId: null,
  title: 'Test Event',
  description: null,
  startsAt: '2026-09-22T08:00:00.000Z',
  endsAt: '2026-09-22T09:00:00.000Z',
  location: null,
  priority: 'HIGH',
  status: 'CONFIRMED',
  recurrenceRule: null,
  reminderMinutes: null,
  notes: null,
  fixed: true,
  locked: true,
  color: '#0047ba',
  occurrenceId: 'occ-1',
  seriesId: 'ser-1',
  createdAt: '2026-09-22T00:00:00Z',
  updatedAt: '2026-09-22T00:00:00Z',
  ...overrides,
});

describe('Dashboard Data & Calculations', () => {
  describe('calculateYAxisConfig', () => {
    it('returns default baseline scale for empty metrics', () => {
      const config = calculateYAxisConfig([], 360);
      expect(config.maxMinutes).toBe(360); // 6 hours
      expect(config.ticks.length).toBe(4); // 0h, 2h, 4h, 6h
      expect(config.ticks[0].label).toBe('0h');
      expect(config.ticks[config.ticks.length - 1].label).toBe('6h');
      expect(config.ticks[0].ratio).toBe(0);
      expect(config.ticks[config.ticks.length - 1].ratio).toBe(1);
    });

    it('adapts interval for light workload (<= 3 hours)', () => {
      const metrics: DayWorkloadMetric[] = [
        createMockMetric({
          dateKey: '2026-09-22',
          fixedMinutes: 60,
          plannedMinutes: 90,
          totalWorkloadMinutes: 150, // 2.5 hours
          capacityMinutes: 180, // 3 hours
        }),
      ];

      const config = calculateYAxisConfig(metrics);
      expect(config.maxMinutes).toBe(180); // 3h max
      expect(config.ticks.map((t) => t.label)).toEqual(['0h', '1h', '2h', '3h']);
    });

    it('adapts interval for typical workload (<= 10 hours)', () => {
      const metrics: DayWorkloadMetric[] = [
        createMockMetric({
          dateKey: '2026-09-22',
          fixedMinutes: 240,
          plannedMinutes: 240,
          totalWorkloadMinutes: 480, // 8 hours
          capacityMinutes: 420, // 7 hours
          isOverloaded: true,
        }),
      ];

      const config = calculateYAxisConfig(metrics);
      expect(config.maxMinutes).toBe(480); // 8 hours rounded up with step 2h
      expect(config.ticks.map((t) => t.label)).toEqual(['0h', '2h', '4h', '6h', '8h']);
    });

    it('adapts interval for heavy workload (<= 24 hours)', () => {
      const metrics: DayWorkloadMetric[] = [
        createMockMetric({
          dateKey: '2026-09-22',
          fixedMinutes: 600,
          plannedMinutes: 480,
          totalWorkloadMinutes: 1080, // 18 hours
          capacityMinutes: 600,
          isOverloaded: true,
        }),
      ];

      const config = calculateYAxisConfig(metrics);
      // interval is 4h -> ceil(18/4)*4 = 20h = 1200m
      expect(config.maxMinutes).toBe(1200);
      expect(config.ticks.map((t) => t.label)).toEqual(['0h', '4h', '8h', '12h', '16h', '20h']);
    });
  });

  describe('formatWorkloadHours', () => {
    it('formats exact hours and fractionals cleanly', () => {
      expect(formatWorkloadHours(0)).toBe('0h');
      expect(formatWorkloadHours(60)).toBe('1h');
      expect(formatWorkloadHours(90)).toBe('1.5h');
      expect(formatWorkloadHours(135)).toBe('2.3h');
      expect(formatWorkloadHours(480)).toBe('8h');
    });
  });

  describe('generateSmartInsights', () => {
    const mockTask: Task = {
      id: 'task-ml',
      scheduleId: 'sched-1',
      ownerId: 'user-1',
      categoryId: 'cat-1',
      title: 'Machine Learning Project',
      description: 'Test',
      estimatedDurationMinutes: 180,
      remainingDurationMinutes: 120,
      priority: 'HIGH',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h away
      status: 'TODO',
      preferredStartTime: null,
      preferredEndTime: null,
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    it('generates urgent insight for imminent high priority deadline', () => {
      const insights = generateSmartInsights([], [mockTask], [], []);
      const urgent = insights.find((i) => i.type === 'urgency');
      expect(urgent).toBeDefined();
      expect(urgent?.title).toContain('Machine Learning Project');
      expect(urgent?.description).toContain('120m remaining');
    });

    it('generates overload insight for over-capacity day', () => {
      const overloadedMetric = createMockMetric({
        dateKey: '2026-09-23',
        dayLabel: 'Wed',
        fullDayLabel: 'Wednesday, Sep 23',
        fixedMinutes: 240,
        plannedMinutes: 300,
        totalWorkloadMinutes: 540, // 9h
        capacityMinutes: 360, // 6h (3h over)
        isOverloaded: true,
      });

      const insights = generateSmartInsights([], [], [overloadedMetric], []);
      const overload = insights.find((i) => i.type === 'overload');
      expect(overload).toBeDefined();
      expect(overload?.title).toContain('Wednesday, Sep 23 workload exceeds daily capacity by 3h');
    });

    it('generates opportunity insight for daytime free gaps >= 60m', () => {
      const gaps = [
        {
          startsAt: new Date(2026, 8, 22, 13, 0, 0).toISOString(),
          endsAt: new Date(2026, 8, 22, 14, 30, 0).toISOString(),
          durationMinutes: 90,
          timeRangeLabel: '13:00 – 14:30',
          suggestedTask: mockTask,
        },
      ];

      const insights = generateSmartInsights([], [mockTask], [], gaps);
      const gapInsight = insights.find((i) => i.type === 'opportunity');
      expect(gapInsight).toBeDefined();
      expect(gapInsight?.title).toContain('90m available this afternoon');
      expect(gapInsight?.description).toContain('Machine Learning Project');
    });

    it('returns positive health insight when schedule is balanced', () => {
      const balancedMetric = createMockMetric({
        dateKey: '2026-09-22',
        dayLabel: 'Tue',
        fullDayLabel: 'Tuesday, Sep 22',
        isToday: true,
        fixedMinutes: 120,
        plannedMinutes: 120,
        totalWorkloadMinutes: 240,
        capacityMinutes: 360,
        isOverloaded: false,
      });

      const insights = generateSmartInsights([], [], [balancedMetric], []);
      expect(insights.length).toBe(1);
      expect(insights[0].type).toBe('success');
      expect(insights[0].title).toContain('balanced and achievable');
    });
  });

  describe('detectTodayFreeGaps', () => {
    it('detects available gap between morning class and afternoon study', () => {
      const baseDate = new Date(2026, 8, 22, 8, 0, 0);

      const events: EventItem[] = [
        createMockEvent({
          id: 'ev-1',
          title: 'Morning Lecture',
          startsAt: new Date(2026, 8, 22, 8, 30, 0).toISOString(),
          endsAt: new Date(2026, 8, 22, 10, 0, 0).toISOString(),
          location: 'Hall A',
        }),
        createMockEvent({
          id: 'ev-2',
          title: 'Afternoon Lab',
          startsAt: new Date(2026, 8, 22, 13, 0, 0).toISOString(),
          endsAt: new Date(2026, 8, 22, 15, 0, 0).toISOString(),
          location: 'Lab 2',
        }),
      ];

      const gaps = detectTodayFreeGaps(events, baseDate);
      // There is a 3h gap between 10:00 and 13:00 (180m >= 45m)
      const midGap = gaps.find((g) => g.durationMinutes === 180);
      expect(midGap).toBeDefined();
    });

    it('ignores gaps smaller than 45 minutes', () => {
      const baseDate = new Date(2026, 8, 22, 8, 0, 0);

      const events: EventItem[] = [
        createMockEvent({
          id: 'ev-1',
          title: 'Class 1',
          startsAt: new Date(2026, 8, 22, 8, 0, 0).toISOString(),
          endsAt: new Date(2026, 8, 22, 9, 30, 0).toISOString(),
        }),
        createMockEvent({
          id: 'ev-2',
          title: 'Class 2',
          startsAt: new Date(2026, 8, 22, 9, 50, 0).toISOString(), // 20m gap only
          endsAt: new Date(2026, 8, 22, 19, 0, 0).toISOString(),
        }),
      ];

      const gaps = detectTodayFreeGaps(events, baseDate);
      expect(gaps.length).toBe(0);
    });
  });
});
