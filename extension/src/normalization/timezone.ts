/**
 * Timezone offset map for common academic portal regions.
 */
const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Tokyo': '+09:00',
  'Asia/Seoul': '+09:00',
  'Asia/Singapore': '+08:00',
  'UTC': 'Z',
};

/**
 * Gets timezone offset string for a given IANA timezone identifier.
 */
export function getTimezoneOffset(timezone: string): string {
  if (TIMEZONE_OFFSETS[timezone]) {
    return TIMEZONE_OFFSETS[timezone];
  }
  // Default to Vietnam timezone UTC+07:00
  return '+07:00';
}

/**
 * Combines date string (YYYY-MM-DD) and time string (HH:mm) into an ISO 8601 string
 * with explicit timezone offset.
 * Example: ("2026-09-28", "07:30", "Asia/Ho_Chi_Minh") -> "2026-09-28T07:30:00+07:00"
 */
export function formatIsoWithTimezone(isoDate: string, timeStr: string, timezone = 'Asia/Ho_Chi_Minh'): string {
  const offset = getTimezoneOffset(timezone);
  const seconds = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${isoDate}T${seconds}${offset}`;
}

/**
 * Calculates duration in minutes between two ISO 8601 timestamps.
 */
export function calculateDurationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.round((end - start) / (1000 * 60));
}
