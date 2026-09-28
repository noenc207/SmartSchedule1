import { DEFAULT_RULES } from '../rules/defaultRules';
import { cacheExtractionRules, refreshRulesFromRemote } from '../storage/ruleCache';
import { DEFAULT_SMARTSCHEDULE_API_URL } from '../shared/constants';

console.log('[SmartSchedule] Service worker background script loaded.');

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SmartSchedule] Extension installed/updated, reason:', details.reason);
  // Initialize default verified rules
  await cacheExtractionRules(DEFAULT_RULES);
  // Attempt background refresh if backend is reachable
  refreshRulesFromRemote(DEFAULT_SMARTSCHEDULE_API_URL).catch(() => {
    // Ignore offline errors during installation
  });
});

chrome.runtime.onStartup.addListener(async () => {
  refreshRulesFromRemote(DEFAULT_SMARTSCHEDULE_API_URL).catch(() => {});
});
