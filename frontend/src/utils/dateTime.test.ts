import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMEZONE,
  formatTime,
  formatTimeRange,
  formatDate,
  formatDateTime,
  formatForInput,
  localInputToInstant,
  parseTime,
  formatDuration,
  getDurationMinutes,
  createTimestamp,
  parseShortNaturalInput,
} from './dateTime';

describe('Centralized Date & Time Engine', () => {
  const testCases = [
    { hour: 8, minute: 0, expected: '08:00' },
    { hour: 9, minute: 30, expected: '09:30' },
    { hour: 12, minute: 0, expected: '12:00' },
    { hour: 13, minute: 0, expected: '13:00' },
    { hour: 15, minute: 0, expected: '15:00' },
    { hour: 18, minute: 0, expected: '18:00' },
    { hour: 20, minute: 0, expected: '20:00' },
    { hour: 22, minute: 0, expected: '22:00' },
    { hour: 23, minute: 30, expected: '23:30' },
  ];

  testCases.forEach(({ hour, minute, expected }) => {
    it(`correctly converts and formats ${expected} in ${DEFAULT_TIMEZONE} without AM/PM inversion`, () => {
      const iso = createTimestamp(2026, 9, 22, hour, minute, DEFAULT_TIMEZONE);
      const formatted = formatTime(iso, DEFAULT_TIMEZONE);
      expect(formatted).toBe(expected);

      // Verify input round-trip
      const inputStr = formatForInput(iso, DEFAULT_TIMEZONE);
      expect(inputStr).toBe(`2026-09-22T${expected}`);
      const roundTripIso = localInputToInstant(inputStr, DEFAULT_TIMEZONE);
      expect(roundTripIso).toBe(iso);
    });
  });

  it('correctly formats time ranges', () => {
    const start = createTimestamp(2026, 9, 22, 8, 0);
    const end = createTimestamp(2026, 9, 22, 9, 30);
    expect(formatTimeRange(start, end)).toBe('08:00 – 09:30');
    expect(getDurationMinutes(start, end)).toBe(90);
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('formats duration correctly across boundaries', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(150)).toBe('2h 30m');
  });

  it('parses time strings deterministically', () => {
    expect(parseTime('08:00')).toEqual({ hour: 8, minute: 0 });
    expect(parseTime('14:30')).toEqual({ hour: 14, minute: 30 });
    expect(parseTime('2:30 PM')).toEqual({ hour: 14, minute: 30 });
    expect(parseTime('2:30pm')).toEqual({ hour: 14, minute: 30 });
    expect(parseTime('8:15 AM')).toEqual({ hour: 8, minute: 15 });
    expect(parseTime('12:00 AM')).toEqual({ hour: 0, minute: 0 });
    expect(parseTime('12:00 PM')).toEqual({ hour: 12, minute: 0 });
  });

  it('preserves exact date across round trip regardless of host timezone', () => {
    const input = '2026-09-22T19:00';
    const instant = localInputToInstant(input, DEFAULT_TIMEZONE);
    // 19:00 in UTC+7 is 12:00 UTC
    expect(instant).toBe('2026-09-22T12:00:00.000Z');
    expect(formatTime(instant, DEFAULT_TIMEZONE)).toBe('19:00');
    expect(formatForInput(instant, DEFAULT_TIMEZONE)).toBe('2026-09-22T19:00');
  });

  describe('parseShortNaturalInput', () => {
    const baseDate = createTimestamp(2026, 9, 22, 10, 0, DEFAULT_TIMEZONE);

    it('parses 12-hour time tokens at the end (e.g. "Review bài 8pm")', () => {
      const parsed = parseShortNaturalInput('Review bài 8pm', baseDate, 60, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(true);
      expect(parsed.title).toBe('Review bài');
      expect(formatTime(parsed.startsAt, DEFAULT_TIMEZONE)).toBe('20:00');
      expect(formatTime(parsed.endsAt, DEFAULT_TIMEZONE)).toBe('21:00');
    });

    it('parses 24-hour time tokens (e.g. "Database Lab 14:30")', () => {
      const parsed = parseShortNaturalInput('Database Lab 14:30', baseDate, 90, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(true);
      expect(parsed.title).toBe('Database Lab');
      expect(formatTime(parsed.startsAt, DEFAULT_TIMEZONE)).toBe('14:30');
      expect(formatTime(parsed.endsAt, DEFAULT_TIMEZONE)).toBe('16:00');
    });

    it('parses morning time with AM (e.g. "Team sync 9am")', () => {
      const parsed = parseShortNaturalInput('Team sync 9am', baseDate, 30, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(true);
      expect(parsed.title).toBe('Team sync');
      expect(formatTime(parsed.startsAt, DEFAULT_TIMEZONE)).toBe('09:00');
      expect(formatTime(parsed.endsAt, DEFAULT_TIMEZONE)).toBe('09:30');
    });

    it('parses Vietnamese notation (e.g. "Seminar 14h30")', () => {
      const parsed = parseShortNaturalInput('Seminar 14h30', baseDate, 60, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(true);
      expect(parsed.title).toBe('Seminar');
      expect(formatTime(parsed.startsAt, DEFAULT_TIMEZONE)).toBe('14:30');
      expect(formatTime(parsed.endsAt, DEFAULT_TIMEZONE)).toBe('15:30');
    });

    it('parses with "at" preposition (e.g. "Office hours at 10:00")', () => {
      const parsed = parseShortNaturalInput('Office hours at 10:00', baseDate, 60, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(true);
      expect(parsed.title).toBe('Office hours');
      expect(formatTime(parsed.startsAt, DEFAULT_TIMEZONE)).toBe('10:00');
    });

    it('preserves plain text without time token and uses baseStart', () => {
      const parsed = parseShortNaturalInput('AIG201 Project Checkpoint', baseDate, 60, DEFAULT_TIMEZONE);
      expect(parsed.parsedTimeMatched).toBe(false);
      expect(parsed.title).toBe('AIG201 Project Checkpoint');
      expect(parsed.startsAt).toBe(baseDate);
    });
  });

  describe('Invalid date/time resilience', () => {
    it('handles invalid dates gracefully without throwing RangeError', () => {
      expect(formatTime('invalid-date')).toBe('');
      expect(formatTime(new Date(NaN))).toBe('');
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate(new Date(NaN))).toBe('');
      expect(formatDateTime('invalid-date')).toBe(' · ');
      expect(formatForInput('invalid-date')).toBe('');
      expect(formatForInput(new Date(NaN))).toBe('');
      expect(localInputToInstant('invalid-date')).toBe('');
      expect(localInputToInstant('NaN-NaN-NaNTH:0')).toBe('');
      expect(createTimestamp(NaN, NaN, NaN, 14, 0)).toBe('');
      expect(() => parseShortNaturalInput('Test', 'invalid-base-date', 60)).not.toThrow();
    });

    it('formats with specific options without unexpected fields', () => {
      const iso = createTimestamp(2026, 9, 22, 14, 30, DEFAULT_TIMEZONE);
      const yearOnly = formatDate(iso, DEFAULT_TIMEZONE, { year: 'numeric' });
      expect(yearOnly).toBe('2026');
      expect(Number(yearOnly)).toBe(2026);
    });
  });
});

