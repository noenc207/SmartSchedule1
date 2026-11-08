import { describe, it, expect } from 'vitest';
import type { EventItem, Task } from '../../types/domain';

function getSafeEventHours(ev: any): number {
  if (!ev) return 0;
  const startRaw = ev.startsAt || ev.start;
  const endRaw = ev.endsAt || ev.end;
  if (!startRaw || !endRaw) return 0;
  const s = new Date(startRaw).getTime();
  const e = new Date(endRaw).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return (e - s) / 3600000;
}

function classifyEvent(ev: EventItem): 'class' | 'project' | 'self_study' {
  const text = `${ev.title || ''} ${ev.description || ''} ${ev.notes || ''}`.toLowerCase();
  if (
    text.includes('đồ án') ||
    text.includes('project') ||
    text.includes('capstone') ||
    text.includes('sprint') ||
    text.includes('bài tập lớn') ||
    text.includes('lab')
  ) {
    return 'project';
  }
  if (
    text.includes('tự học') ||
    text.includes('ôn tập') ||
    text.includes('study') ||
    text.includes('reading') ||
    text.includes('review') ||
    text.includes('thư viện') ||
    text.includes('atrium') ||
    text.includes('flashcard')
  ) {
    return 'self_study';
  }
  return 'class';
}

function calculateSubjectDistribution(events: EventItem[], tasks: Task[]) {
  if (events.length === 0) return [];

  const map = new Map<string, {
    code: string;
    name: string;
    category: string;
    hours: number;
    sessionCount: number;
    room: string;
  }>();

  events.forEach((ev) => {
    const title = (ev.title || '').trim();
    if (!title) return;

    const match = title.match(/\b([A-Za-z]{2,4}\s?[0-9]{3,4})\b/);
    const code = match ? match[1].toUpperCase().replace(/\s+/g, '') : title.split(/[\s-:]/)[0].toUpperCase().slice(0, 7);
    const dur = getSafeEventHours(ev);
    const kind = classifyEvent(ev);
    const category = kind === 'class' ? 'Học tập trên lớp & Lab' : kind === 'project' ? 'Đồ án & Dự án' : 'Sinh hoạt & Tự học';
    const room = ev.location || 'Campus AI Quy Nhơn';

    if (!map.has(code)) {
      map.set(code, {
        code,
        name: title,
        category,
        hours: dur,
        sessionCount: 1,
        room,
      });
    } else {
      const item = map.get(code)!;
      item.hours += dur;
      item.sessionCount += 1;
    }
  });

  const list = Array.from(map.values());
  const totalHours = list.reduce((sum, item) => sum + item.hours, 0) || 1;

  list.sort((a, b) => b.hours - a.hours);

  return list.map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    hours: Math.round(item.hours * 10) / 10,
    percent: Math.round((item.hours / totalHours) * 100),
    sessions: `${item.sessionCount} phiên/tuần`,
    room: item.room,
  }));
}

describe('Analytics Calculations', () => {
  it('returns empty distribution and 0 metrics when user has 0 events', () => {
    const events: EventItem[] = [];
    const tasks: Task[] = [];
    const dist = calculateSubjectDistribution(events, tasks);

    expect(dist).toEqual([]);
    expect(events.length).toBe(0);
  });

  it('correctly aggregates hours, percentages, and session counts from real events', () => {
    const events: EventItem[] = [
      {
        id: '1',
        scheduleId: 's1',
        title: 'CS401 - Machine Learning',
        description: null,
        startsAt: '2026-11-02T08:00:00Z',
        endsAt: '2026-11-02T11:30:00Z', // 3.5h
        location: 'Lab AI 302',
        priority: 'HIGH',
        status: 'CONFIRMED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        createdAt: '',
        updatedAt: '',
        occurrenceId: '1',
        seriesId: '1',
        categoryId: null,
      },
      {
        id: '2',
        scheduleId: 's1',
        title: 'CS401 - Machine Learning Lab',
        description: null,
        startsAt: '2026-11-04T08:00:00Z',
        endsAt: '2026-11-04T11:30:00Z', // 3.5h
        location: 'Lab AI 302',
        priority: 'HIGH',
        status: 'CONFIRMED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        createdAt: '',
        updatedAt: '',
        occurrenceId: '2',
        seriesId: '2',
        categoryId: null,
      },
      {
        id: '3',
        scheduleId: 's1',
        title: 'PRN231 - Capstone AI',
        description: 'Đồ án tốt nghiệp',
        startsAt: '2026-11-03T13:30:00Z',
        endsAt: '2026-11-03T16:30:00Z', // 3.0h
        location: 'Atrium',
        priority: 'HIGH',
        status: 'CONFIRMED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        createdAt: '',
        updatedAt: '',
        occurrenceId: '3',
        seriesId: '3',
        categoryId: null,
      },
    ];

    const dist = calculateSubjectDistribution(events, []);

    expect(dist).toHaveLength(2);
    // CS401 has 3.5 + 3.5 = 7.0h out of 10.0h total -> 70%
    expect(dist[0].code).toBe('CS401');
    expect(dist[0].hours).toBe(7);
    expect(dist[0].percent).toBe(70);
    expect(dist[0].sessions).toBe('2 phiên/tuần');

    // PRN231 has 3.0h out of 10.0h total -> 30%
    expect(dist[1].code).toBe('PRN231');
    expect(dist[1].hours).toBe(3);
    expect(dist[1].percent).toBe(30);
    expect(dist[1].sessions).toBe('1 phiên/tuần');
  });
});
