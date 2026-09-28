import { describe, it, expect } from 'vitest';
import { parseSingleTime, parseTimeRange, resolveSlotTimes } from '../src/normalization/timeParser';

describe('Time Parser', () => {
  it('parses single times with : and h notation', () => {
    const t1 = parseSingleTime('07:30');
    expect(t1).toEqual({ hour: 7, minute: 30, timeStr: '07:30' });

    const t2 = parseSingleTime('13h45');
    expect(t2).toEqual({ hour: 13, minute: 45, timeStr: '13:45' });

    const t3 = parseSingleTime('9:05');
    expect(t3).toEqual({ hour: 9, minute: 5, timeStr: '09:05' });
  });

  it('parses time ranges with various delimiters', () => {
    const r1 = parseTimeRange('07:30 - 09:00');
    expect(r1).not.toBeNull();
    expect(r1?.start.timeStr).toBe('07:30');
    expect(r1?.end.timeStr).toBe('09:00');

    const r2 = parseTimeRange('13h30 – 15h00');
    expect(r2?.start.timeStr).toBe('13:30');
    expect(r2?.end.timeStr).toBe('15:00');

    const r3 = parseTimeRange('07:30 to 09:00 (Slot 1)');
    expect(r3?.start.timeStr).toBe('07:30');
    expect(r3?.end.timeStr).toBe('09:00');
  });

  it('resolves standard university slots', () => {
    const slot1 = resolveSlotTimes(1);
    expect(slot1?.start.timeStr).toBe('07:30');
    expect(slot1?.end.timeStr).toBe('09:00');

    const slot4 = resolveSlotTimes(4);
    expect(slot4?.start.timeStr).toBe('13:30');
    expect(slot4?.end.timeStr).toBe('15:00');
  });

  it('rejects invalid time ranges', () => {
    expect(parseTimeRange('invalid')).toBeNull();
    expect(parseTimeRange('25:00 - 26:00')).toBeNull();
  });
});
