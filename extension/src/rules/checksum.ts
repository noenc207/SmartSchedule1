import { fastHash } from '../shared/fingerprint';
import type { ExtractionRule } from './types';

/**
 * Computes deterministic checksum for an extraction rule.
 */
export function computeRuleChecksum(rule: Partial<ExtractionRule>): string {
  const content = JSON.stringify({
    id: rule.id,
    version: rule.version,
    domains: rule.domains,
    pathMatch: rule.pathMatch,
    mode: rule.mode,
    rowSelector: rule.rowSelector,
    fields: rule.fields,
    dateFormat: rule.dateFormat,
    timeFormat: rule.timeFormat,
    timezone: rule.timezone,
  });
  return fastHash(content);
}

/**
 * Verifies rule integrity against its checksum.
 */
export function verifyRuleChecksum(rule: ExtractionRule): boolean {
  if (!rule.checksum) return true;
  const calculated = computeRuleChecksum(rule);
  return calculated === rule.checksum;
}
