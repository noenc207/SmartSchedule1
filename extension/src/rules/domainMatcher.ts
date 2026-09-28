import type { ExtractionRule, RuleMatchResult } from './types';

/**
 * Checks if a hostname matches a domain pattern (supports wildcard e.g. *.fpt.edu.vn).
 */
export function isDomainMatch(pattern: string, hostname: string): boolean {
  const normPattern = pattern.trim().toLowerCase();
  const normHost = hostname.trim().toLowerCase();

  if (normPattern === normHost) {
    return true;
  }

  if (normPattern.startsWith('*.')) {
    const rootDomain = normPattern.slice(2);
    return normHost === rootDomain || normHost.endsWith('.' + rootDomain);
  }

  return false;
}

/**
 * Checks if a URL path matches a rule's path pattern.
 */
export function isPathMatch(pattern: string | undefined, pathname: string): boolean {
  if (!pattern) return true;
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(pathname);
  } catch {
    return pathname.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * Evaluates a rule against a given URL and returns a match score.
 * Higher score = more specific match.
 * Exact domain = 100 pts.
 * Wildcard domain = 50 pts.
 * Path match = +20 pts.
 * Rule priority = +priority.
 */
export function evaluateRuleMatch(rule: ExtractionRule, urlString: string): RuleMatchResult {
  if (!rule.enabled) {
    return { matched: false, matchScore: 0 };
  }

  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname;
    const pathname = parsed.pathname;

    let matchedDomain: string | undefined;
    let domainScore = 0;

    for (const d of rule.domains) {
      if (isDomainMatch(d, hostname)) {
        matchedDomain = d;
        domainScore = d.startsWith('*.') ? 50 : 100;
        break;
      }
    }

    if (!matchedDomain) {
      return { matched: false, matchScore: 0 };
    }

    const matchedPath = isPathMatch(rule.pathMatch, pathname);
    if (rule.pathMatch && !matchedPath) {
      // If rule specifically demands a path and it doesn't match, reject
      return { matched: false, matchScore: 0 };
    }

    const totalScore = domainScore + (matchedPath ? 20 : 0) + (rule.priority || 0);

    return {
      matched: true,
      rule,
      matchScore: totalScore,
      matchedDomain,
      matchedPath,
    };
  } catch {
    return { matched: false, matchScore: 0 };
  }
}

/**
 * Finds the highest-scoring matching rule for a given URL from a list of rules.
 */
export function findBestMatchingRule(rules: ExtractionRule[], urlString: string): ExtractionRule | null {
  const matches = rules
    .map((r) => evaluateRuleMatch(r, urlString))
    .filter((m) => m.matched && m.rule)
    .sort((a, b) => b.matchScore - a.matchScore);

  return matches.length > 0 && matches[0].rule ? matches[0].rule : null;
}
