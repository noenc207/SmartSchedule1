import type { UniversalScheduleItem } from './types';

/**
 * Computes a fast, deterministic string hash (FNV-1a 64-bit style or 32-bit hex).
 */
export function fastHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return hex.padStart(16, '0');
}

/**
 * Generates a deterministic fingerprint for an item based on immutable schedule coordinates.
 * Normalized fields: source, courseCode, title, startTime, endTime, location.
 */
export function generateEventFingerprint(item: Partial<UniversalScheduleItem>): string {
  const parts = [
    (item.source || 'UNKNOWN').trim().toUpperCase(),
    (item.courseCode || '').trim().toUpperCase(),
    (item.title || '').trim().toLowerCase(),
    item.startTime || '',
    item.endTime || '',
    (item.location || '').trim().toLowerCase(),
    (item.group || '').trim().toUpperCase(),
  ];

  const canonical = parts.join('::');
  const hash = fastHash(canonical);
  const prefix = (item.source || 'EXT').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}_${hash}`;
}
