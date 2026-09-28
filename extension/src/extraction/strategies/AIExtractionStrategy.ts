import type { ScheduleExtractionStrategy, ExtractionContext, ExtractionResult } from './ExtractionStrategy';

/**
 * AI/LLM Schedule Extraction Strategy (Reserved Architectural Scaffold).
 *
 * Privacy & Security Invariant:
 * 1. AI extraction is strictly disabled by default.
 * 2. It will only be activated when no verified deterministic rule matches AND the user explicitly opts in.
 * 3. Never transmits credentials, cookies, headers, or entire raw HTML.
 * 4. Extracts only visible table/text DOM subtrees sanitized of personal identifying information.
 */
export class AIExtractionStrategy implements ScheduleExtractionStrategy {
  readonly name = 'AIExtractionStrategy';

  canHandle(context: ExtractionContext): boolean {
    // Phase 1: Only activated when explicitly enabled via options and user consent
    return false;
  }

  async extract(context: ExtractionContext): Promise<ExtractionResult> {
    throw new Error(
      'AI Extraction is not active in Phase 1. SmartSchedule uses deterministic, privacy-preserving RuleBasedExtractionStrategy.'
    );
  }
}
