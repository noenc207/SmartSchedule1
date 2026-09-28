import { describe, it, expect } from 'vitest';
import { parseScheduleDate } from '../src/normalization/dateParser';

describe('Date Parser', () => {
  it('parses standard DD/MM/YYYY format', () => {
    const res = parseScheduleDate('28/09/2026', 'DD/MM/YYYY');
    expect(res).not.toBeNull();
    expect(res?.isoDate).toBe('2026-09-28');
    expect(res?.year).toBe(2026);
    expect(res?.month).toBe(9);
    expect(res?.day).toBe(28);
  });

  it('parses date with Vietnamese weekday prefix', () => {
    const res = parseScheduleDate('Thứ Hai, 28/09/2026');
    expect(res?.isoDate).toBe('2026-09-28');

    const res2 = parseScheduleDate('Thứ 3 (29/09/2026)');
    expect(res2?.isoDate).toBe('2026-09-29');
  });

  it('parses YYYY-MM-DD format', () => {
    const res = parseScheduleDate('2026-10-15', 'YYYY-MM-DD');
    expect(res?.isoDate).toBe('2026-10-15');
  });

  it('rejects invalid or non-date strings', () => {
    expect(parseScheduleDate('')).toBeNull();
    expect(parseScheduleDate('invalid text')).toBeNull();
    expect(parseScheduleDate('32/13/2026')).toBeNull();
  });
});
