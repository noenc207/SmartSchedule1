import type { UniversalScheduleItem } from '../shared/types';
import type { ExtractionRule } from '../rules/types';
import { parseScheduleDate } from './dateParser';
import { parseTimeRange, parseSingleTime, resolveSlotTimes } from './timeParser';
import { formatIsoWithTimezone } from './timezone';
import { generateEventFingerprint } from '../shared/fingerprint';

export interface RawExtractedRow {
  title?: string;
  courseCode?: string;
  date?: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  teacher?: string;
  group?: string;
  slot?: string;
  status?: string;
  rawText?: string;
}

/**
 * Normalizes a raw extracted schedule row into a canonical UniversalScheduleItem.
 */
export function normalizeExtractedRow(
  raw: RawExtractedRow,
  rule: ExtractionRule
): UniversalScheduleItem | null {
  if (!raw.title && !raw.courseCode) {
    return null;
  }

  // 1. Resolve date
  let isoDate: string | null = null;
  if (raw.date) {
    const parsedDate = parseScheduleDate(raw.date, rule.dateFormat);
    if (parsedDate) {
      isoDate = parsedDate.isoDate;
    }
  }

  if (!isoDate) {
    return null;
  }

  // 2. Resolve times
  let startStr: string | null = null;
  let endStr: string | null = null;

  if (raw.timeRange) {
    const parsedRange = parseTimeRange(raw.timeRange);
    if (parsedRange) {
      startStr = parsedRange.start.timeStr;
      endStr = parsedRange.end.timeStr;
    }
  }

  if (!startStr && raw.startTime && raw.endTime) {
    const pStart = parseSingleTime(raw.startTime);
    const pEnd = parseSingleTime(raw.endTime);
    if (pStart && pEnd) {
      startStr = pStart.timeStr;
      endStr = pEnd.timeStr;
    }
  }

  // Fallback: slot number resolution
  if (!startStr && raw.slot) {
    const slotMatch = raw.slot.match(/\d+/);
    if (slotMatch) {
      const slotNum = parseInt(slotMatch[0], 10);
      const slotTimes = resolveSlotTimes(slotNum);
      if (slotTimes) {
        startStr = slotTimes.start.timeStr;
        endStr = slotTimes.end.timeStr;
      }
    }
  }

  if (!startStr || !endStr) {
    return null;
  }

  const startIso = formatIsoWithTimezone(isoDate, startStr, rule.timezone);
  const endIso = formatIsoWithTimezone(isoDate, endStr, rule.timezone);

  // 3. Clean title and course code
  let title = (raw.title || raw.courseCode || 'Buổi học').trim();
  let courseCode = raw.courseCode?.trim();

  // If title contains course code e.g. "PRN211 - Lập trình C#", split or clean
  if (!courseCode) {
    const codeMatch = title.match(/^([A-Z]{2,4}\d{3,4}[A-Z]?)\s*[-–—:]\s*(.+)/);
    if (codeMatch) {
      courseCode = codeMatch[1];
      title = codeMatch[2].trim();
    }
  }

  const item: UniversalScheduleItem = {
    title,
    courseCode,
    startTime: startIso,
    endTime: endIso,
    location: raw.location?.trim() || undefined,
    teacher: raw.teacher?.trim() || undefined,
    group: raw.group?.trim() || undefined,
    source: rule.provider || 'UNKNOWN',
    status: 'CONFIRMED',
  };

  item.externalId = generateEventFingerprint(item);
  return item;
}

/**
 * Normalizes multiple raw rows and filters out null results.
 */
export function normalizeExtractedRows(
  rows: RawExtractedRow[],
  rule: ExtractionRule
): UniversalScheduleItem[] {
  const items: UniversalScheduleItem[] = [];
  for (const row of rows) {
    const norm = normalizeExtractedRow(row, rule);
    if (norm) {
      items.push(norm);
    }
  }
  return items;
}
