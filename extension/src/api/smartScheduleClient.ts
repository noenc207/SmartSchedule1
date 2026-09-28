import type { UniversalScheduleItem, ScheduleImportSummary } from '../shared/types';
import { DEFAULT_SMARTSCHEDULE_API_URL } from '../shared/constants';

export interface ScheduleOption {
  id: string;
  name: string;
}

export interface ImportPreviewResponse {
  total: number;
  valid: number;
  conflicts: number;
  duplicates: number;
  items: UniversalScheduleItem[];
  conflictedItems?: Array<{
    item: UniversalScheduleItem;
    conflictingEventTitle: string;
    conflictingStartsAt: string;
    conflictingEndsAt: string;
  }>;
}

export interface ImportSubmitRequest {
  source: string;
  ruleId?: string;
  ruleVersion?: number;
  items: UniversalScheduleItem[];
  skipConflicts?: boolean;
}

export class SmartScheduleClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = DEFAULT_SMARTSCHEDULE_API_URL, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Retrieves user's schedules to select target schedule.
   */
  async getSchedules(): Promise<ScheduleOption[]> {
    const res = await fetch(`${this.baseUrl}/schedules`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      throw new Error(`Failed to load schedules: HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
      : [];
  }

  /**
   * Previews schedule import, calculating conflicts against active schedule events.
   */
  async previewPortalImport(
    scheduleId: string,
    items: UniversalScheduleItem[]
  ): Promise<ImportPreviewResponse> {
    const res = await fetch(`${this.baseUrl}/schedules/${scheduleId}/import/portal/preview`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      throw new Error(`Preview failed: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Commits the universal schedule items into the SmartSchedule calendar.
   */
  async submitPortalImport(
    scheduleId: string,
    payload: ImportSubmitRequest
  ): Promise<ScheduleImportSummary> {
    const res = await fetch(`${this.baseUrl}/schedules/${scheduleId}/import/portal`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const errBody = await res.text();
      throw new Error(`Import failed (${res.status}): ${errBody || 'Server error'}`);
    }

    return res.json();
  }
}
