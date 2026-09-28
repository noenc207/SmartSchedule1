import type { ScheduleExtractionStrategy, ExtractionContext, ExtractionResult } from './ExtractionStrategy';
import { extractRawRowsFromDom } from '../../rules/ruleEngine';
import { normalizeExtractedRows } from '../../normalization/normalizer';
import { deduplicateScheduleItems } from '../../normalization/deduplication';
import { validateScheduleItems } from '../../normalization/validator';
import type { ExtractionDiagnostics } from '../../shared/types';

export class RuleBasedExtractionStrategy implements ScheduleExtractionStrategy {
  readonly name = 'RuleBasedExtractionStrategy';

  canHandle(context: ExtractionContext): boolean {
    return !!context.rule && !!context.document;
  }

  async extract(context: ExtractionContext): Promise<ExtractionResult> {
    const startTime = performance.now();
    const rule = context.rule;

    if (!rule) {
      throw new Error('RuleBasedExtractionStrategy requires a matching ExtractionRule.');
    }

    // 1. Extract raw rows from DOM using rule selectors
    const rawRows = extractRawRowsFromDom(context.document, rule);
    const rowsDetected = rawRows.length;

    // 2. Normalize raw fields into canonical UniversalScheduleItem format
    const normalizedItems = normalizeExtractedRows(rawRows, rule);

    // 3. Deduplicate items on this page
    const dedupeResult = deduplicateScheduleItems(normalizedItems);

    // 4. Validate items
    const validation = validateScheduleItems(dedupeResult.unique);

    const elapsed = Math.round(performance.now() - startTime);

    const diagnostics: ExtractionDiagnostics = {
      provider: rule.provider,
      ruleId: rule.id,
      ruleVersion: rule.version,
      url: context.url,
      timestamp: new Date().toISOString(),
      rowsDetected,
      rowsAccepted: validation.validCount,
      rowsRejected: rowsDetected - validation.validCount,
      duplicatesRemoved: dedupeResult.duplicateCount,
      executionTimeMs: elapsed,
      warnings: validation.issues.filter((i) => i.severity === 'WARNING').map((i) => i.message),
      errors: validation.issues.filter((i) => i.severity === 'ERROR').map((i) => i.message),
    };

    return {
      items: validation.items,
      diagnostics,
    };
  }
}
