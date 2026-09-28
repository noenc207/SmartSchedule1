/**
 * MutationObserver helper for observing dynamic DOM updates on single-page or AJAX portals.
 * Waits for a target selector to appear with debounce and timeout.
 */
export function waitForSelector(
  selector: string,
  timeoutMs = 6000,
  doc: Document = document
): Promise<Element | null> {
  return new Promise((resolve) => {
    // 1. Check immediately
    const immediate = doc.querySelector(selector);
    if (immediate) {
      resolve(immediate);
      return;
    }

    let observer: MutationObserver | null = null;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    // Timeout watchdog
    timer = setTimeout(() => {
      cleanup();
      // Final attempt
      resolve(doc.querySelector(selector));
    }, timeoutMs);

    // MutationObserver with debounce
    let debounceTimer: NodeJS.Timeout | null = null;
    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const found = doc.querySelector(selector);
        if (found) {
          cleanup();
          resolve(found);
        }
      }, 100);
    });

    observer.observe(doc.body || doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  });
}
