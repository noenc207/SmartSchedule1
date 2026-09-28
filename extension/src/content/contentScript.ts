import { findBestMatchingRule } from '../rules/domainMatcher';
import { getActiveExtractionRules } from '../storage/ruleCache';
import { RuleBasedExtractionStrategy } from '../extraction/strategies/RuleBasedExtractionStrategy';
import { waitForSelector } from '../extraction/mutationObserverHelper';
import { MESSAGE_TYPES } from '../shared/constants';

console.log('[SmartSchedule] Content script initialized on', window.location.href);

const strategy = new RuleBasedExtractionStrategy();

/**
 * Message listener for commands from the extension popup.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.CHECK_PORTAL) {
    (async () => {
      try {
        const rules = await getActiveExtractionRules();
        const rule = findBestMatchingRule(rules, window.location.href);

        if (!rule) {
          sendResponse({ detected: false });
          return;
        }

        // Check if expected table or container exists (or wait briefly if dynamic)
        let elementExists = false;
        if (rule.waitFor) {
          const el = await waitForSelector(rule.waitFor, 1500, document);
          elementExists = !!el;
        } else if (rule.rowSelector) {
          elementExists = document.querySelectorAll(rule.rowSelector).length > 0;
        } else {
          elementExists = true;
        }

        sendResponse({
          detected: true,
          rule,
          hasTable: elementExists,
          url: window.location.href,
        });
      } catch (err) {
        console.error('[SmartSchedule] Portal check error:', err);
        sendResponse({ detected: false, error: String(err) });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.type === MESSAGE_TYPES.EXTRACT_SCHEDULE) {
    (async () => {
      try {
        const rules = await getActiveExtractionRules();
        const rule = message.rule || findBestMatchingRule(rules, window.location.href);

        if (!rule) {
          sendResponse({ success: false, error: 'No matching rule found for this domain.' });
          return;
        }

        // If rule specifies waitFor, wait for DOM readiness
        if (rule.waitFor) {
          await waitForSelector(rule.waitFor, 4000, document);
        }

        const result = await strategy.extract({
          document,
          url: window.location.href,
          rule,
        });

        sendResponse({
          success: true,
          items: result.items,
          diagnostics: result.diagnostics,
        });
      } catch (err) {
        console.error('[SmartSchedule] Schedule extraction error:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // Keep channel open for async response
  }
});
