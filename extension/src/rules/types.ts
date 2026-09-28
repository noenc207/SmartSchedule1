export type ExtractionMode = 'table-rows' | 'weekly-grid' | 'card-list';

export interface FieldExtractionRule {
  selector?: string;           // CSS selector relative to row/cell
  source?: 'text' | 'attribute' | 'value' | 'html';
  attributeName?: string;      // If source === 'attribute' (e.g. "title", "data-date")
  regex?: string;              // Optional regex to extract capture group e.g. "Slot\\s*(\\d+)"
  regexGroup?: number;         // 1-indexed group number (default 1)
  replace?: [string, string];  // Simple string or regex replacement
  trim?: boolean;              // Defaults to true
  optional?: boolean;          // If true, row is not rejected if missing
  defaultValue?: string;       // Default value when missing
  colIndex?: number;           // For table-rows: nth td index (0-indexed)
}

export interface GridDateHeaderRule {
  selector: string;            // Selector for day/date columns (e.g. "table thead th:not(:first-child)")
  regex?: string;              // Regex to extract date e.g. "(\\d{2}/\\d{2}/\\d{4})"
  format?: string;             // Date format e.g. "DD/MM/YYYY"
}

export interface GridTimeSlotRule {
  selector?: string;           // Selector for slot header (e.g. "table tbody tr th:first-child")
  regex?: string;              // Regex to extract start/end time e.g. "(\\d{2}:\\d{2})\\s*-\\s*(\\d{2}:\\d{2})"
  staticSlots?: Record<number, { startTime: string; endTime: string }>; // Known slot maps
}

export interface ExtractionRule {
  id: string;                  // Unique rule ID e.g. "fpt-fap"
  name: string;                // Human readable name e.g. "FPT University (FAP)"
  provider: string;            // "FAP" | "EDUSOFT" | "GENERIC"
  version: number;             // Rule version e.g. 1
  enabled: boolean;
  priority: number;            // Higher priority evaluated first (e.g. 100)
  domains: string[];           // Domains e.g. ["fap.fpt.edu.vn", "*.fpt.edu.vn"]
  pathMatch?: string;          // Regex or substring to match URL path
  framePolicy?: 'top' | 'all';
  waitFor?: string;            // Selector to wait for before extracting e.g. "table#ctl00_mainContent_divSelect"
  mode: ExtractionMode;        // 'table-rows' | 'weekly-grid' | 'card-list'

  // For table-rows or card-list
  rowSelector?: string;        // Selector matching each schedule item e.g. "table.report tbody tr"
  
  // For weekly-grid
  gridCellSelector?: string;   // Selector matching individual timetable cells e.g. "table tbody td"
  gridDateHeader?: GridDateHeaderRule;
  gridTimeSlot?: GridTimeSlotRule;

  // Field extraction definitions
  fields: {
    title: FieldExtractionRule;
    courseCode?: FieldExtractionRule;
    date?: FieldExtractionRule;
    startTime?: FieldExtractionRule;
    endTime?: FieldExtractionRule;
    timeRange?: FieldExtractionRule; // For fields combining "07:30 - 09:00"
    location?: FieldExtractionRule;  // Classroom / Room
    teacher?: FieldExtractionRule;   // Lecturer
    group?: FieldExtractionRule;     // Class / group e.g. "SE1701"
    slot?: FieldExtractionRule;      // Slot number e.g. "Slot 1"
    status?: FieldExtractionRule;
  };

  dateFormat: string;          // e.g. "DD/MM/YYYY" | "YYYY-MM-DD"
  timeFormat: string;          // e.g. "HH:mm"
  timezone: string;            // e.g. "Asia/Ho_Chi_Minh"
  checksum?: string;           // SHA-256 integrity hash
  updatedAt?: string;
}

export interface RuleMatchResult {
  matched: boolean;
  rule?: ExtractionRule;
  matchScore: number;
  matchedDomain?: string;
  matchedPath?: boolean;
}
