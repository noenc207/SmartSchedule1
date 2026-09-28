/**
 * Universal Schedule Item - Canonical representation of an extracted class/session.
 * Compatible with SmartSchedule Event model.
 */
export interface UniversalScheduleItem {
  title: string;
  courseCode?: string;
  startTime: string; // ISO 8601 UTC/offset timestamp e.g. "2026-09-28T07:30:00+07:00"
  endTime: string;   // ISO 8601 UTC/offset timestamp e.g. "2026-09-28T09:00:00+07:00"
  location?: string; // Classroom / Hall e.g. "BE-301", "P.402"
  teacher?: string;  // Lecturer name / code e.g. "HuongLT"
  group?: string;    // Class code e.g. "SE1701", "IA1802"
  source: string;    // "FAP", "EDUSOFT", "GENERIC", "OTHER"
  externalId?: string; // Deterministic fingerprint for idempotent re-import
  status?: 'SCHEDULED' | 'CONFIRMED' | 'ATTENDED';
  description?: string;
  slotNumber?: number; // e.g. Slot 1, 2, 3
}

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  itemIndex?: number;
  itemTitle?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  items: UniversalScheduleItem[];
  validCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ExtractionDiagnostics {
  provider: string;
  ruleId: string;
  ruleVersion: number;
  url: string;
  timestamp: string;
  rowsDetected: number;
  rowsAccepted: number;
  rowsRejected: number;
  duplicatesRemoved: number;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

export interface ScheduleImportSummary {
  scheduleId: string;
  source: string;
  totalDetected: number;
  importedCount: number;
  duplicateCount: number;
  conflictCount: number;
  createdAt: string;
  conflictedItems?: UniversalScheduleItem[];
}
