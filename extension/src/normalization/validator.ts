import type { UniversalScheduleItem, ValidationIssue, ValidationResult } from '../shared/types';
import { calculateDurationMinutes } from './timezone';

/**
 * Validates a list of UniversalScheduleItem objects before preview and import.
 */
export function validateScheduleItems(items: UniversalScheduleItem[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const validItems: UniversalScheduleItem[] = [];

  items.forEach((item, index) => {
    let itemHasFatalError = false;

    // 1. Title validation
    if (!item.title || item.title.trim().length === 0) {
      issues.push({
        severity: 'ERROR',
        code: 'MISSING_TITLE',
        message: `Buổi học #${index + 1} thiếu tên môn học.`,
        itemIndex: index,
      });
      itemHasFatalError = true;
    }

    // 2. Timestamps validation
    const startDate = new Date(item.startTime);
    const endDate = new Date(item.endTime);

    if (isNaN(startDate.getTime())) {
      issues.push({
        severity: 'ERROR',
        code: 'INVALID_START_TIME',
        message: `Buổi học "${item.title || index + 1}" có thời gian bắt đầu không hợp lệ (${item.startTime}).`,
        itemIndex: index,
        itemTitle: item.title,
      });
      itemHasFatalError = true;
    }

    if (isNaN(endDate.getTime())) {
      issues.push({
        severity: 'ERROR',
        code: 'INVALID_END_TIME',
        message: `Buổi học "${item.title || index + 1}" có thời gian kết thúc không hợp lệ (${item.endTime}).`,
        itemIndex: index,
        itemTitle: item.title,
      });
      itemHasFatalError = true;
    }

    if (!itemHasFatalError) {
      if (endDate.getTime() <= startDate.getTime()) {
        issues.push({
          severity: 'ERROR',
          code: 'END_BEFORE_START',
          message: `Buổi học "${item.title}" có giờ kết thúc sớm hơn hoặc bằng giờ bắt đầu.`,
          itemIndex: index,
          itemTitle: item.title,
        });
        itemHasFatalError = true;
      } else {
        const duration = calculateDurationMinutes(item.startTime, item.endTime);
        if (duration > 360) {
          issues.push({
            severity: 'WARNING',
            code: 'LONG_DURATION',
            message: `Buổi học "${item.title}" kéo dài hơn 6 tiếng (${Math.round(duration / 60)}h).`,
            itemIndex: index,
            itemTitle: item.title,
          });
        }
      }
    }

    // 3. Location warning
    if (!item.location || item.location.trim().length === 0) {
      issues.push({
        severity: 'WARNING',
        code: 'MISSING_LOCATION',
        message: `Buổi học "${item.title || index + 1}" chưa có thông tin phòng học.`,
        itemIndex: index,
        itemTitle: item.title,
      });
    }

    if (!itemHasFatalError) {
      validItems.push(item);
    }
  });

  const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

  return {
    valid: errorCount === 0,
    issues,
    items: validItems,
    validCount: validItems.length,
    errorCount,
    warningCount,
  };
}
