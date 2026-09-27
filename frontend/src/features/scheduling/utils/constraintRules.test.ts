import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCHEDULING_RULES,
  detectRuleContradictions,
  generateOptimizationReasons,
  type SchedulingRule,
} from './constraintRules';

describe('Constraint Rules & Contradiction Detection', () => {
  it('identifies no contradictions in the default scheduling rule set', () => {
    const contradictions = detectRuleContradictions(DEFAULT_SCHEDULING_RULES);
    expect(contradictions.length).toBe(0);
  });

  it('detects contradiction when hard "No work before 09:00" conflicts with soft "Prefer study 07:00-08:00"', () => {
    const conflictingRules: SchedulingRule[] = [
      {
        id: 'rule-no-early',
        category: 'WORKING_HOURS',
        label: "Don't schedule before 09:00",
        description: 'Hard constraint',
        type: 'HARD',
        enabled: true,
        value: '09:00',
      },
      {
        id: 'rule-prefer-early-study',
        category: 'STUDY_PREFERENCES',
        label: 'Prefer study between 07:00–08:00',
        description: 'Early bird study preference',
        type: 'SOFT',
        enabled: true,
        value: { start: '07:00', end: '08:00' },
      },
    ];

    const contradictions = detectRuleContradictions(conflictingRules);
    expect(contradictions.length).toBe(1);
    expect(contradictions[0].message).toContain('directly conflicts');
    expect(contradictions[0].resolutionOptions).toContain('Keep as soft preference');
    expect(contradictions[0].resolutionOptions).toContain('Adjust preference');
  });

  it('does NOT trigger contradiction if conflicting rule is disabled', () => {
    const rulesWithDisabled: SchedulingRule[] = [
      {
        id: 'rule-no-early',
        category: 'WORKING_HOURS',
        label: "Don't schedule before 09:00",
        description: 'Hard constraint',
        type: 'HARD',
        enabled: true,
        value: '09:00',
      },
      {
        id: 'rule-prefer-early-study',
        category: 'STUDY_PREFERENCES',
        label: 'Prefer study between 07:00–08:00',
        description: 'Early bird study preference',
        type: 'SOFT',
        enabled: false, // Disabled!
        value: { start: '07:00', end: '08:00' },
      },
    ];

    const contradictions = detectRuleContradictions(rulesWithDisabled);
    expect(contradictions.length).toBe(0);
  });

  it('generates concise explainable reasons based on active rules', () => {
    const reasons = generateOptimizationReasons(5, DEFAULT_SCHEDULING_RULES);
    expect(reasons).toContain('Scheduled before deadline');
    expect(reasons).toContain('Used preferred study hours');
    expect(reasons).toContain('Avoided lunch (12:00–13:00)');
    expect(reasons).toContain('Balanced daily focus workload');
  });

  it('returns empty reasons when scheduled count is 0', () => {
    const reasons = generateOptimizationReasons(0, DEFAULT_SCHEDULING_RULES);
    expect(reasons.length).toBe(0);
  });
});
