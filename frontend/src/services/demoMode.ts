import { DEFAULT_TIMEZONE, localInputToInstant } from '../utils/dateTime';

let memoryDemoMode: boolean | null = null;

export function isRealMode(): boolean {
  if (import.meta.env.VITE_DEMO_DISABLED === 'true') return true;
  if (import.meta.env.PROD && import.meta.env.VITE_API_MODE !== 'demo') return true;
  return import.meta.env.VITE_API_MODE === 'real' && (typeof localStorage === 'undefined' || localStorage.getItem('smartschedule-demo-mode') !== 'true');
}

export function isDemoMode(): boolean {
  if (memoryDemoMode !== null) {
    return memoryDemoMode;
  }
  // In production builds or when demo is explicitly disabled, demo mode is strictly disabled
  if (import.meta.env.PROD && import.meta.env.VITE_API_MODE !== 'demo') {
    return false;
  }
  if (import.meta.env.VITE_DEMO_DISABLED === 'true') {
    return false;
  }
  try {
    const apiMode = import.meta.env.VITE_API_MODE;
    if (apiMode === 'demo') {
      return true;
    }
    return (
      import.meta.env.VITE_DEMO_MODE === 'true' ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('smartschedule-demo-mode') === 'true')
    );
  } catch {
    return false;
  }
}

export function setDemoMode(enabled: boolean): void {
  memoryDemoMode = enabled;
  try {
    if (typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem('smartschedule-demo-mode', 'true');
      } else {
        localStorage.removeItem('smartschedule-demo-mode');
      }
    }
  } catch {
    // LocalStorage might be restricted
  }
}

/**
 * Returns Monday year, month (1-indexed), and day of the current week in Asia/Ho_Chi_Minh.
 * 0 (Sunday) maps to Monday 6 days ago so that Mon-Sun stays in one coherent week.
 */
export function getDemoWeekMonday(): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(now);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = weekdayMap[partMap.weekday] ?? 1;
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const d = new Date(Date.UTC(Number(partMap.year), Number(partMap.month) - 1, Number(partMap.day) + diffToMonday));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Generates local datetime-local string (YYYY-MM-DDTHH:mm) for input fields
 * representing hours and minutes in Asia/Ho_Chi_Minh timezone.
 */
export function getDemoInputDate(dayOffset: number, hours: number, minutes = 0): string {
  const monday = getDemoWeekMonday();
  const target = new Date(Date.UTC(monday.year, monday.month - 1, monday.day + dayOffset));
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = target.getUTCFullYear();
  const m = pad(target.getUTCMonth() + 1);
  const d = pad(target.getUTCDate());
  return `${y}-${m}-${d}T${pad(hours)}:${pad(minutes)}`;
}

/**
 * Generates an exact UTC ISO-8601 timestamp for dayOffset from Monday and time in Asia/Ho_Chi_Minh.
 * Completely immune to host-machine local timezone shifts.
 */
export function getDemoDate(dayOffset: number, hours: number, minutes = 0): string {
  const inputStr = getDemoInputDate(dayOffset, hours, minutes);
  return localInputToInstant(inputStr, DEFAULT_TIMEZONE);
}
