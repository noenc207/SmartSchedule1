import type { EventItem, Task, Category } from '../../../types/domain';

export interface DayWorkloadMetric {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // 'Mon', 'Tue', ...
  fullDayLabel: string; // 'Monday', 'Tuesday', ...
  fixedMinutes: number; // Lectures, labs, locked commitments
  plannedMinutes: number; // Scheduled study & focus blocks
  totalWorkloadMinutes: number; // fixed + planned
  capacityMinutes: number; // Available study hours for that day
  isToday: boolean;
  isOverloaded: boolean; // totalWorkloadMinutes > capacityMinutes
  eventCount: number;
  events: EventItem[];
}

export interface ChartYAxisConfig {
  maxMinutes: number;
  ticks: { minutes: number; label: string; ratio: number }[];
}

export interface SmartInsight {
  id: string;
  type: 'urgency' | 'overload' | 'opportunity' | 'success';
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  onAction?: () => void;
  metadata?: Record<string, any>;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  subtext: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; text: string };
  badge?: { text: string; variant: 'info' | 'success' | 'warning' | 'danger' };
}

export interface FreeTimeGap {
  startsAt: string; // ISO
  endsAt: string; // ISO
  durationMinutes: number;
  timeRangeLabel: string; // e.g. "14:00 – 15:30"
  suggestedTask?: Task | null;
}
