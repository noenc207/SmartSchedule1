import type { UniversalScheduleItem, ExtractionDiagnostics } from '../../shared/types';
import type { ExtractionRule } from '../../rules/types';

export interface ExtractionContext {
  document: Document;
  url: string;
  rule?: ExtractionRule;
}

export interface ExtractionResult {
  items: UniversalScheduleItem[];
  diagnostics: ExtractionDiagnostics;
}

/**
 * Universal Strategy Pattern interface for schedule extraction engines.
 */
export interface ScheduleExtractionStrategy {
  readonly name: string;
  canHandle(context: ExtractionContext): boolean;
  extract(context: ExtractionContext): Promise<ExtractionResult>;
}
