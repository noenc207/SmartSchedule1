/**
 * Centralized Date & Time Engine for SmartSchedule
 *
 * Canonical timezone: Asia/Ho_Chi_Minh (UTC+7, Vietnam / FPT University Quy Nhon)
 * All timestamps are handled deterministically without host-machine timezone drift.
 */

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Formats an ISO string or Date to 24-hour time (HH:mm) or 12-hour time in the target timezone.
 * Defaults to 24-hour time to prevent AM/PM inversion.
 * Examples: "08:00", "09:30", "13:00", "19:30", "23:30"
 */
export function formatTime(
  dateOrIso: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  options?: { hour12?: boolean }
): string {
  if (!dateOrIso) return '';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '';
    const is12Hour = options?.hour12 ?? false;
    if (is12Hour) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    }
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats a start and end time range in the target timezone.
 * Example: "08:00 – 09:30" or "8:00 AM – 9:30 AM"
 */
export function formatTimeRange(
  start: string | Date,
  end: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  options?: { hour12?: boolean }
): string {
  return `${formatTime(start, timeZone, options)} – ${formatTime(end, timeZone, options)}`;
}

/**
 * Formats date into human-readable string in target timezone.
 * Example: "Tue, Sep 22" or custom options.
 */
export function formatDate(
  dateOrIso: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateOrIso) return '';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const resolved: Intl.DateTimeFormatOptions = {
      timeZone,
      ...(options ? options : defaultOptions),
    };
    return new Intl.DateTimeFormat('en-US', resolved).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats date and time into a clear readable string in target timezone.
 * Example: "Tue, Sep 22 · 14:00"
 */
export function formatDateTime(
  dateOrIso: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return `${formatDate(dateOrIso, timeZone)} · ${formatTime(dateOrIso, timeZone)}`;
}

/**
 * Formats an ISO string or Date for HTML datetime-local inputs (YYYY-MM-DDTHH:mm)
 * in the specified timezone.
 */
export function formatForInput(
  dateOrIso: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!dateOrIso) return '';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    if (!value.year || !value.month || !value.day || !value.hour || !value.minute) return '';
    return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
  } catch {
    return '';
  }
}

/**
 * Converts a local datetime-local string (YYYY-MM-DDTHH:mm) to an exact ISO-8601 UTC string (...Z)
 * assuming the input was intended for the given timezone.
 */
export function localInputToInstant(
  value: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!value) return '';
  try {
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return '';
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return '';

    // Guess as UTC
    const guessUtc = Date.UTC(year, month - 1, day, hour, minute);
    if (isNaN(guessUtc)) return '';
    // Find what time guessUtc represents in timeZone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guessUtc));
    const actual = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
    const representedUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    if (isNaN(representedUtc)) return '';
    const offsetMs = representedUtc - guessUtc;
    const finalInstantMs = guessUtc - offsetMs;
    if (isNaN(finalInstantMs)) return '';
    return new Date(finalInstantMs).toISOString();
  } catch {
    return '';
  }
}

/**
 * Parses time strings such as "14:30", "08:00", "2:30 PM", "2:30pm" deterministically.
 */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 0, minute: 0 };
  const trimmed = timeStr.trim();
  const isPm = /pm/i.test(trimmed);
  const isAm = /am/i.test(trimmed);
  const clean = trimmed.replace(/[^\d:]/g, '');
  const [hStr, mStr] = clean.split(':');
  let hour = parseInt(hStr, 10) || 0;
  const minute = parseInt(mStr, 10) || 0;
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;
  return { hour: Math.min(23, Math.max(0, hour)), minute: Math.min(59, Math.max(0, minute)) };
}

/**
 * Formats duration in minutes into a concise string.
 * Example: 90 -> "1h 30m", 60 -> "1h", 45 -> "45m"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours > 0 && rem > 0) return `${hours}h ${rem}m`;
  if (hours > 0) return `${hours}h`;
  return `${rem}m`;
}

/**
 * Calculates duration between two dates/ISO strings in minutes.
 */
export function getDurationMinutes(start: string | Date, end: string | Date): number {
  if (!start || !end) return 0;
  const s = typeof start === 'string' ? new Date(start).getTime() : start.getTime();
  const e = typeof end === 'string' ? new Date(end).getTime() : end.getTime();
  return Math.max(0, Math.round((e - s) / 60000));
}

/**
 * Deterministically creates an ISO timestamp for a date and time in the target timezone.
 */
export function createTimestamp(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute = 0,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return localInputToInstant(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`, timeZone);
}

/**
 * Check if two dates fall on the same day in the target timezone.
 */
export function isSameDay(
  d1: string | Date,
  d2: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): boolean {
  const f1 = formatDate(d1, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const f2 = formatDate(d2, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return f1 === f2;
}

export interface ParsedShortInput {
  title: string;
  startsAt: string;
  endsAt: string;
  parsedTimeMatched: boolean;
}

/**
 * Deterministically parses short natural text inputs such as:
 * "Review bài 8pm" -> title: "Review bài", start: 20:00
 * "Database Lab 14:30" -> title: "Database Lab", start: 14:30
 * "Team sync 9am" -> title: "Team sync", start: 09:00
 * "Seminar 14h30" -> title: "Seminar", start: 14:30
 *
 * If no time token is matched, preserves the original title and baseStart/endsAt.
 */
export function parseShortNaturalInput(
  input: string,
  baseStartIso: string,
  defaultDurationMinutes = 60,
  timeZone = DEFAULT_TIMEZONE
): ParsedShortInput {
  const trimmed = input.trim();
  const baseTime = baseStartIso ? new Date(baseStartIso).getTime() : NaN;
  const safeBaseTime = !isNaN(baseTime) ? baseTime : Date.now();
  const safeBaseStartIso = !isNaN(baseTime) ? baseStartIso : new Date(safeBaseTime).toISOString();

  if (!trimmed || !baseStartIso) {
    const end = baseStartIso && !isNaN(baseTime)
      ? new Date(baseTime + defaultDurationMinutes * 60000).toISOString()
      : '';
    return {
      title: trimmed,
      startsAt: baseStartIso,
      endsAt: end,
      parsedTimeMatched: false,
    };
  }

  // Look for end-of-string time patterns:
  // 1. "at 8pm", "8pm", "8:30pm", "8:30 am"
  // 2. "14:30", "at 14:30"
  // 3. "14h30", "14h", "8h" (Vietnamese notation)
  const regexPatterns = [
    // End with 12-hour: e.g. " 8pm", " 8:30pm", " at 8:30 AM"
    /(?:^|\s+)(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*$/i,
    // End with 24-hour: e.g. " 14:30", " at 08:00"
    /(?:^|\s+)(?:at\s+)?(\d{1,2}):(\d{2})\s*$/i,
    // End with "14h" or "14h30"
    /(?:^|\s+)(?:at\s+)?(\d{1,2})h(\d{2})?\s*$/i,
  ];

  let matchedHour: number | null = null;
  let matchedMinute = 0;
  let matchedSnippet = '';

  for (const pattern of regexPatterns) {
    const match = pattern.exec(trimmed);
    if (match) {
      const hRaw = parseInt(match[1], 10);
      const mRaw = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] ? match[3].toLowerCase() : null;

      let hour = hRaw;
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      if (hour >= 0 && hour <= 23 && mRaw >= 0 && mRaw <= 59) {
        matchedHour = hour;
        matchedMinute = mRaw;
        matchedSnippet = match[0];
        break;
      }
    }
  }

  if (matchedHour !== null) {
    // Extract base date's year, month, day in target timezone
    const baseDate = new Date(safeBaseTime);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(baseDate);
    const dateMap = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));

    const newStart = createTimestamp(
      dateMap.year,
      dateMap.month,
      dateMap.day,
      matchedHour,
      matchedMinute,
      timeZone
    );
    const startMs = new Date(newStart).getTime();
    const newEnd = !isNaN(startMs)
      ? new Date(startMs + defaultDurationMinutes * 60000).toISOString()
      : '';

    // Clean title by stripping matchedSnippet
    let cleanTitle = trimmed.slice(0, trimmed.length - matchedSnippet.length).trim();
    // Clean any trailing prepositions like "at" or dashes
    cleanTitle = cleanTitle.replace(/\s+(?:at|-)$/i, '').trim();

    return {
      title: cleanTitle || trimmed,
      startsAt: newStart,
      endsAt: newEnd,
      parsedTimeMatched: true,
    };
  }

  // Fallback if no pattern matched
  const fallbackEnd = !isNaN(safeBaseTime)
    ? new Date(safeBaseTime + defaultDurationMinutes * 60000).toISOString()
    : '';
  return {
    title: trimmed,
    startsAt: safeBaseStartIso,
    endsAt: fallbackEnd,
    parsedTimeMatched: false,
  };
}

