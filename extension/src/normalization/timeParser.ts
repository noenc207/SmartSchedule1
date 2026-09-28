export interface ParsedTime {
  hour: number;
  minute: number;
  timeStr: string; // "HH:mm"
}

export interface ParsedTimeRange {
  start: ParsedTime;
  end: ParsedTime;
}

export const FPT_DEFAULT_SLOTS: Record<number, { start: string; end: string }> = {
  1: { start: '07:30', end: '09:00' },
  2: { start: '09:15', end: '10:45' },
  3: { start: '11:00', end: '12:30' },
  4: { start: '13:30', end: '15:00' },
  5: { start: '15:15', end: '16:45' },
  6: { start: '17:00', end: '18:30' },
  7: { start: '18:45', end: '20:15' },
  8: { start: '20:30', end: '22:00' },
};

/**
 * Parses a single time string like "07:30", "7:30", "07h30", "13:30:00".
 */
export function parseSingleTime(timeStr: string): ParsedTime | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const clean = timeStr.trim();
  const match = clean.match(/(\d{1,2})[:h](\d{2})/i);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  const hStr = String(hour).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');

  return {
    hour,
    minute,
    timeStr: `${hStr}:${mStr}`,
  };
}

/**
 * Parses a time range string like:
 * "07:30 - 09:00"
 * "07h30 – 09h00"
 * "7:30 to 9:00"
 */
export function parseTimeRange(rangeStr: string): ParsedTimeRange | null {
  if (!rangeStr || typeof rangeStr !== 'string') return null;

  const clean = rangeStr.trim();
  const match = clean.match(/(\d{1,2}[:h]\d{2})\s*(?:[-–—to~]+)\s*(\d{1,2}[:h]\d{2})/i);
  if (!match) return null;

  const start = parseSingleTime(match[1]);
  const end = parseSingleTime(match[2]);

  if (!start || !end) return null;

  return { start, end };
}

/**
 * Resolves time range from a slot number (e.g. Slot 1 -> 07:30 - 09:00).
 */
export function resolveSlotTimes(slotNumber: number, customSlots?: Record<number, { start: string; end: string }>): ParsedTimeRange | null {
  const map = customSlots || FPT_DEFAULT_SLOTS;
  const slot = map[slotNumber];
  if (!slot) return null;

  const start = parseSingleTime(slot.start);
  const end = parseSingleTime(slot.end);

  if (!start || !end) return null;
  return { start, end };
}
