import type { UniversalScheduleItem } from '../shared/types';
import { generateEventFingerprint } from '../shared/fingerprint';

export interface DeduplicationResult {
  unique: UniversalScheduleItem[];
  duplicates: UniversalScheduleItem[];
  duplicateCount: number;
}

/**
 * Deduplicates schedule items based on their deterministic externalId / fingerprint.
 */
export function deduplicateScheduleItems(items: UniversalScheduleItem[]): DeduplicationResult {
  const seen = new Set<string>();
  const unique: UniversalScheduleItem[] = [];
  const duplicates: UniversalScheduleItem[] = [];

  for (const item of items) {
    const fingerprint = item.externalId || generateEventFingerprint(item);
    const enriched = item.externalId ? item : { ...item, externalId: fingerprint };

    if (seen.has(fingerprint)) {
      duplicates.push(enriched);
    } else {
      seen.add(fingerprint);
      unique.push(enriched);
    }
  }

  return {
    unique,
    duplicates,
    duplicateCount: duplicates.length,
  };
}
