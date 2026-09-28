export interface ParsedDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  isoDate: string; // "YYYY-MM-DD"
}

/**
 * Robust date parser for university schedule dates.
 * Handles formats like:
 * - "28/09/2026"
 * - "2026-09-28"
 * - "28-09-2026"
 * - "Thứ Hai, 28/09/2026"
 * - "Mon, 28/09/2026"
 * - "28/9/2026"
 */
export function parseScheduleDate(dateStr: string, format = 'DD/MM/YYYY'): ParsedDate | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const clean = dateStr.trim();

  // 1. Try to extract DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY using regex
  const dmyMatch = clean.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const ymdMatch = clean.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);

  let year: number;
  let month: number;
  let day: number;

  if (format.toUpperCase().startsWith('YYYY') && ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else {
    return null;
  }

  // Basic sanity validation
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 2000 || year > 2100) return null;

  const yStr = String(year).padStart(4, '0');
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  return {
    year,
    month,
    day,
    isoDate: `${yStr}-${mStr}-${dStr}`,
  };
}
