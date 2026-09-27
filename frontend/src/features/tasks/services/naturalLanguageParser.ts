import { DEFAULT_TIMEZONE, formatDate, createTimestamp } from '../../../utils/dateTime';

export type ParsedIntent = {
  type: 'createTask' | 'createEvent' | 'scheduleTask';
  title: string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  rawInput: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  isScheduleRequested: boolean;
};

export interface NaturalLanguageInputService {
  parse(rawInput: string, options?: { timeZone?: string; baseDate?: Date }): ParsedIntent;
}

/**
 * Deterministic Natural Language Parser for SmartSchedule.
 * Supports Vietnamese and English scheduling keywords.
 * Never invents dates/times when input is ambiguous.
 */
export class DeterministicNaturalLanguageParser implements NaturalLanguageInputService {
  parse(rawInput: string, options?: { timeZone?: string; baseDate?: Date }): ParsedIntent {
    const timeZone = options?.timeZone ?? DEFAULT_TIMEZONE;
    const baseDate = options?.baseDate ?? new Date();
    const input = rawInput.trim();

    if (!input) {
      return {
        type: 'createTask',
        title: '',
        confidence: 0,
        rawInput,
        isScheduleRequested: false,
      };
    }

    let working = ` ${input} `;
    let dateStr: string | undefined;
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | undefined;
    let startTime: string | undefined;
    let endTime: string | undefined;
    let durationMinutes: number | undefined;
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
    let isScheduleRequested = false;
    let detectedSignals = 0;

    // Helper to get relative date string YYYY-MM-DD in target timezone
    const getRelativeDateStr = (dayOffset: number): string => {
      const target = new Date(baseDate.getTime() + dayOffset * 86400000);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(target);
      const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
      return `${p.year}-${p.month}-${p.day}`;
    };

    // Helper to get next weekday date (e.g. next Monday)
    const getNextWeekdayDateStr = (targetDayOfWeek: number): string => {
      // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      const currentDay = baseDate.getDay();
      let diff = targetDayOfWeek - currentDay;
      if (diff <= 0) diff += 7;
      return getRelativeDateStr(diff);
    };

    // 1. Detect Priority signals
    const highPriorityRegex = /\b(gấp|urgent|khẩn cấp|quan trọng|high priority|priority high)\b/i;
    const lowPriorityRegex = /\b(low priority|priority low|không gấp|khi nào rảnh)\b/i;
    if (highPriorityRegex.test(working)) {
      priority = 'HIGH';
      detectedSignals++;
      working = working.replace(highPriorityRegex, ' ');
    } else if (lowPriorityRegex.test(working)) {
      priority = 'LOW';
      detectedSignals++;
      working = working.replace(lowPriorityRegex, ' ');
    }

    // 2. Detect Relative Date & Time of Day signals
    // "chiều mai" -> tomorrow + afternoon
    if (/\b(chiều mai|buổi chiều mai)\b/i.test(working)) {
      dateStr = getRelativeDateStr(1);
      timeOfDay = 'afternoon';
      detectedSignals += 2;
      working = working.replace(/\b(chiều mai|buổi chiều mai)\b/gi, ' ');
    }
    // "sáng mai" -> tomorrow + morning
    else if (/\b(sáng mai|buổi sáng mai)\b/i.test(working)) {
      dateStr = getRelativeDateStr(1);
      timeOfDay = 'morning';
      detectedSignals += 2;
      working = working.replace(/\b(sáng mai|buổi sáng mai)\b/gi, ' ');
    }
    // "tối mai" -> tomorrow + evening
    else if (/\b(tối mai|đêm mai)\b/i.test(working)) {
      dateStr = getRelativeDateStr(1);
      timeOfDay = 'evening';
      detectedSignals += 2;
      working = working.replace(/\b(tối mai|đêm mai)\b/gi, ' ');
    }
    // "tối nay" -> today + evening
    else if (/\b(tối nay|đêm nay|tonight)\b/i.test(working)) {
      dateStr = getRelativeDateStr(0);
      timeOfDay = 'evening';
      detectedSignals += 2;
      working = working.replace(/\b(tối nay|đêm nay|tonight)\b/gi, ' ');
    }
    // "chiều nay" -> today + afternoon
    else if (/\b(chiều nay|this afternoon)\b/i.test(working)) {
      dateStr = getRelativeDateStr(0);
      timeOfDay = 'afternoon';
      detectedSignals += 2;
      working = working.replace(/\b(chiều nay|this afternoon)\b/gi, ' ');
    }
    // "sáng nay" -> today + morning
    else if (/\b(sáng nay|this morning)\b/i.test(working)) {
      dateStr = getRelativeDateStr(0);
      timeOfDay = 'morning';
      detectedSignals += 2;
      working = working.replace(/\b(sáng nay|this morning)\b/gi, ' ');
    }
    // "ngày mai" or "mai" or "tomorrow"
    else if (/\b(ngày mai|tomorrow)\b/i.test(working) || /\bmai\b/i.test(working)) {
      dateStr = getRelativeDateStr(1);
      detectedSignals++;
      working = working.replace(/\b(ngày mai|tomorrow)\b/gi, ' ').replace(/\bmai\b/gi, ' ');
    }
    // "hôm nay" or "today"
    else if (/\b(hôm nay|today)\b/i.test(working)) {
      dateStr = getRelativeDateStr(0);
      detectedSignals++;
      working = working.replace(/\b(hôm nay|today)\b/gi, ' ');
    }
    // "next Monday", "thứ 2 tới", "thứ hai tuần tới"
    else if (/\b(next monday|thứ 2 tới|thứ 2 tuần tới|thứ hai tuần tới)\b/i.test(working)) {
      dateStr = getNextWeekdayDateStr(1);
      detectedSignals++;
      working = working.replace(/\b(next monday|thứ 2 tới|thứ 2 tuần tới|thứ hai tuần tới)\b/gi, ' ');
    } else if (/\b(next friday|thứ 6 tới|thứ sáu tuần tới)\b/i.test(working)) {
      dateStr = getNextWeekdayDateStr(5);
      detectedSignals++;
      working = working.replace(/\b(next friday|thứ 6 tới|thứ sáu tuần tới)\b/gi, ' ');
    }

    // Generic time of day if date already captured or standing alone
    if (!timeOfDay) {
      if (/\b(buổi sáng|in the morning|morning)\b/i.test(working)) {
        timeOfDay = 'morning';
        detectedSignals++;
        working = working.replace(/\b(buổi sáng|in the morning|morning)\b/gi, ' ');
      } else if (/\b(buổi chiều|in the afternoon|afternoon)\b/i.test(working)) {
        timeOfDay = 'afternoon';
        detectedSignals++;
        working = working.replace(/\b(buổi chiều|in the afternoon|afternoon)\b/gi, ' ');
      } else if (/\b(buổi tối|in the evening|evening)\b/i.test(working)) {
        timeOfDay = 'evening';
        detectedSignals++;
        working = working.replace(/\b(buổi tối|in the evening|evening)\b/gi, ' ');
      }
    }

    // 3. Detect Time Ranges: e.g. "19:00–21:00", "19:00-21:00", "8:00 - 10:00", "14h-16h", "14h30 - 16h"
    const timeRangeRegex = /\b(\d{1,2})(?::(\d{2})|h(\d{2})?)?\s*(?:–|-|to|đến)\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)?\b/i;
    const timeRangeMatch = timeRangeRegex.exec(working);
    if (timeRangeMatch) {
      const sh = parseInt(timeRangeMatch[1], 10);
      const sm = parseInt(timeRangeMatch[2] || timeRangeMatch[3] || '0', 10);
      const eh = parseInt(timeRangeMatch[4], 10);
      const em = parseInt(timeRangeMatch[5] || timeRangeMatch[6] || '0', 10);

      if (sh >= 0 && sh <= 23 && eh >= 0 && eh <= 23) {
        startTime = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
        endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        const rangeMin = (eh * 60 + em) - (sh * 60 + sm);
        if (rangeMin > 0) {
          durationMinutes = rangeMin;
        }
        detectedSignals += 2;
        isScheduleRequested = true;
        working = working.replace(timeRangeMatch[0], ' ');
      }
    }

    // 4. Detect Single Specific Time: e.g. "8pm", "8:30pm", "20:00", "14h30", "at 9am"
    if (!startTime) {
      // 12-hour: e.g. "8pm", "8:30 am", "at 9pm"
      const time12Regex = /\b(?:at|lúc)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
      const match12 = time12Regex.exec(working);
      if (match12) {
        let hour = parseInt(match12[1], 10);
        const minute = match12[2] ? parseInt(match12[2], 10) : 0;
        const meridiem = match12[3].toLowerCase();
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;

        if (hour >= 0 && hour <= 23) {
          startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          detectedSignals++;
          isScheduleRequested = true;
          working = working.replace(match12[0], ' ');
        }
      } else {
        // 24-hour: e.g. "20:00", "at 14:30"
        const time24Regex = /\b(?:at|lúc)?\s*(\d{1,2}):(\d{2})\b/i;
        const match24 = time24Regex.exec(working);
        if (match24) {
          const hour = parseInt(match24[1], 10);
          const minute = parseInt(match24[2], 10);
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            detectedSignals++;
            isScheduleRequested = true;
            working = working.replace(match24[0], ' ');
          }
        } else {
          // Vietnamese "14h30" or "14h" or "lúc 8h"
          const timeHRegex = /\b(?:at|lúc)?\s*(\d{1,2})h(\d{2})?\b/i;
          const matchH = timeHRegex.exec(working);
          if (matchH) {
            const hour = parseInt(matchH[1], 10);
            const minute = matchH[2] ? parseInt(matchH[2], 10) : 0;
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
              startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              detectedSignals++;
              isScheduleRequested = true;
              working = working.replace(matchH[0], ' ');
            }
          }
        }
      }
    }

    // 5. Detect Duration signals: e.g. "trong 2 tiếng", "2h", "120m", "1h30m", "45 phút", "2 hours"
    if (!durationMinutes) {
      // "1h30m" or "1h30"
      const compMatch = /\b(\d{1,2})h(\d{1,2})m?\b/i.exec(working);
      if (compMatch) {
        durationMinutes = parseInt(compMatch[1], 10) * 60 + parseInt(compMatch[2], 10);
        detectedSignals++;
        working = working.replace(compMatch[0], ' ');
      } else {
        // "2 tiếng", "2 giờ", "2 hours", "2 hrs", "2h"
        const hrMatch = /\b(?:trong\s+)?(\d+(?:\.\d+)?)\s*(?:tiếng|giờ|hours|hour|hrs|hr|h)\b/i.exec(working);
        if (hrMatch) {
          durationMinutes = Math.round(parseFloat(hrMatch[1]) * 60);
          detectedSignals++;
          working = working.replace(hrMatch[0], ' ');
        } else {
          // "120 phút", "120m", "45 mins", "45 minutes"
          const minMatch = /\b(?:trong\s+)?(\d+)\s*(?:phút|minutes|minute|mins|min|m)\b/i.exec(working);
          if (minMatch) {
            durationMinutes = parseInt(minMatch[1], 10);
            detectedSignals++;
            working = working.replace(minMatch[0], ' ');
          }
        }
      }
    }

    // If explicit start time exists and duration exists, calculate endTime if missing
    if (startTime && durationMinutes && !endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const totalM = sh * 60 + sm + durationMinutes;
      const eh = Math.floor(totalM / 60) % 24;
      const em = totalM % 60;
      endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    } else if (startTime && !durationMinutes) {
      // Default duration is 60m if start time is specified
      durationMinutes = 60;
      const [sh, sm] = startTime.split(':').map(Number);
      const totalM = sh * 60 + sm + 60;
      const eh = Math.floor(totalM / 60) % 24;
      const em = totalM % 60;
      endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    }

    // Clean remaining string to produce clean title
    let title = working
      .replace(/\s+(trong|lúc|vào|tại|at|on|for)\s*$/gi, '')
      .replace(/^\s*(làm|học|review|ôn tập|lên lịch|schedule|create|add)\s+/gi, (match) => {
        // Keep meaningful action verbs like "Làm Database Project" or "Review bài"
        return match;
      })
      .replace(/\s+/g, ' ')
      .trim();

    // If title was stripped of everything, revert to trimmed raw input
    if (!title) {
      title = input;
    }

    // Confidence scoring:
    // Pure title only: confidence 0.5 (valid ambiguous input, no invented data)
    // 1-2 signals detected: confidence 0.8
    // 3+ signals detected: confidence 0.95
    let confidence = 0.5;
    if (detectedSignals >= 3) confidence = 0.95;
    else if (detectedSignals >= 1) confidence = 0.8;

    // Determine type:
    // If specific time or date+time is requested -> 'scheduleTask' or 'createEvent'
    // If only title or title+duration or title+date -> 'createTask'
    let type: 'createTask' | 'createEvent' | 'scheduleTask' = 'createTask';
    if (startTime && dateStr) {
      type = 'createEvent';
      isScheduleRequested = true;
    } else if (isScheduleRequested || (startTime && !dateStr)) {
      type = 'scheduleTask';
    }

    return {
      type,
      title,
      date: dateStr,
      startTime,
      endTime,
      durationMinutes,
      priority,
      confidence,
      rawInput,
      timeOfDay,
      isScheduleRequested,
    };
  }
}

export const naturalLanguageParser = new DeterministicNaturalLanguageParser();
