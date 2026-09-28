import type { ExtractionRule, FieldExtractionRule } from './types';
import type { RawExtractedRow } from '../normalization/normalizer';

/**
 * Extracts a single field from an element based on a FieldExtractionRule.
 */
export function extractFieldFromElement(
  element: Element,
  fieldRule?: FieldExtractionRule
): string | undefined {
  if (!fieldRule) return undefined;

  let targetEl: Element | null = element;
  if (fieldRule.selector && fieldRule.selector !== '.' && fieldRule.selector !== '&') {
    targetEl = element.querySelector(fieldRule.selector);
  }

  if (!targetEl) {
    return fieldRule.defaultValue;
  }

  let value: string | null = null;
  const source = fieldRule.source || 'text';

  if (source === 'attribute' && fieldRule.attributeName) {
    value = targetEl.getAttribute(fieldRule.attributeName);
  } else if (source === 'value' && 'value' in targetEl) {
    value = String((targetEl as HTMLInputElement).value || '');
  } else {
    value = targetEl.textContent;
  }

  if (value === null || value === undefined) {
    return fieldRule.defaultValue;
  }

  // Apply Regex extraction if specified
  if (fieldRule.regex) {
    try {
      const rx = new RegExp(fieldRule.regex, 'i');
      const match = value.match(rx);
      if (match) {
        const groupIdx = fieldRule.regexGroup !== undefined ? fieldRule.regexGroup : 1;
        value = match[groupIdx] !== undefined ? match[groupIdx] : match[0];
      } else if (!fieldRule.optional && !fieldRule.defaultValue) {
        // Did not match regex on required field
        return undefined;
      }
    } catch {
      // Regex parsing error fallback
    }
  }

  // Apply Replace if specified
  if (fieldRule.replace) {
    const [search, replacement] = fieldRule.replace;
    value = value.split(search).join(replacement);
  }

  if (fieldRule.trim !== false) {
    value = value.trim();
  }

  return value || fieldRule.defaultValue;
}

/**
 * Executes a rule on a DOM document or container element to extract raw rows.
 */
export function extractRawRowsFromDom(
  root: Document | Element,
  rule: ExtractionRule
): RawExtractedRow[] {
  const rows: RawExtractedRow[] = [];

  const rowSelector = rule.rowSelector || 'table tbody tr';
  const rowElements = root.querySelectorAll(rowSelector);

  rowElements.forEach((el) => {
    // Avoid header rows that contain only <th>
    if (el.tagName === 'TR' && el.querySelectorAll('th').length > 0 && el.querySelectorAll('td').length === 0) {
      return;
    }

    const title = extractFieldFromElement(el, rule.fields.title);
    const date = extractFieldFromElement(el, rule.fields.date);
    const courseCode = extractFieldFromElement(el, rule.fields.courseCode);
    const timeRange = extractFieldFromElement(el, rule.fields.timeRange);
    const startTime = extractFieldFromElement(el, rule.fields.startTime);
    const endTime = extractFieldFromElement(el, rule.fields.endTime);
    const location = extractFieldFromElement(el, rule.fields.location);
    const teacher = extractFieldFromElement(el, rule.fields.teacher);
    const group = extractFieldFromElement(el, rule.fields.group);
    const slot = extractFieldFromElement(el, rule.fields.slot);
    const status = extractFieldFromElement(el, rule.fields.status);

    // Skip empty rows where neither title nor courseCode nor date could be found
    if (!title && !courseCode && !date) {
      return;
    }

    rows.push({
      title,
      courseCode,
      date,
      timeRange,
      startTime,
      endTime,
      location,
      teacher,
      group,
      slot,
      status,
      rawText: el.textContent?.trim().slice(0, 200),
    });
  });

  return rows;
}
