import { describe, it, expect } from 'vitest';
import { exportEventsToIcs, parseIcsToEvents, formatIcsDate, parseIcsDate } from './icsService';
import {
  parseCanvasLmsPayload,
  parseMoodlePayload,
  parseHrShiftPayload,
  generateOpenApiSpec,
} from './openApiIntegration';
import { calendarSyncEngine, type ExternalCalendarEvent } from './calendarSyncEngine';
import type { EventItem } from '../types/domain';

describe('iCalendar RFC 5545 & Open API Integration Engine', () => {
  const sampleEvents: EventItem[] = [
    {
      id: 'evt-test-1',
      scheduleId: 'sched-1',
      categoryId: 'cat-academic',
      title: 'Database Systems Lecture',
      description: 'SQL Indexing & Query Plans',
      startsAt: '2026-09-24T08:00:00Z',
      endsAt: '2026-09-24T10:00:00Z',
      location: 'Phòng B3.03',
      locationRef: {
        id: 'loc-1',
        name: 'Phòng B3.03',
        type: 'CAMPUS',
        latitude: 13.7589,
        longitude: 109.2185,
      },
      priority: 'HIGH',
      status: 'CONFIRMED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: 'Mang theo laptop',
      fixed: true,
      locked: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
      occurrenceId: 'evt-test-1',
      seriesId: 'evt-test-1',
    },
  ];

  describe('RFC 5545 iCalendar Import & Export', () => {
    it('exports events into valid RFC 5545 text with GEO coordinates', () => {
      const ics = exportEventsToIcs(sampleEvents, 'Academic Schedule');
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Database Systems Lecture');
      expect(ics).toContain('LOCATION:Phòng B3.03');
      expect(ics).toContain('GEO:13.758900;109.218500');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('correctly parses .ics format back into SmartSchedule events', () => {
      const rawIcs = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:external-123@google.com',
        'SUMMARY:Khai mạc Hội thảo AI',
        'DESCRIPTION:Hội thảo công nghệ AI FPT',
        'LOCATION:Central Hall',
        'DTSTART:20260925T090000Z',
        'DTEND:20260925T110000Z',
        'GEO:13.758200;109.218000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const parsed = parseIcsToEvents(rawIcs, 'sched-1');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Khai mạc Hội thảo AI');
      expect(parsed[0].location).toBe('Central Hall');
      expect(parsed[0].startsAt).toContain('2026-09-25T09:00:00');
      expect(parsed[0].locationRef?.latitude).toBeCloseTo(13.7582, 3);
    });
  });

  describe('Open API Payload Parsers (LMS & HR)', () => {
    it('parses Canvas LMS assignment deadlines into scheduled events', () => {
      const canvasPayload = [
        {
          id: 501,
          name: 'Nộp Bài tập Lớn: Machine Learning',
          due_at: '2026-09-26T23:59:00Z',
          points_possible: 50,
          context_name: 'Machine Learning K15',
        },
      ];

      const result = parseCanvasLmsPayload(canvasPayload);
      expect(result.sourceSystem).toBe('CANVAS_LMS');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toContain('Nộp Bài tập Lớn: Machine Learning');
      expect(result.events[0].priority).toBe('HIGH');
      expect(result.events[0].endsAt).toBe('2026-09-26T23:59:00.000Z');
    });

    it('parses Enterprise HR shift schedules', () => {
      const hrPayload = {
        shifts: [
          {
            shift_title: 'Ca Trực Dự Án FinTech',
            employee_id: 'EMP-7712',
            department: 'AI Solutions',
            start_time: '2026-09-27T08:00:00Z',
            end_time: '2026-09-27T12:00:00Z',
            location_address: 'Tòa nhà công ty',
          },
        ],
      };

      const result = parseHrShiftPayload(hrPayload);
      expect(result.sourceSystem).toBe('ENTERPRISE_HR');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toContain('Ca Trực Dự Án FinTech');
      expect(result.events[0].startsAt).toBe('2026-09-27T08:00:00Z');
    });

    it('generates compliant OpenAPI 3.0 specification', () => {
      const spec = generateOpenApiSpec() as any;
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.paths['/open/schedules/batch-import']).toBeDefined();
      expect(spec.paths['/open/integrations/lms/sync']).toBeDefined();
      expect(spec.paths['/open/integrations/hr/events']).toBeDefined();
    });
  });

  describe('Calendar Two-Way Smart Processing Layer', () => {
    it('applies smart travel buffers and detects travel feasibility', () => {
      const external: ExternalCalendarEvent[] = [
        {
          externalId: 'ext-1',
          provider: 'GOOGLE_CALENDAR',
          title: 'Họp với Giảng viên',
          startsAt: '2026-09-24T08:00:00Z',
          endsAt: '2026-09-24T09:00:00Z',
          location: 'Campus Building A',
        },
        {
          externalId: 'ext-2',
          provider: 'GOOGLE_CALENDAR',
          title: 'Gặp gỡ Doanh nghiệp',
          startsAt: '2026-09-24T09:05:00Z', // Only 5 min gap
          endsAt: '2026-09-24T10:30:00Z',
          location: 'Campus Lab', // Requires 9 min walking in campus graph
        },
      ];

      const processed = calendarSyncEngine.processAndOptimizeExternalEvents(external, 'sched-1');
      expect(processed.optimizedEvents).toHaveLength(2);
      expect(processed.warningsDetected.length).toBeGreaterThan(0);
      expect(processed.warningsDetected[0]).toContain('Cảnh báo di chuyển');
    });
  });
});
