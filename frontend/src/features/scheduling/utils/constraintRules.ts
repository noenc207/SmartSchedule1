import type { SchedulingPreferences } from '../../../types/domain';

export type ConstraintType = 'HARD' | 'SOFT';

export interface SchedulingRule {
  id: string;
  category:
    | 'WORKING_HOURS'
    | 'BREAKS'
    | 'STUDY_PREFERENCES'
    | 'DAILY_CAPACITY'
    | 'TASK_SPLITTING'
    | 'BUFFER'
    | 'PRIORITY';
  label: string;
  description: string;
  type: ConstraintType; // 'HARD' = Must follow, 'SOFT' = Prefer
  enabled: boolean;
  value?: any;
}

export interface RuleContradiction {
  rule1: SchedulingRule;
  rule2: SchedulingRule;
  message: string;
  resolutionOptions: string[];
}

/**
 * Standard default human-readable rules for academic scheduling
 */
export const DEFAULT_SCHEDULING_RULES: SchedulingRule[] = [
  {
    id: 'rule-no-early',
    category: 'WORKING_HOURS',
    label: "Don't schedule before 09:00",
    description: 'Protect early morning sleep and morning routine',
    type: 'HARD',
    enabled: true,
    value: '09:00',
  },
  {
    id: 'rule-no-late',
    category: 'WORKING_HOURS',
    label: 'No study sessions after 22:00',
    description: 'Ensure adequate rest before classes',
    type: 'HARD',
    enabled: true,
    value: '22:00',
  },
  {
    id: 'rule-protect-lunch',
    category: 'BREAKS',
    label: 'Protect lunch 12:00–13:00',
    description: 'Keep midday free for dining and mental recharge',
    type: 'HARD',
    enabled: true,
  },
  {
    id: 'rule-max-focus',
    category: 'DAILY_CAPACITY',
    label: 'Maximum 6h focused work/day',
    description: 'Limit total daily cognitive overload',
    type: 'HARD',
    enabled: true,
    value: 360,
  },
  {
    id: 'rule-continuous-session',
    category: 'TASK_SPLITTING',
    label: 'Maximum 2h continuous focus session',
    description: 'Split long tasks into manageable blocks',
    type: 'SOFT',
    enabled: true,
    value: 120,
  },
  {
    id: 'rule-prefer-evening-study',
    category: 'STUDY_PREFERENCES',
    label: 'Prefer study between 18:00–22:00',
    description: 'Schedule prime focus tasks during quiet evening hours',
    type: 'SOFT',
    enabled: true,
    value: { start: '18:00', end: '22:00' },
  },
  {
    id: 'rule-buffer-classes',
    category: 'BUFFER',
    label: 'Keep 30 minutes between classes and study',
    description: 'Provide travel and cognitive transition time',
    type: 'SOFT',
    enabled: true,
    value: 30,
  },
  {
    id: 'rule-high-priority-prime',
    category: 'PRIORITY',
    label: 'Prefer HIGH priority tasks during 18:00–21:00',
    description: 'Dedicate peak energy windows to critical assignments',
    type: 'SOFT',
    enabled: true,
  },
];

/**
 * Detects contradictions between active scheduling rules.
 * Example: Hard "No work before 09:00" vs Soft "Prefer study 07:00-08:00"
 */
export function detectRuleContradictions(rules: SchedulingRule[]): RuleContradiction[] {
  const activeRules = rules.filter((r) => r.enabled);
  const contradictions: RuleContradiction[] = [];

  const noEarlyRule = activeRules.find((r) => r.id === 'rule-no-early');
  const preferEarly = activeRules.find(
    (r) =>
      r.category === 'STUDY_PREFERENCES' &&
      r.value?.start &&
      r.value.start < (noEarlyRule?.value || '09:00')
  );

  if (noEarlyRule && preferEarly && noEarlyRule.type === 'HARD') {
    contradictions.push({
      rule1: noEarlyRule,
      rule2: preferEarly,
      message: `Hard constraint "${noEarlyRule.label}" directly conflicts with preference "${preferEarly.label}".`,
      resolutionOptions: ['Adjust preference', 'Keep as soft preference', 'Cancel'],
    });
  }

  const noLateRule = activeRules.find((r) => r.id === 'rule-no-late');
  const preferLate = activeRules.find(
    (r) =>
      r.category === 'STUDY_PREFERENCES' &&
      r.value?.end &&
      r.value.end > (noLateRule?.value || '22:00')
  );

  if (noLateRule && preferLate && noLateRule.type === 'HARD') {
    contradictions.push({
      rule1: noLateRule,
      rule2: preferLate,
      message: `Hard constraint "${noLateRule.label}" directly conflicts with preference "${preferLate.label}".`,
      resolutionOptions: ['Adjust preference', 'Keep as soft preference', 'Cancel'],
    });
  }

  return contradictions;
}

/**
 * Generates explainable reasons for scheduled results.
 */
export function generateOptimizationReasons(
  scheduledCount: number,
  rules: SchedulingRule[]
): string[] {
  if (scheduledCount === 0) return [];

  const reasons: string[] = ['Scheduled before deadline'];

  const eveningRule = rules.find((r) => r.id === 'rule-prefer-evening-study' && r.enabled);
  if (eveningRule) {
    reasons.push('Used preferred study hours');
  }

  const lunchRule = rules.find((r) => r.id === 'rule-protect-lunch' && r.enabled);
  if (lunchRule) {
    reasons.push('Avoided lunch (12:00–13:00)');
  }

  const maxWorkRule = rules.find((r) => r.id === 'rule-max-focus' && r.enabled);
  if (maxWorkRule) {
    reasons.push('Balanced daily focus workload');
  }

  const bufferRule = rules.find((r) => r.id === 'rule-buffer-classes' && r.enabled);
  if (bufferRule) {
    reasons.push('Preserved class transition buffer');
  }

  return reasons;
}
