import { describe, it, expect } from 'vitest';
import { isDomainMatch, isPathMatch, findBestMatchingRule } from '../src/rules/domainMatcher';
import { FAP_DEFAULT_RULE, EDUSOFT_DEFAULT_RULE } from '../src/rules/defaultRules';

describe('Domain Matcher', () => {
  it('matches exact domain correctly', () => {
    expect(isDomainMatch('fap.fpt.edu.vn', 'fap.fpt.edu.vn')).toBe(true);
    expect(isDomainMatch('fap.fpt.edu.vn', 'other.edu.vn')).toBe(false);
  });

  it('matches wildcard domains correctly', () => {
    expect(isDomainMatch('*.fpt.edu.vn', 'fap.fpt.edu.vn')).toBe(true);
    expect(isDomainMatch('*.fpt.edu.vn', 'hcm.fpt.edu.vn')).toBe(true);
    expect(isDomainMatch('*.fpt.edu.vn', 'fpt.edu.vn')).toBe(true);
    expect(isDomainMatch('*.fpt.edu.vn', 'vnu.edu.vn')).toBe(false);
  });

  it('matches path patterns correctly', () => {
    expect(isPathMatch('Schedule', '/Report/ScheduleOfWeek.aspx')).toBe(true);
    expect(isPathMatch('ThoiKhoaBieu', '/SinhVien/ThoiKhoaBieu.aspx')).toBe(true);
    expect(isPathMatch('Schedule', '/News/Announcements')).toBe(false);
  });

  it('finds best matching rule according to priority and domain specificity', () => {
    const rules = [EDUSOFT_DEFAULT_RULE, FAP_DEFAULT_RULE];
    const matchedFap = findBestMatchingRule(rules, 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx');
    expect(matchedFap).toBeDefined();
    expect(matchedFap?.id).toBe('fpt-fap');

    const matchedEdu = findBestMatchingRule(rules, 'https://edusoftweb.hcmiu.edu.vn/ThoiKhoaBieu.aspx');
    expect(matchedEdu).toBeDefined();
    expect(matchedEdu?.id).toBe('edusoft-portal');

    const noMatch = findBestMatchingRule(rules, 'https://google.com/search');
    expect(noMatch).toBeNull();
  });
});
