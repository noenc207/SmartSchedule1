/**
 * RFC 5545 iCalendar (.ics) Import & Export Engine
 * Full compliance with standard calendar formats for Google Calendar, Apple Calendar, Outlook, and CalDAV.
 */

import apiClient from './apiClient';
import type { EventItem } from '../types/domain';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Formats a Date or ISO string into RFC 5545 iCalendar UTC date-time string (YYYYMMDDTHHMMSSZ).
 */
export function formatIcsDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getUTCFullYear()}${pad(fallback.getUTCMonth() + 1)}${pad(fallback.getUTCDate())}T000000Z`;
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Parses an iCalendar date-time string into standard ISO format.
 */
export function parseIcsDate(icsDateStr: string): string {
  const clean = icsDateStr.trim().replace(/^VALUE=DATE-TIME:/, '').replace(/^VALUE=DATE:/, '');
  // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) {
    return new Date().toISOString();
  }

  const [_, year, month, day, hour = '00', min = '00', sec = '00', isUtc] = match;
  if (isUtc) {
    return new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec)).toISOString();
  }
  return new Date(+year, +month - 1, +day, +hour, +min, +sec).toISOString();
}

/**
 * Escapes special characters according to RFC 5545 specifications.
 */
function escapeIcsText(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Unescapes RFC 5545 text.
 */
function unescapeIcsText(str: string): string {
  return (str || '')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Exports SmartSchedule events into standard RFC 5545 .ics text string.
 */
export function exportEventsToIcs(events: EventItem[], calendarName = 'SmartSchedule Academic Calendar'): string {
  const nowUtc = formatIcsDate(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartSchedule Multi-Campus Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id || crypto.randomUUID()}@smartschedul.ai`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART:${formatIcsDate(ev.startsAt)}`);
    lines.push(`DTEND:${formatIcsDate(ev.endsAt)}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }

    if (ev.location) {
      lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    }

    // Embed GEO Lat/Lng coordinates if available
    if (ev.locationRef?.latitude && ev.locationRef?.longitude) {
      lines.push(`GEO:${ev.locationRef.latitude.toFixed(6)};${ev.locationRef.longitude.toFixed(6)}`);
    }

    if (ev.priority) {
      const priorityNum = ev.priority === 'HIGH' ? 1 : ev.priority === 'LOW' ? 9 : 5;
      lines.push(`PRIORITY:${priorityNum}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Parses raw .ics file text content into structured SmartSchedule events.
 */
export function parseIcsToEvents(icsContent: string, scheduleId: string): Partial<EventItem>[] {
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\r|\n/);

  const parsedEvents: Partial<EventItem>[] = [];
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
    } else if (trimmed === 'END:VEVENT') {
      if (inEvent && current.SUMMARY && current.DTSTART) {
        const startsAt = parseIcsDate(current.DTSTART);
        const endsAt = current.DTEND
          ? parseIcsDate(current.DTEND)
          : new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

        let lat: number | undefined;
        let lng: number | undefined;
        if (current.GEO) {
          const [geoLat, geoLng] = current.GEO.split(';').map(Number);
          if (!isNaN(geoLat) && !isNaN(geoLng)) {
            lat = geoLat;
            lng = geoLng;
          }
        }

        parsedEvents.push({
          id: current.UID ? `ics-${current.UID.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}` : undefined,
          scheduleId,
          title: unescapeIcsText(current.SUMMARY),
          description: current.DESCRIPTION ? unescapeIcsText(current.DESCRIPTION) : null,
          location: current.LOCATION ? unescapeIcsText(current.LOCATION) : null,
          locationRef:
            lat && lng
              ? {
                  id: `loc-geo-${lat}-${lng}`,
                  name: current.LOCATION ? unescapeIcsText(current.LOCATION) : 'Vị trí đã ghim',
                  type: 'CUSTOM',
                  latitude: lat,
                  longitude: lng,
                }
              : undefined,
          startsAt,
          endsAt,
          priority: current.PRIORITY === '1' ? 'HIGH' : 'MEDIUM',
          fixed: true,
          locked: false,
        });
      }
      inEvent = false;
    } else if (inEvent) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = trimmed.slice(0, colonIdx).split(';')[0].toUpperCase();
        const valuePart = trimmed.slice(colonIdx + 1);
        current[keyPart] = valuePart;
      }
    }
  }

  return parsedEvents;
}

export type IcsImportEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string | null;
  location?: string | null;
};

export type IcsImportPreview = {
  total: number;
  valid: number;
  invalid: number;
  conflicts: number;
  events: IcsImportEvent[];
  errors: string[];
};

export const icsApi = {
  async exportIcs(scheduleId: string, from?: string, to?: string): Promise<string> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get<string>(`/schedules/${scheduleId}/export.ics`, {
      params,
      responseType: 'text',
    });
    return res.data;
  },

  async previewImport(scheduleId: string, file: File): Promise<IcsImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<IcsImportPreview>(`/schedules/${scheduleId}/import.ics`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async confirmImport(scheduleId: string, events: IcsImportEvent[], skipConflicts = true): Promise<number> {
    const res = await apiClient.post<number>(`/schedules/${scheduleId}/import.ics/confirm`, {
      events,
      skipConflicts,
    });
    return res.data;
  },
};

/**
 * Triggers client-side download of a .ics calendar file.
 */
export function triggerIcsDownload(filename: string, icsString: string): void {
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
