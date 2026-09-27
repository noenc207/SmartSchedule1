import { describe, it, expect } from 'vitest';
import { isMobileViewport } from './useIsMobile';

describe('Responsive Mobile Viewport Utilities', () => {
  it('correctly classifies standard mobile widths (320px, 375px, 414px, 480px, 768px)', () => {
    expect(isMobileViewport(320)).toBe(true);
    expect(isMobileViewport(375)).toBe(true); // iPhone SE / Mini
    expect(isMobileViewport(390)).toBe(true); // iPhone 12/13/14
    expect(isMobileViewport(414)).toBe(true); // iPhone Plus / Max
    expect(isMobileViewport(480)).toBe(true); // Small tablet / large phone
    expect(isMobileViewport(768)).toBe(true); // Standard tablet breakpoint
  });

  it('correctly classifies desktop and wide screens (> 768px)', () => {
    expect(isMobileViewport(769)).toBe(false);
    expect(isMobileViewport(1024)).toBe(false); // iPad Pro / Laptop
    expect(isMobileViewport(1280)).toBe(false); // Desktop standard
    expect(isMobileViewport(1440)).toBe(false); // Full HD
    expect(isMobileViewport(1920)).toBe(false); // Ultrawide
  });

  it('respects custom breakpoints if specified', () => {
    expect(isMobileViewport(600, 600)).toBe(true);
    expect(isMobileViewport(601, 600)).toBe(false);
    expect(isMobileViewport(1024, 1024)).toBe(true);
    expect(isMobileViewport(1025, 1024)).toBe(false);
  });
});
