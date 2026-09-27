import type { DayWorkloadMetric, ChartYAxisConfig } from '../types/dashboard';

/**
 * Calculates a dynamic, sensible Y-axis domain and tick intervals.
 * Adapts intelligently according to actual max minutes in the dataset.
 */
export function calculateYAxisConfig(
  metrics: DayWorkloadMetric[],
  minDisplayCapacityMinutes: number = 360 // Default 6 hours baseline if data is light
): ChartYAxisConfig {
  const maxDayMinutes = metrics.reduce(
    (max, m) => Math.max(max, m.totalWorkloadMinutes, m.capacityMinutes),
    0
  );

  // If entire week is empty or 0, provide a standard baseline 6h scale
  if (maxDayMinutes === 0) {
    const defaultHours = minDisplayCapacityMinutes / 60;
    const intervalHours = 2;
    const ticks: { minutes: number; label: string; ratio: number }[] = [];
    for (let h = 0; h <= defaultHours; h += intervalHours) {
      ticks.push({
        minutes: h * 60,
        label: `${h}h`,
        ratio: h / defaultHours,
      });
    }
    return { maxMinutes: minDisplayCapacityMinutes, ticks };
  }

  const maxHours = maxDayMinutes / 60;

  // Determine an aesthetically clean interval in hours
  let intervalHours: number;
  if (maxHours <= 3) {
    intervalHours = 1;
  } else if (maxHours <= 6) {
    intervalHours = 1; // 0, 1, 2, 3, 4, 5, 6
  } else if (maxHours <= 10) {
    intervalHours = 2; // 0, 2, 4, 6, 8, 10
  } else if (maxHours <= 16) {
    intervalHours = 3; // 0, 3, 6, 9, 12, 15
  } else if (maxHours <= 24) {
    intervalHours = 4; // 0, 4, 8, 12, 16, 20, 24
  } else {
    intervalHours = 6;
  }

  // Round max domain up to the next tick interval
  const domainMaxHours = Math.ceil(maxHours / intervalHours) * intervalHours;
  const domainMaxMinutes = domainMaxHours * 60;

  const ticks: { minutes: number; label: string; ratio: number }[] = [];
  for (let h = 0; h <= domainMaxHours; h += intervalHours) {
    ticks.push({
      minutes: h * 60,
      label: `${h}h`,
      ratio: domainMaxHours > 0 ? h / domainMaxHours : 0,
    });
  }

  return {
    maxMinutes: domainMaxMinutes,
    ticks,
  };
}

/**
 * Formats duration in minutes into a clean academic string.
 * Example: 90 -> "1.5h", 120 -> "2h", 45 -> "45m", 135 -> "2h 15m"
 */
export function formatWorkloadHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h';
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours}h`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}
