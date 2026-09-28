import type { ExtractionRule } from '../rules/types';
import { DEFAULT_RULES } from '../rules/defaultRules';
import { verifyRuleChecksum } from '../rules/checksum';
import { STORAGE_KEYS } from '../shared/constants';

interface StorageRulePayload {
  rules: ExtractionRule[];
  fetchedAt: string;
  checksum: string;
}

/**
 * Universal storage wrapper supporting both chrome.storage.local and browser localStorage.
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * Loads rules from cache or falls back to default verified offline rules.
 */
export async function getActiveExtractionRules(): Promise<ExtractionRule[]> {
  try {
    const cached = await getStorageItem<StorageRulePayload>(STORAGE_KEYS.CACHED_RULES);
    if (cached && Array.isArray(cached.rules) && cached.rules.length > 0) {
      // Validate checksums
      const validRules = cached.rules.filter((r) => verifyRuleChecksum(r));
      if (validRules.length > 0) {
        return validRules;
      }
    }
  } catch (err) {
    console.warn('[SmartSchedule Ext] Failed loading cached rules, using defaults:', err);
  }
  return DEFAULT_RULES;
}

/**
 * Saves refreshed rules into local cache.
 */
export async function cacheExtractionRules(rules: ExtractionRule[]): Promise<void> {
  const payload: StorageRulePayload = {
    rules,
    fetchedAt: new Date().toISOString(),
    checksum: String(rules.length),
  };
  await setStorageItem(STORAGE_KEYS.CACHED_RULES, payload);
}

/**
 * Refreshes extraction rules from SmartSchedule backend API.
 */
export async function refreshRulesFromRemote(baseUrl: string): Promise<ExtractionRule[]> {
  try {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/import/rules`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch rules: HTTP ${res.status}`);
    }

    const data: ExtractionRule[] = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const verified = data.filter((r) => verifyRuleChecksum(r));
      if (verified.length > 0) {
        await cacheExtractionRules(verified);
        return verified;
      }
    }
  } catch (err) {
    console.warn('[SmartSchedule Ext] Remote rule fetch failed, using active cache:', err);
  }
  return getActiveExtractionRules();
}
