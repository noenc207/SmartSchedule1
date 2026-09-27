import type { SchedulingPreferences } from '../../../types/domain';

export type PersonaId = 'FPT_STUDENT' | 'EXAM_SPRINT' | 'WORKING_PRO' | 'BALANCED_CHILL';

export interface SchedulingPersona {
  id: PersonaId;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  color: string;
  preferences: SchedulingPreferences;
  campusMobilityAware: boolean;
  protectLunch: boolean;
  noLateNightHour: number;
}

export const SCHEDULING_PERSONAS: Record<PersonaId, SchedulingPersona> = {
  FPT_STUDENT: {
    id: 'FPT_STUDENT',
    name: 'Sinh viên FPT AI',
    tagline: 'Tối ưu theo lịch học giảng đường & Lab',
    description: 'Học tập trung 17:30–22:30, ca học 90p, nghỉ 15p, tự động giữ đệm đi lại giữa các tòa nhà campus.',
    badge: 'FPT Campus',
    color: '#ea580c',
    preferences: {
      preferredStart: '17:30',
      preferredEnd: '22:30',
      maxDailyMinutes: 300, // 5h
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 90,
      minBreakMinutes: 15,
      deadlineWeight: 0.35,
      priorityWeight: 0.30,
      preferenceWeight: 0.20,
      workloadBalanceWeight: 0.15,
    },
    campusMobilityAware: true,
    protectLunch: true,
    noLateNightHour: 23,
  },
  EXAM_SPRINT: {
    id: 'EXAM_SPRINT',
    name: 'Ôn thi nước rút',
    tagline: 'Tập trung cao độ & Nén lịch tối đa',
    description: 'Khung giờ rộng 07:30–23:00, ưu tiên deadline gần nhất, ca dài 120p, nghỉ ngắn 10p, trần 8h/ngày.',
    badge: 'Nước rút',
    color: '#dc2626',
    preferences: {
      preferredStart: '07:30',
      preferredEnd: '23:00',
      maxDailyMinutes: 480, // 8h
      minimumSessionMinutes: 45,
      maximumSessionMinutes: 120,
      minBreakMinutes: 10,
      deadlineWeight: 0.55,
      priorityWeight: 0.25,
      preferenceWeight: 0.10,
      workloadBalanceWeight: 0.10,
    },
    campusMobilityAware: true,
    protectLunch: false,
    noLateNightHour: 24,
  },
  WORKING_PRO: {
    id: 'WORKING_PRO',
    name: 'Vừa học vừa làm',
    tagline: 'Khóa giờ hành chính, học tối & cuối tuần',
    description: 'Giờ hành chính 08:00–17:30 dành cho công việc. Chỉ xếp tự học 19:00–23:00 hoặc cuối tuần, ca 45–60p.',
    badge: 'Đi làm',
    color: '#2563eb',
    preferences: {
      preferredStart: '19:00',
      preferredEnd: '23:00',
      maxDailyMinutes: 180, // 3h
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 60,
      minBreakMinutes: 20,
      deadlineWeight: 0.30,
      priorityWeight: 0.30,
      preferenceWeight: 0.25,
      workloadBalanceWeight: 0.15,
    },
    campusMobilityAware: false,
    protectLunch: true,
    noLateNightHour: 23,
  },
  BALANCED_CHILL: {
    id: 'BALANCED_CHILL',
    name: 'Cân bằng & Chill',
    tagline: 'Nhịp độ nhẹ nhàng, Pomodoro thư thả',
    description: 'Học ban ngày 08:30–17:00, không thức khuya sau 21:00, ca ngắn 30–45p, nghỉ thư giãn 25p, trần 3.5h/ngày.',
    badge: 'Thư thả',
    color: '#10b981',
    preferences: {
      preferredStart: '08:30',
      preferredEnd: '17:00',
      maxDailyMinutes: 210, // 3.5h
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 45,
      minBreakMinutes: 25,
      deadlineWeight: 0.25,
      priorityWeight: 0.25,
      preferenceWeight: 0.20,
      workloadBalanceWeight: 0.30,
    },
    campusMobilityAware: true,
    protectLunch: true,
    noLateNightHour: 21,
  },
};

export const SESSION_DURATION_OPTIONS = [
  { label: '15 phút', value: 15 },
  { label: '30 phút', value: 30 },
  { label: '45 phút', value: 45 },
  { label: '60 phút (1h)', value: 60 },
  { label: '90 phút (1.5h)', value: 90 },
  { label: '120 phút (2h)', value: 120 },
  { label: '180 phút (3h)', value: 180 },
];

export const BREAK_DURATION_OPTIONS = [
  { label: '5 phút', value: 5 },
  { label: '10 phút', value: 10 },
  { label: '15 phút', value: 15 },
  { label: '20 phút', value: 20 },
  { label: '30 phút', value: 30 },
  { label: '45 phút', value: 45 },
];

export const DAILY_CAPACITY_OPTIONS = [
  { label: '2 tiếng/ngày', value: 120 },
  { label: '3 tiếng/ngày', value: 180 },
  { label: '4 tiếng/ngày', value: 240 },
  { label: '5 tiếng/ngày', value: 300 },
  { label: '6 tiếng/ngày', value: 360 },
  { label: '8 tiếng/ngày', value: 480 },
];

export function parseHourMinute(timeStr?: string | null): { hour: number; minute: number } {
  if (!timeStr) return { hour: 8, minute: 0 };
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return {
    hour: isNaN(h) ? 8 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

export function formatHourMinute(hour: number, minute: number): string {
  const h = String(Math.max(0, Math.min(23, hour))).padStart(2, '0');
  const m = String(Math.max(0, Math.min(59, minute))).padStart(2, '0');
  return `${h}:${m}`;
}
