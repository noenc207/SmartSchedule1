import { describe, expect, it } from 'vitest';
import { naturalLanguageParser } from './naturalLanguageParser';

describe('Deterministic Natural Language Parser for SmartSchedule', () => {
  // Fix a baseDate for deterministic testing: Tuesday, Sept 22, 2026 10:00 UTC+7
  const baseDate = new Date('2026-09-22T03:00:00.000Z');
  const timeZone = 'Asia/Ho_Chi_Minh';

  it('parses "Review bài 8pm" -> title + 20:00 time + default 60m duration', () => {
    const intent = naturalLanguageParser.parse('Review bài 8pm', { baseDate, timeZone });

    expect(intent.title).toContain('Review bài');
    expect(intent.startTime).toBe('20:00');
    expect(intent.endTime).toBe('21:00');
    expect(intent.durationMinutes).toBe(60);
    expect(intent.isScheduleRequested).toBe(true);
  });

  it('parses "Làm Database Project trong 2 tiếng chiều mai" -> title + 120m + tomorrow date + afternoon', () => {
    const intent = naturalLanguageParser.parse('Làm Database Project trong 2 tiếng chiều mai', { baseDate, timeZone });

    expect(intent.title).toContain('Database Project');
    expect(intent.durationMinutes).toBe(120);
    // Base is 2026-09-22, tomorrow is 2026-09-23
    expect(intent.date).toBe('2026-09-23');
    expect(intent.timeOfDay).toBe('afternoon');
  });

  it('parses "Học Machine Learning 19:00–21:00" -> title + 120m + correct time range', () => {
    const intent = naturalLanguageParser.parse('Học Machine Learning 19:00–21:00', { baseDate, timeZone });

    expect(intent.title).toContain('Machine Learning');
    expect(intent.startTime).toBe('19:00');
    expect(intent.endTime).toBe('21:00');
    expect(intent.durationMinutes).toBe(120);
    expect(intent.isScheduleRequested).toBe(true);
  });

  it('strictly handles ambiguous input "Database Project" with NO invented date, time, or deadline', () => {
    const intent = naturalLanguageParser.parse('Database Project', { baseDate, timeZone });

    expect(intent.title).toBe('Database Project');
    expect(intent.date).toBeUndefined();
    expect(intent.startTime).toBeUndefined();
    expect(intent.endTime).toBeUndefined();
    expect(intent.durationMinutes).toBeUndefined();
    expect(intent.timeOfDay).toBeUndefined();
    expect(intent.isScheduleRequested).toBe(false);
    expect(intent.confidence).toBe(0.5);
  });

  it('parses priority keywords correctly (gấp, urgent -> HIGH)', () => {
    const intentHigh = naturalLanguageParser.parse('Hoàn thành bài tập Lab gấp', { baseDate, timeZone });
    expect(intentHigh.priority).toBe('HIGH');
    expect(intentHigh.title).toContain('bài tập Lab');

    const intentUrgent = naturalLanguageParser.parse('Urgent submit Capstone report', { baseDate, timeZone });
    expect(intentUrgent.priority).toBe('HIGH');
    expect(intentUrgent.title).toContain('submit Capstone report');
  });

  it('parses Vietnamese duration formats like "45 phút", "1h30m"', () => {
    const intentMin = naturalLanguageParser.parse('Đọc tài liệu trong 45 phút', { baseDate, timeZone });
    expect(intentMin.durationMinutes).toBe(45);

    const intentComp = naturalLanguageParser.parse('Luyện code 1h30m', { baseDate, timeZone });
    expect(intentComp.durationMinutes).toBe(90);
  });
});
