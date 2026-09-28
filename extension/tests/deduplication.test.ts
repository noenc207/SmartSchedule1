import { describe, it, expect } from 'vitest';
import { deduplicateScheduleItems } from '../src/normalization/deduplication';
import type { UniversalScheduleItem } from '../src/shared/types';

describe('Deduplication & Fingerprinting', () => {
  const item1: UniversalScheduleItem = {
    title: 'Lập trình C#',
    courseCode: 'PRN211',
    startTime: '2026-09-28T07:30:00+07:00',
    endTime: '2026-09-28T09:00:00+07:00',
    location: 'BE-301',
    source: 'FAP',
  };

  const item1Duplicate: UniversalScheduleItem = {
    ...item1,
    teacher: 'HuongLT', // even if minor optional metadata differs, same slot + course + room is a duplicate
  };

  const item2: UniversalScheduleItem = {
    title: 'Cơ sở dữ liệu',
    courseCode: 'DBI202',
    startTime: '2026-09-28T09:15:00+07:00',
    endTime: '2026-09-28T10:45:00+07:00',
    location: 'BE-302',
    source: 'FAP',
  };

  it('removes duplicate sessions with identical schedule coordinates', () => {
    const res = deduplicateScheduleItems([item1, item1Duplicate, item2]);
    expect(res.unique.length).toBe(2);
    expect(res.duplicateCount).toBe(1);
    expect(res.unique[0].title).toBe('Lập trình C#');
    expect(res.unique[1].title).toBe('Cơ sở dữ liệu');
  });

  it('preserves distinct sessions on different days or times', () => {
    const res = deduplicateScheduleItems([item1, item2]);
    expect(res.unique.length).toBe(2);
    expect(res.duplicateCount).toBe(0);
  });
});
