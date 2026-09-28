import { describe, it, expect } from 'vitest';
import { validateScheduleItems } from '../src/normalization/validator';
import type { UniversalScheduleItem } from '../src/shared/types';

describe('Schedule Item Validator', () => {
  it('passes valid schedule items', () => {
    const items: UniversalScheduleItem[] = [
      {
        title: 'Lập trình nâng cao',
        startTime: '2026-09-28T07:30:00+07:00',
        endTime: '2026-09-28T09:00:00+07:00',
        location: 'P.301',
        source: 'FAP',
      },
    ];

    const res = validateScheduleItems(items);
    expect(res.valid).toBe(true);
    expect(res.validCount).toBe(1);
    expect(res.errorCount).toBe(0);
  });

  it('rejects items with missing title or invalid time range', () => {
    const items: UniversalScheduleItem[] = [
      {
        title: '',
        startTime: '2026-09-28T07:30:00+07:00',
        endTime: '2026-09-28T09:00:00+07:00',
        source: 'FAP',
      },
      {
        title: 'Môn học lỗi giờ',
        startTime: '2026-09-28T10:00:00+07:00',
        endTime: '2026-09-28T08:00:00+07:00', // end before start
        source: 'FAP',
      },
    ];

    const res = validateScheduleItems(items);
    expect(res.valid).toBe(false);
    expect(res.errorCount).toBe(2);
    expect(res.validCount).toBe(0);
  });

  it('warns on missing location or long duration without blocking', () => {
    const items: UniversalScheduleItem[] = [
      {
        title: 'Hội thảo cả ngày',
        startTime: '2026-09-28T08:00:00+07:00',
        endTime: '2026-09-28T17:00:00+07:00', // 9 hours
        source: 'FAP',
      },
    ];

    const res = validateScheduleItems(items);
    expect(res.valid).toBe(true); // Warnings do not invalidate
    expect(res.validCount).toBe(1);
    expect(res.warningCount).toBeGreaterThanOrEqual(1);
  });
});
