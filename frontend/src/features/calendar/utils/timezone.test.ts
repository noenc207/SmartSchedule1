import { describe, expect, it } from 'vitest';
import { formatForInput, localInputToInstant } from './timezone';

describe('schedule timezone conversion', () => {
  it('round trips a named timezone without using browser local time', () => {
    const instant = localInputToInstant('2026-09-23T08:00', 'Asia/Ho_Chi_Minh');
    expect(instant).toBe('2026-09-23T01:00:00.000Z');
    expect(formatForInput(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-09-23T08:00');
  });

  it('handles a daylight-saving timezone', () => {
    const instant = localInputToInstant('2026-07-01T09:00', 'America/New_York');
    expect(formatForInput(instant, 'America/New_York')).toBe('2026-07-01T09:00');
  });
});
