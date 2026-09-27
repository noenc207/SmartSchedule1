import { useState, useEffect } from 'react';

/**
 * Pure helper to determine if a width is within mobile breakpoint.
 */
export function isMobileViewport(width: number, breakpoint: number = 768): boolean {
  return width <= breakpoint;
}

/**
 * Hook to detect whether current viewport width is within mobile breakpoint.
 * Defaults to 768px (standard tablet/phone breakpoint).
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isMobileViewport(window.innerWidth, breakpoint);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    } else {
      // fallback for older webview engines
      mql.addListener(update);
      return () => mql.removeListener(update);
    }
  }, [breakpoint]);

  return isMobile;
}
