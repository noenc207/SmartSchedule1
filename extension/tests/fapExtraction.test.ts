import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { RuleBasedExtractionStrategy } from '../src/extraction/strategies/RuleBasedExtractionStrategy';
import { FAP_DEFAULT_RULE } from '../src/rules/defaultRules';
import type { UniversalScheduleItem } from '../src/shared/types';

describe('FAP Timetable Extraction — Fixture Test', () => {
  const htmlPath = resolve(__dirname, 'fixtures/fap/schedule.html');
  const expectedPath = resolve(__dirname, 'fixtures/fap/expected.json');

  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const expectedItems: UniversalScheduleItem[] = JSON.parse(readFileSync(expectedPath, 'utf-8'));

  it('extracts and normalizes FAP schedule table accurately', async () => {
    const dom = new JSDOM(htmlContent, { url: 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx' });
    const strategy = new RuleBasedExtractionStrategy();

    const result = await strategy.extract({
      document: dom.window.document,
      url: 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx',
      rule: FAP_DEFAULT_RULE,
    });

    expect(result.items.length).toBe(expectedItems.length);
    expect(result.diagnostics.rowsAccepted).toBe(expectedItems.length);

    expectedItems.forEach((expected, idx) => {
      const actual = result.items[idx];
      expect(actual.title).toBe(expected.title);
      expect(actual.courseCode).toBe(expected.courseCode);
      expect(actual.startTime).toBe(expected.startTime);
      expect(actual.endTime).toBe(expected.endTime);
      expect(actual.location).toBe(expected.location);
      expect(actual.teacher).toBe(expected.teacher);
      expect(actual.group).toBe(expected.group);
      expect(actual.source).toBe('FAP');
      expect(actual.externalId).toBeDefined();
    });
  });
});
