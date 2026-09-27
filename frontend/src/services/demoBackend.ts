import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  Availability,
  Category,
  EventItem,
  PageResponse,
  Schedule,
  Task,
  SchedulingPreferences,
  SchedulingResult,
  RescheduleImpact,
  RescheduleResult,
  RescheduleAlternative,
  WhatIfResult,
  ConflictAnalysis,
  ShareLink,
  PublicSchedule,
  ActivityItem,
  ScheduleMember,
  TeamAvailabilityResponse,
  UserLocation,
} from '../types/domain';
import { getDemoDate } from './demoMode';
import { DEFAULT_TIMEZONE, formatDate, formatDuration } from '../utils/dateTime';
import {
  DEMO_CAMPUS_LOCATIONS,
  computeCampusShortestPath,
  computeDynamicRoute,
  evaluateCandidateMobility,
  resolveLocationRef,
  registerUserLocations,
} from '../features/calendar/mobility/campusRouting';
import {
  parseCanvasLmsPayload,
  parseMoodlePayload,
  parseHrShiftPayload,
  generateOpenApiSpec,
} from './openApiIntegration';
import { exportEventsToIcs } from './icsService';

const STORAGE_KEY = 'smartschedule-demo-state';
const DEMO_USER_ID = 'demo-user';
const DEMO_SCHEDULE_ID = 'demo-schedule';

type DemoState = {
  schedules: Schedule[];
  events: EventItem[];
  tasks: Task[];
  categories: Category[];
  availability: Availability[];
  userLocations: UserLocation[];
  shareLinks: ShareLink[];
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    scheduledFor: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
  log: Array<{ at: string; method: string; url: string; payload?: unknown }>;
  schedulingPreferences?: Record<string, SchedulingPreferences>;
  apiKeys?: Array<{ id: string; key: string; name: string; createdAt: string; lastUsedAt: string | null }>;
};

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export function seedDemoData(): DemoState {
  const created = now();

  const categories: Category[] = [
    { id: 'cat-academic', ownerId: DEMO_USER_ID, name: 'Academic', color: '#2563eb', icon: 'graduation-cap', createdAt: created, updatedAt: created },
    { id: 'cat-projects', ownerId: DEMO_USER_ID, name: 'Projects', color: '#7c3aed', icon: 'code', createdAt: created, updatedAt: created },
    { id: 'cat-review', ownerId: DEMO_USER_ID, name: 'Exam & Review', color: '#0891b2', icon: 'book-open', createdAt: created, updatedAt: created },
    { id: 'cat-general', ownerId: DEMO_USER_ID, name: 'General', color: '#4b5563', icon: 'coffee', createdAt: created, updatedAt: created },
  ];

  // Fixed commitments: Mon-Fri university lectures, locked & fixed
  const events: EventItem[] = [
    {
      id: 'event-fixed-1',
      scheduleId: DEMO_SCHEDULE_ID,
      categoryId: 'cat-academic',
      title: 'Database Systems',
      description: 'Relational algebra & SQL query optimization lecture',
      startsAt: getDemoDate(0, 9, 0), // Monday 09:00
      endsAt: getDemoDate(0, 11, 0),   // Monday 11:00
      location: 'Campus Building A',
      locationId: '10000000-0000-0000-0000-000000000001',
      locationRef: DEMO_CAMPUS_LOCATIONS[0],
      priority: 'HIGH',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: 'Bring laptop for lab environment setup.',
      fixed: true,
      locked: true,
      createdAt: created,
      updatedAt: created,
      occurrenceId: 'event-fixed-1',
      seriesId: 'event-fixed-1',
    },
    {
      id: 'event-fixed-2',
      scheduleId: DEMO_SCHEDULE_ID,
      categoryId: 'cat-academic',
      title: 'Machine Learning',
      description: 'Loss functions, gradient descent, and neural net backprop',
      startsAt: getDemoDate(1, 13, 0), // Tuesday 13:00
      endsAt: getDemoDate(1, 15, 0),   // Tuesday 15:00
      location: 'Lecture Hall A',
      priority: 'HIGH',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 30,
      notes: 'Review chapter 4 slides before class.',
      fixed: true,
      locked: true,
      createdAt: created,
      updatedAt: created,
      occurrenceId: 'event-fixed-2',
      seriesId: 'event-fixed-2',
    },
    {
      id: 'event-fixed-3',
      scheduleId: DEMO_SCHEDULE_ID,
      categoryId: 'cat-academic',
      title: 'Operating Systems',
      description: 'Process scheduling, deadlocks, and virtual memory',
      startsAt: getDemoDate(2, 9, 0), // Wednesday 09:00
      endsAt: getDemoDate(2, 11, 0),   // Wednesday 11:00
      location: 'Room 204, Tech Wing',
      priority: 'HIGH',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: null,
      fixed: true,
      locked: true,
      createdAt: created,
      updatedAt: created,
      occurrenceId: 'event-fixed-3',
      seriesId: 'event-fixed-3',
    },
    {
      id: 'event-fixed-4',
      scheduleId: DEMO_SCHEDULE_ID,
      categoryId: 'cat-academic',
      title: 'Software Engineering',
      description: 'Agile architecture, CI/CD pipeline principles, and design patterns',
      startsAt: getDemoDate(3, 13, 0), // Thursday 13:00
      endsAt: getDemoDate(3, 15, 0),   // Thursday 15:00
      location: 'Lab 105',
      priority: 'HIGH',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 30,
      notes: 'Sprint review with team lead.',
      fixed: true,
      locked: true,
      createdAt: created,
      updatedAt: created,
      occurrenceId: 'event-fixed-4',
      seriesId: 'event-fixed-4',
    },
    {
      id: 'event-fixed-5',
      scheduleId: DEMO_SCHEDULE_ID,
      categoryId: 'cat-academic',
      title: 'Computer Networks',
      description: 'TCP congestion control and socket programming protocols',
      startsAt: getDemoDate(4, 9, 0), // Friday 09:00
      endsAt: getDemoDate(4, 11, 0),   // Friday 11:00
      location: 'Lecture Hall B',
      priority: 'HIGH',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: 'Final review before mid-term.',
      fixed: true,
      locked: true,
      createdAt: created,
      updatedAt: created,
      occurrenceId: 'event-fixed-5',
      seriesId: 'event-fixed-5',
    },
  ];

  // 5 Unscheduled tasks for Alex Nguyen
  const tasks: Task[] = [
    {
      id: 'demo-task-1',
      scheduleId: DEMO_SCHEDULE_ID,
      ownerId: DEMO_USER_ID,
      categoryId: 'cat-projects',
      title: 'Machine Learning Assignment',
      description: 'Implement backpropagation algorithm and test on MNIST dataset',
      estimatedDurationMinutes: 180, // 3h
      remainingDurationMinutes: 180,
      priority: 'HIGH',
      deadline: getDemoDate(4, 23, 59), // Friday deadline
      status: 'TODO',
      preferredStartTime: '17:00',
      preferredEndTime: '22:00',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120, // splittable
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'demo-task-2',
      scheduleId: DEMO_SCHEDULE_ID,
      ownerId: DEMO_USER_ID,
      categoryId: 'cat-projects',
      title: 'Database Project',
      description: 'Build B-Tree indexing query benchmark and report',
      estimatedDurationMinutes: 240, // 4h
      remainingDurationMinutes: 240,
      priority: 'HIGH',
      deadline: getDemoDate(6, 23, 59), // Sunday deadline
      status: 'TODO',
      preferredStartTime: '17:00',
      preferredEndTime: '22:00',
      minimumSessionMinutes: 60,
      maximumSessionMinutes: 120, // splittable
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'demo-task-3',
      scheduleId: DEMO_SCHEDULE_ID,
      ownerId: DEMO_USER_ID,
      categoryId: 'cat-review',
      title: 'Operating Systems Review',
      description: 'Review memory management, paging tables, and semaphore problems',
      estimatedDurationMinutes: 120, // 2h
      remainingDurationMinutes: 120,
      priority: 'MEDIUM',
      deadline: getDemoDate(5, 23, 59), // Saturday deadline
      status: 'TODO',
      preferredStartTime: '18:00',
      preferredEndTime: '22:00',
      minimumSessionMinutes: 60,
      maximumSessionMinutes: 120, // non-splittable
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'demo-task-4',
      scheduleId: DEMO_SCHEDULE_ID,
      ownerId: DEMO_USER_ID,
      categoryId: 'cat-projects',
      title: 'Research Paper',
      description: 'Draft literature survey and methodology for seminar paper',
      estimatedDurationMinutes: 240, // 4h
      remainingDurationMinutes: 240,
      priority: 'HIGH',
      deadline: getDemoDate(6, 23, 59), // Sunday deadline
      status: 'TODO',
      preferredStartTime: '17:00',
      preferredEndTime: '22:00',
      minimumSessionMinutes: 60,
      maximumSessionMinutes: 120, // splittable
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'demo-task-5',
      scheduleId: DEMO_SCHEDULE_ID,
      ownerId: DEMO_USER_ID,
      categoryId: 'cat-general',
      title: 'English Practice',
      description: 'Technical paper reading & vocabulary retention session',
      estimatedDurationMinutes: 120, // 2h
      remainingDurationMinutes: 120,
      priority: 'LOW',
      deadline: getDemoDate(7, 23, 59), // Next Monday deadline
      status: 'TODO',
      preferredStartTime: '14:00',
      preferredEndTime: '18:00',
      minimumSessionMinutes: 60,
      maximumSessionMinutes: 120, // non-splittable
      createdAt: created,
      updatedAt: created,
    },
  ];

  // Realistic study availability
  const availability: Availability[] = [
    { id: 'avail-1', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 1, startTime: '18:00:00', endTime: '22:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-2', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 2, startTime: '17:00:00', endTime: '22:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-3', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 3, startTime: '18:00:00', endTime: '22:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-4', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 4, startTime: '17:00:00', endTime: '22:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-5', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 5, startTime: '18:00:00', endTime: '22:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-6a', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 6, startTime: '09:00:00', endTime: '12:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-6b', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 6, startTime: '14:00:00', endTime: '18:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-7a', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 7, startTime: '09:00:00', endTime: '12:00:00', enabled: true, createdAt: created, updatedAt: created },
    { id: 'avail-7b', scheduleId: DEMO_SCHEDULE_ID, dayOfWeek: 7, startTime: '14:00:00', endTime: '18:00:00', enabled: true, createdAt: created, updatedAt: created },
  ];

  const shareLinks: ShareLink[] = [
    {
      id: 'demo-share-link',
      mode: 'VIEW_ONLY',
      expiresAt: null,
      revokedAt: null,
      createdAt: created,
      url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/demo/share/smart-schedule-demo`,
    },
  ];

  const userLocations: UserLocation[] = [
    {
      id: 'loc-home',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Nhà riêng',
      category: 'HOME',
      address: 'Phường Ghềnh Ráng, TP. Quy Nhơn',
      latitude: 13.782,
      longitude: 109.219,
      radiusMeters: 50,
      isFavorite: true,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'loc-office',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Tòa nhà FPT Software',
      category: 'OFFICE',
      address: 'Khu đô thị An Phú Thịnh, Quy Nhơn',
      latitude: 13.755,
      longitude: 109.21,
      radiusMeters: 100,
      building: 'F-Town',
      room: 'Tầng 4',
      isFavorite: true,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'loc-cafe',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Quán Cafe Quen (The Coffee House)',
      category: 'CAFE',
      address: 'Đường Nguyễn Tất Thành, TP. Quy Nhơn',
      latitude: 13.77,
      longitude: 109.223,
      radiusMeters: 30,
      isFavorite: true,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: '10000000-0000-0000-0000-000000000001',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Campus Building A',
      category: 'CAMPUS',
      address: 'Khu đô thị AI FPT Quy Nhơn',
      latitude: 13.7589,
      longitude: 109.2185,
      building: 'Building A',
      room: 'A101',
      isFavorite: false,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Campus Building B',
      category: 'CAMPUS',
      address: 'Khu đô thị AI FPT Quy Nhơn',
      latitude: 13.7595,
      longitude: 109.2192,
      building: 'Building B',
      room: 'B201',
      isFavorite: false,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Central Hall',
      category: 'CAMPUS',
      address: 'Khu đô thị AI FPT Quy Nhơn',
      latitude: 13.7582,
      longitude: 109.218,
      building: 'Central Hall',
      room: 'Hall 1',
      isFavorite: false,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      userId: DEMO_USER_ID,
      workspaceId: DEMO_SCHEDULE_ID,
      name: 'Campus Library',
      category: 'CAMPUS',
      address: 'Khu đô thị AI FPT Quy Nhơn',
      latitude: 13.7578,
      longitude: 109.2188,
      building: 'Learning Hub',
      room: 'Floor 2',
      isFavorite: true,
      createdAt: created,
      updatedAt: created,
    },
  ];

  registerUserLocations(userLocations);

  return {
    schedules: [
      {
        id: DEMO_SCHEDULE_ID,
        name: 'Academic Schedule',
        timezone: 'Asia/Ho_Chi_Minh',
        visibility: 'PRIVATE',
        role: 'OWNER',
        owned: true,
        ownerId: DEMO_USER_ID,
        description: 'Alex Nguyen · Computer Science Student',
        createdAt: created,
        updatedAt: created,
        version: 1,
      },
    ],
    categories,
    events,
    tasks,
    availability,
    userLocations,
    shareLinks,
    apiKeys: [
      {
        id: 'key-1',
        key: 'sk_live_smartschedule_fptu_academic_2026',
        name: 'FPT University Canvas LMS Sync Key',
        createdAt: created,
        lastUsedAt: created,
      },
    ],
    notifications: [
      {
        id: 'demo-notif-1',
        type: 'EVENT_REMINDER',
        title: 'Database Systems',
        message: 'Lecture starts at 09:00 in Lab 302',
        relatedEntityType: 'EVENT',
        relatedEntityId: 'event-fixed-1',
        scheduledFor: null,
        readAt: null,
        createdAt: created,
      },
      {
        id: 'demo-notif-2',
        type: 'TASK_DEADLINE',
        title: 'Machine Learning Assignment',
        message: 'Deadline approaching on Friday 23:59',
        relatedEntityType: 'TASK',
        relatedEntityId: 'demo-task-1',
        scheduledFor: null,
        readAt: null,
        createdAt: created,
      },
    ],
    log: [],
    schedulingPreferences: {
      [DEMO_SCHEDULE_ID]: {
        maxDailyMinutes: 360, // 6 hours
        minBreakMinutes: 30,
        preferredStart: '17:00',
        preferredEnd: '22:00',
        maximumSessionMinutes: 120, // 2 hours
        minimumSessionMinutes: 30,
        workloadBalanceWeight: 0.2,
        deadlineWeight: 0.35,
        priorityWeight: 0.3,
        preferenceWeight: 0.15,
      },
    },
  };
}

let memoryState: DemoState | null = null;

function load(): DemoState {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.events && parsed.tasks && parsed.schedules) {
          if (!parsed.userLocations || parsed.userLocations.length === 0) {
            const fresh = seedDemoData();
            parsed.userLocations = fresh.userLocations;
            parsed.apiKeys = fresh.apiKeys;
          }
          registerUserLocations(parsed.userLocations);
          memoryState = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Storage might be restricted
  }
  if (!memoryState) {
    memoryState = seedDemoData();
  }
  return memoryState;
}

function save(state: DemoState) {
  memoryState = state;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Storage might be restricted
  }
}

export function resetDemoData() {
  memoryState = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

const defaultPreferences: SchedulingPreferences = {
  maxDailyMinutes: 360,
  minBreakMinutes: 30,
  preferredStart: '17:00',
  preferredEnd: '22:00',
  maximumSessionMinutes: 120,
  minimumSessionMinutes: 30,
  workloadBalanceWeight: 0.2,
  deadlineWeight: 0.35,
  priorityWeight: 0.3,
  preferenceWeight: 0.15,
};

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

/**
 * Builds the deterministic schedule plan matching the requested demo scenario.
 * Strictly respects:
 * - Only schedules remaining work: remaining = max(0, estimated - scheduled)
 * - Never double schedules completed or already planned tasks
 * - Enforces hard constraints: no overlap with fixed/locked university classes
 * - Enforces soft constraints: minimum start 08:00, protected lunch 12:00-13:00, 30m class buffer
 */
function buildDemoPlan(state: DemoState, scheduleId: string, request: { from: string; to: string; taskIds?: string[]; splitTaskIds?: string[] }): SchedulingResult {
  const candidateSlots: SchedulingResult['slots'] = [
    {
      taskId: 'demo-task-1',
      title: 'Machine Learning Assignment',
      categoryId: 'cat-projects',
      startsAt: getDemoDate(0, 18, 0), // Monday 18:00
      endsAt: getDemoDate(0, 20, 0),   // Monday 20:00 (2h)
      score: 0.96,
    },
    {
      taskId: 'demo-task-2',
      title: 'Database Project',
      categoryId: 'cat-projects',
      startsAt: getDemoDate(1, 17, 0), // Tuesday 17:00
      endsAt: getDemoDate(1, 19, 0),   // Tuesday 19:00 (2h)
      score: 0.94,
    },
    {
      taskId: 'demo-task-3',
      title: 'Operating Systems Review',
      categoryId: 'cat-review',
      startsAt: getDemoDate(2, 18, 0), // Wednesday 18:00
      endsAt: getDemoDate(2, 20, 0),   // Wednesday 20:00 (2h)
      score: 0.95,
    },
    {
      taskId: 'demo-task-4',
      title: 'Research Paper',
      categoryId: 'cat-projects',
      startsAt: getDemoDate(3, 17, 0), // Thursday 17:00
      endsAt: getDemoDate(3, 19, 0),   // Thursday 19:00 (2h)
      score: 0.92,
    },
    {
      taskId: 'demo-task-2',
      title: 'Database Project',
      categoryId: 'cat-projects',
      startsAt: getDemoDate(5, 9, 0),  // Saturday 09:00
      endsAt: getDemoDate(5, 11, 0),   // Saturday 11:00 (2h, completing 4h total!)
      score: 0.97,
    },
    {
      taskId: 'demo-task-5',
      title: 'English Practice',
      categoryId: 'cat-general',
      startsAt: getDemoDate(6, 14, 0), // Sunday 14:00
      endsAt: getDemoDate(6, 16, 0),   // Sunday 16:00 (2h)
      score: 0.91,
    },
  ];

  // Map task metadata
  const taskMap = new Map<string, Task>();
  state.tasks.forEach((t) => taskMap.set(t.id, t));

  // Map existing scheduled minutes on the calendar
  const scheduledMinutesMap = new Map<string, number>();
  state.events.forEach((e) => {
    if (e.scheduleId !== scheduleId) return;
    const tid = e.taskId || state.tasks.find((t) => e.notes?.includes(t.id))?.id;
    if (tid) {
      const dur = minutesBetween(e.startsAt, e.endsAt);
      scheduledMinutesMap.set(tid, (scheduledMinutesMap.get(tid) || 0) + dur);
    }
  });

  const plannedSlots: SchedulingResult['slots'] = [];
  const planAllocatedMap = new Map<string, number>();

  for (const slot of candidateSlots) {
    if (request.taskIds && request.taskIds.length > 0 && !request.taskIds.includes(slot.taskId)) {
      continue;
    }
    const task = taskMap.get(slot.taskId);
    const estimated = task ? task.estimatedDurationMinutes : 120;
    const alreadyScheduled = scheduledMinutesMap.get(slot.taskId) || 0;
    const currentlyAllocated = planAllocatedMap.get(slot.taskId) || 0;
    const remainingToSchedule = Math.max(0, estimated - alreadyScheduled - currentlyAllocated);

    if (remainingToSchedule <= 0) {
      // Already fully scheduled, never double schedule!
      continue;
    }

    const slotMinutes = minutesBetween(slot.startsAt, slot.endsAt);
    if (slotMinutes <= remainingToSchedule) {
      plannedSlots.push(slot);
      planAllocatedMap.set(slot.taskId, currentlyAllocated + slotMinutes);
    } else if (remainingToSchedule >= 30) {
      const adjustedEnd = new Date(new Date(slot.startsAt).getTime() + remainingToSchedule * 60000).toISOString();
      plannedSlots.push({ ...slot, endsAt: adjustedEnd });
      planAllocatedMap.set(slot.taskId, currentlyAllocated + remainingToSchedule);
    }
  }

  // Dynamically allocate open slots for custom/new tasks (not among the standard seeded 5 demo tasks)
  const seededTaskIds = new Set(['demo-task-1', 'demo-task-2', 'demo-task-3', 'demo-task-4', 'demo-task-5']);
  const remainingTasks = state.tasks.filter((t) => {
    if (seededTaskIds.has(t.id)) return false;
    if (request.taskIds && request.taskIds.length > 0 && !request.taskIds.includes(t.id)) return false;
    const alreadyScheduled = scheduledMinutesMap.get(t.id) || 0;
    const planAllocated = planAllocatedMap.get(t.id) || 0;
    return (t.estimatedDurationMinutes - alreadyScheduled - planAllocated) >= 15;
  });

  if (remainingTasks.length > 0) {
    const occupied = [
      ...state.events.filter((e) => e.scheduleId === scheduleId).map((e) => ({
        start: new Date(e.startsAt).getTime(),
        end: new Date(e.endsAt).getTime(),
      })),
      ...plannedSlots.map((s) => ({
        start: new Date(s.startsAt).getTime(),
        end: new Date(s.endsAt).getTime(),
      })),
    ];

    const rangeStart = new Date(request.from).getTime();
    const rangeEnd = new Date(request.to).getTime();

    for (const task of remainingTasks) {
      let needed = task.estimatedDurationMinutes - (scheduledMinutesMap.get(task.id) || 0) - (planAllocatedMap.get(task.id) || 0);
      if (needed < 15) continue;

      const startDay = new Date(rangeStart);
      for (let d = 0; d < 7 && needed >= 15; d++) {
        const candidateHours = [19, 20, 14, 15, 16, 9, 10];
        for (const h of candidateHours) {
          if (needed < 15) break;
          const slotStart = new Date(startDay);
          slotStart.setDate(slotStart.getDate() + d);
          slotStart.setHours(h, 0, 0, 0);
          const dur = Math.min(needed, task.maximumSessionMinutes || 120);
          const slotEnd = new Date(slotStart.getTime() + dur * 60000);

          if (slotStart.getTime() < rangeStart || slotEnd.getTime() > rangeEnd) continue;

          const overlaps = occupied.some((b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start);
          if (!overlaps) {
            const newSlot = {
              taskId: task.id,
              title: task.title,
              categoryId: task.categoryId,
              startsAt: slotStart.toISOString(),
              endsAt: slotEnd.toISOString(),
              score: 0.92,
            };
            plannedSlots.push(newSlot);
            occupied.push({ start: slotStart.getTime(), end: slotEnd.getTime() });
            const prevAlloc = planAllocatedMap.get(task.id) || 0;
            planAllocatedMap.set(task.id, prevAlloc + dur);
            needed -= dur;
            if (needed < 15 || !request.splitTaskIds?.includes(task.id)) {
              break;
            }
          }
        }
      }
    }
  }

  const unscheduled: SchedulingResult['unscheduled'] = [];
  const deadlineRisks: SchedulingResult['deadlineRisks'] = [];

  state.tasks.forEach((task) => {
    if (request.taskIds && request.taskIds.length > 0 && !request.taskIds.includes(task.id)) {
      return;
    }
    const alreadyScheduled = scheduledMinutesMap.get(task.id) || 0;
    const planAllocated = planAllocatedMap.get(task.id) || 0;
    const totalCovered = alreadyScheduled + planAllocated;
    const deficit = Math.max(0, task.estimatedDurationMinutes - totalCovered);

    if (deficit > 0) {
      unscheduled.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: 'SESSION_LIMIT_EXCEEDED',
        requiredMinutes: task.estimatedDurationMinutes,
        availableMinutes: totalCovered,
        deficitMinutes: deficit,
        message: `${planAllocated ? `${formatDuration(planAllocated)} scheduled; ` : ''}remaining ${formatDuration(deficit)} deferred due to focus limit & preferred study window.`,
      });
    }

    if (task.deadline && deficit >= 120) {
      deadlineRisks.push({
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline,
        requiredMinutes: task.estimatedDurationMinutes,
        availableMinutes: totalCovered,
        level: 'MEDIUM',
        message: `Remaining ${formatDuration(deficit)} unscheduled nearing Sunday deadline.`,
      });
    }
  });

  const plannedMinutes = plannedSlots.reduce((sum, s) => sum + minutesBetween(s.startsAt, s.endsAt), 0);
  const remainingMinutes = unscheduled.reduce((sum, u) => sum + u.deficitMinutes, 0);

  return {
    planId: `demo-plan-deterministic-academic`,
    scheduleId,
    fingerprint: 'demo-fingerprint-v1',
    from: request.from,
    to: request.to,
    scheduleVersion: 1,
    slots: plannedSlots,
    unscheduled,
    deadlineRisks,
    summary: {
      plannedMinutes,
      remainingMinutes,
      hardConflicts: 0,
      deadlineRisks: deadlineRisks.length,
    },
  };
}

function buildImpact(state: DemoState, scheduleId: string, request: { from: string; to: string }): RescheduleImpact {
  const affected = state.events.filter(
    (event) => event.scheduleId === scheduleId && new Date(event.startsAt) < new Date(request.to) && new Date(event.endsAt) > new Date(request.from)
  );
  const affectedSessions = affected.map((event) => ({
    id: event.id,
    title: event.title,
    taskId: null,
    classification: 'DIRECTLY_AFFECTED' as const,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    minutes: minutesBetween(event.startsAt, event.endsAt),
  }));

  return {
    affectedTasks: [],
    affectedSessions,
    unaffectedSessions: state.events
      .filter((e) => !affected.some((a) => a.id === e.id))
      .map((e) => ({
        id: e.id,
        title: e.title,
        taskId: null,
        classification: 'UNAFFECTED' as const,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        minutes: minutesBetween(e.startsAt, e.endsAt),
      })),
    introducedConflicts: [],
    lostCapacityMinutes: affectedSessions.reduce((total, item) => total + item.minutes, 0),
    impactSummary: affectedSessions.length
      ? `${affectedSessions.length} session(s) directly overlap this time block.`
      : 'No existing commitments are affected.',
    fingerprint: 'impact-fingerprint',
  };
}

function response<T>(config: AxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: { 'content-type': 'application/json' },
    config: config as any,
  };
}

function path(config: AxiosRequestConfig) {
  return new URL(config.url ?? '', 'http://demo.local').pathname.replace('/api/v1', '');
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const state = load();
  const method = (config.method ?? 'get').toUpperCase();
  const route = path(config);
  let body: Record<string, any> = {};
  try {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {});
  } catch {
    body = {};
  }

  state.log.push({ at: now(), method, url: route, payload: body });
  if (state.log.length > 200) state.log.shift();

  const scheduleMatch = route.match(/^\/schedules\/([^/]+)/);
  const scheduleId = scheduleMatch?.[1];
  const eventId = route.match(/^\/events\/([^/]+)/)?.[1];
  const taskId = route.match(/^\/tasks\/([^/]+)/)?.[1];
  const schedulingRoute = scheduleId && route.includes(`/schedules/${scheduleId}/scheduling`);
  let data: unknown = {};
  let status = 200;

  // User Profile & Auth
  if ((route === '/users/me' || route === '/auth/me') && method === 'GET') {
    const demoTier = (typeof window !== 'undefined' && localStorage.getItem('smartschedule-demo-tier')) || 'PRO';
    data = {
      id: DEMO_USER_ID,
      email: 'demo@fpt.edu.vn',
      displayName: 'Nguyen Thi Huong Nhi',
      name: 'Nguyen Thi Huong Nhi',
      avatarUrl: null,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
      tier: demoTier,
    };
  } else if ((route === '/users/me' || route === '/auth/me') && (method === 'PATCH' || method === 'PUT')) {
    const demoTier = (typeof window !== 'undefined' && localStorage.getItem('smartschedule-demo-tier')) || 'PRO';
    data = {
      id: DEMO_USER_ID,
      email: 'demo@fpt.edu.vn',
      displayName: body.name || body.displayName || 'Nguyen Thi Huong Nhi',
      name: body.name || body.displayName || 'Nguyen Thi Huong Nhi',
      avatarUrl: body.avatarUrl ?? null,
      timezone: body.timezone || 'Asia/Ho_Chi_Minh',
      locale: body.locale || 'vi-VN',
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
      tier: demoTier,
    };
  } else if ((route === '/users/me/upgrade-pro' || route === '/users/upgrade-pro') && method === 'POST') {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-tier', 'PRO');
    }
    data = {
      id: DEMO_USER_ID,
      email: 'demo@fpt.edu.vn',
      displayName: 'Nguyen Thi Huong Nhi',
      name: 'Nguyen Thi Huong Nhi',
      avatarUrl: null,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
      tier: 'PRO',
    };
  } else if ((route === '/users/me/downgrade-free' || route === '/users/downgrade-free') && method === 'POST') {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-tier', 'FREE');
    }
    data = {
      id: DEMO_USER_ID,
      email: 'demo@fpt.edu.vn',
      displayName: 'Nguyen Thi Huong Nhi',
      name: 'Nguyen Thi Huong Nhi',
      avatarUrl: null,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
      enabled: true,
      createdAt: '2026-09-01T00:00:00Z',
      tier: 'FREE',
    };
  }

  // Schedules
  else if (method === 'GET' && route === '/schedules') {
    data = state.schedules.map(({ description: _d, ownerId: _o, createdAt: _c, updatedAt: _u, ...summary }) => summary);
  } else if (method === 'GET' && scheduleId && route === `/schedules/${scheduleId}`) {
    data = state.schedules.find((item) => item.id === scheduleId) ?? state.schedules[0];
  } else if (method === 'POST' && route === '/schedules') {
    const created = now();
    const newSchedule: Schedule = {
      id: id('schedule'),
      name: body.name,
      description: body.description ?? null,
      timezone: body.timezone || 'Asia/Ho_Chi_Minh',
      visibility: body.visibility ?? 'PRIVATE',
      ownerId: DEMO_USER_ID,
      createdAt: created,
      updatedAt: created,
      role: 'OWNER',
      owned: true,
      version: 0,
    };
    state.schedules.push(newSchedule);
    data = newSchedule;
    status = 201;
  } else if (method === 'PUT' && scheduleId && route === `/schedules/${scheduleId}`) {
    const item = state.schedules.find((entry) => entry.id === scheduleId);
    if (item) Object.assign(item, body, { updatedAt: now(), version: (item.version ?? 0) + 1 });
    data = item;
  } else if (method === 'DELETE' && scheduleId && route === `/schedules/${scheduleId}`) {
    state.schedules = state.schedules.filter((item) => item.id !== scheduleId);
  }

  // Calendar ICS Export & Import
  else if (scheduleId && route.endsWith('/export.ics') && method === 'GET') {
    data = exportEventsToIcs(state.events.filter((e) => e.scheduleId === scheduleId));
  } else if (scheduleId && route.endsWith('/import.ics/confirm') && method === 'POST') {
    const req = body as { events: Array<{ title: string; startsAt: string; endsAt: string; description?: string; location?: string }> };
    let imported = 0;
    for (const ev of req.events || []) {
      const newEvId = id('event');
      state.events.push({
        id: newEvId,
        scheduleId,
        title: ev.title,
        description: ev.description ?? null,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        location: ev.location ?? null,
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        fixed: true,
        locked: false,
        recurrenceRule: null,
        reminderMinutes: null,
        notes: 'Imported from iCalendar',
        categoryId: null,
        occurrenceId: newEvId,
        seriesId: newEvId,
        createdAt: now(),
        updatedAt: now(),
      });
      imported++;
    }
    data = imported;
  }

  // Conflict analysis
  else if (method === 'GET' && scheduleId && route.endsWith('/conflicts')) {
    const params = (config.params ?? {}) as Record<string, unknown>;
    const from = String(params.from ?? getDemoDate(0, 0, 0));
    const to = String(params.to ?? getDemoDate(7, 23, 59));
    const events = state.events.filter(
      (event) => event.scheduleId === scheduleId && new Date(event.startsAt) < new Date(to) && new Date(event.endsAt) > new Date(from)
    );

    const conflicts = events.flatMap((event, index) =>
      events.slice(index + 1).filter((other) => new Date(event.startsAt) < new Date(other.endsAt) && new Date(event.endsAt) > new Date(other.startsAt)).map((other) => {
        const startsAt = new Date(Math.max(new Date(event.startsAt).getTime(), new Date(other.startsAt).getTime())).toISOString();
        const endsAt = new Date(Math.min(new Date(event.endsAt).getTime(), new Date(other.endsAt).getTime())).toISOString();
        return {
          type: 'EVENT_OVERLAP' as const,
          severity: 'WARNING' as const,
          title: `"${event.title}" overlaps "${other.title}"`,
          description: `Two commitments occupy the same time (${new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
          startsAt,
          endsAt,
          relatedId: event.id,
          relatedTitle: other.title,
          minutes: minutesBetween(startsAt, endsAt),
        };
      })
    );

    const result: ConflictAnalysis = {
      from,
      to,
      conflicts,
      errorCount: 0,
      warningCount: conflicts.length,
      infoCount: 0,
    };
    data = result;
  }

  // Check conflict on event creation/update
  else if (method === 'POST' && route === '/events/check-conflict') {
    const params = (config.params ?? {}) as Record<string, unknown>;
    const targetScheduleId = String(params.scheduleId ?? DEMO_SCHEDULE_ID);
    const startsAt = String(params.startsAt ?? '');
    const endsAt = String(params.endsAt ?? '');
    const excludeEventId = params.excludeEventId ? String(params.excludeEventId) : undefined;

    const overlapping = state.events.filter((event) => {
      if (event.scheduleId !== targetScheduleId) return false;
      if (excludeEventId && (event.id === excludeEventId || event.seriesId === excludeEventId)) return false;
      return new Date(startsAt) < new Date(event.endsAt) && new Date(endsAt) > new Date(event.startsAt);
    });

    data = {
      hasConflict: overlapping.length > 0,
      conflicts: overlapping.map((e) => ({
        eventId: e.id,
        title: e.title,
        overlapMinutes: minutesBetween(
          new Date(Math.max(new Date(startsAt).getTime(), new Date(e.startsAt).getTime())).toISOString(),
          new Date(Math.min(new Date(endsAt).getTime(), new Date(e.endsAt).getTime())).toISOString()
        ),
      })),
    };
  }

  // User Locations (Custom POIs) & Mobility endpoints
  else if (method === 'GET' && route === '/locations') {
    data = state.userLocations;
  } else if (method === 'GET' && route.startsWith('/locations/')) {
    const locId = route.split('/').pop();
    const loc = state.userLocations.find((l) => l.id === locId);
    data = loc || null;
  } else if (method === 'POST' && route === '/locations') {
    const created = now();
    const newLoc: UserLocation = {
      id: id('loc-custom'),
      userId: DEMO_USER_ID,
      workspaceId: scheduleId || DEMO_SCHEDULE_ID,
      name: body.name || 'Địa điểm mới',
      category: body.category || 'CUSTOM',
      address: body.address || null,
      latitude: Number(body.latitude) || 13.7589,
      longitude: Number(body.longitude) || 109.2185,
      radiusMeters: body.radiusMeters || 100,
      building: body.building || null,
      room: body.room || null,
      isFavorite: Boolean(body.isFavorite),
      createdAt: created,
      updatedAt: created,
    };
    state.userLocations.push(newLoc);
    registerUserLocations(state.userLocations);
    data = newLoc;
    status = 201;
  } else if (method === 'PUT' && route.startsWith('/locations/')) {
    const locId = route.split('/').pop();
    const loc = state.userLocations.find((l) => l.id === locId);
    if (loc) {
      Object.assign(loc, body, { updatedAt: now() });
      registerUserLocations(state.userLocations);
      data = loc;
    }
  } else if (method === 'DELETE' && route.startsWith('/locations/')) {
    const locId = route.split('/').pop();
    state.userLocations = state.userLocations.filter((l) => l.id !== locId);
    registerUserLocations(state.userLocations);
    data = { success: true };
  } else if (method === 'GET' && route === '/travel/estimate') {
    const params = (config.params ?? {}) as Record<string, unknown>;
    const fromId = String(params.from ?? '');
    const toId = String(params.to ?? '');
    const fromLoc = resolveLocationRef(fromId);
    const toLoc = resolveLocationRef(toId);
    if (fromLoc && toLoc) {
      data = computeDynamicRoute(fromLoc, toLoc);
    } else {
      const est = computeCampusShortestPath(fromId, toId);
      data = est ?? {
        fromLocationId: fromId,
        toLocationId: toId,
        durationMinutes: 0,
        distanceMeters: 0,
        mode: 'WALK',
        source: 'FAST_PATH',
        cached: false,
      };
    }
  } else if (method === 'POST' && route === '/mobility/acknowledge') {
    data = { success: true };
  } else if (method === 'POST' && route === '/events/check-mobility') {
    const finding = evaluateCandidateMobility(
      {
        id: body.excludeEventId,
        title: body.title || '',
        startsAt: body.startsAt || '',
        endsAt: body.endsAt || '',
        location: body.location,
        locationId: body.locationId,
      },
      state.events
    );
    data = finding;
  }

  // Open API Endpoints (LMS & HR Ingestion)
  else if (method === 'GET' && route === '/open/docs') {
    data = generateOpenApiSpec();
  } else if (method === 'POST' && route === '/open/schedules/batch-import') {
    const targetSchedule = body.scheduleId || scheduleId || DEMO_SCHEDULE_ID;
    const eventsToImport = body.events || [];
    let count = 0;
    for (const ev of eventsToImport) {
      const newEvId = id('event-open');
      state.events.push({
        id: newEvId,
        scheduleId: targetSchedule,
        userId: DEMO_USER_ID,
        workspaceId: targetSchedule,
        categoryId: 'cat-academic',
        title: ev.title || 'External Event',
        description: ev.description || 'Imported via Open API',
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        location: ev.locationName || null,
        priority: ev.priority || 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: 15,
        notes: ev.notes || 'Open API Ingestion',
        fixed: ev.fixed !== false,
        locked: false,
        occurrenceId: newEvId,
        seriesId: newEvId,
        createdAt: now(),
        updatedAt: now(),
      });
      count++;
    }
    data = { success: true, importedCount: count, message: `Successfully ingested ${count} events via Open API.` };
    status = 201;
  } else if (method === 'POST' && route === '/open/integrations/lms/sync') {
    const parsed = parseCanvasLmsPayload(body);
    const targetSchedule = scheduleId || DEMO_SCHEDULE_ID;
    let count = 0;
    for (const ev of parsed.events) {
      const newEvId = id('event-lms');
      state.events.push({
        id: newEvId,
        scheduleId: targetSchedule,
        userId: DEMO_USER_ID,
        workspaceId: targetSchedule,
        categoryId: 'cat-academic',
        title: ev.title,
        description: ev.description || '',
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        location: ev.locationName || 'Canvas LMS',
        priority: ev.priority || 'HIGH',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: 15,
        notes: ev.notes || 'Canvas LMS Sync',
        fixed: true,
        locked: false,
        occurrenceId: newEvId,
        seriesId: newEvId,
        createdAt: now(),
        updatedAt: now(),
      });
      count++;
    }
    data = { success: true, importedCount: count, sourceSystem: 'CANVAS_LMS' };
    status = 200;
  } else if (method === 'POST' && route === '/open/integrations/hr/events') {
    const parsed = parseHrShiftPayload(body);
    const targetSchedule = scheduleId || DEMO_SCHEDULE_ID;
    let count = 0;
    for (const ev of parsed.events) {
      const newEvId = id('event-hr');
      state.events.push({
        id: newEvId,
        scheduleId: targetSchedule,
        userId: DEMO_USER_ID,
        workspaceId: targetSchedule,
        categoryId: 'cat-projects',
        title: ev.title,
        description: ev.description || '',
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        location: ev.locationName || 'Tòa nhà công ty',
        priority: ev.priority || 'HIGH',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: 15,
        notes: ev.notes || 'HR Enterprise Shift',
        fixed: true,
        locked: false,
        occurrenceId: newEvId,
        seriesId: newEvId,
        createdAt: now(),
        updatedAt: now(),
      });
      count++;
    }
    data = { success: true, importedCount: count, sourceSystem: 'ENTERPRISE_HR' };
    status = 200;
  }

  // Scheduling engine
  else if (schedulingRoute && method === 'GET' && route.endsWith('/preferences')) {
    data = { ...defaultPreferences, ...(state.schedulingPreferences?.[scheduleId] ?? {}) };
  } else if (schedulingRoute && method === 'PUT' && route.endsWith('/preferences')) {
    state.schedulingPreferences = { ...(state.schedulingPreferences ?? {}), [scheduleId]: { ...defaultPreferences, ...body } };
    data = state.schedulingPreferences[scheduleId];
  } else if (schedulingRoute && method === 'POST' && route.endsWith('/generate')) {
    data = buildDemoPlan(state, scheduleId, body as { from: string; to: string; taskIds?: string[] });
  } else if (schedulingRoute && method === 'POST' && route.endsWith('/validate')) {
    const valReq = body as { fingerprint?: string };
    data = { valid: true, fingerprint: valReq.fingerprint ?? 'demo-fingerprint-v1', errors: [] };
  } else if (schedulingRoute && method === 'POST' && route.endsWith('/apply')) {
    const plan = body as Partial<SchedulingResult>;
    const appliedSlots = plan.slots ?? [];

    for (const slot of appliedSlots) {
      const createdId = id('event');
      const task = state.tasks.find((t) => t.id === slot.taskId);
      state.events.push({
        id: createdId,
        scheduleId,
        categoryId: slot.categoryId ?? task?.categoryId ?? 'cat-academic',
        title: slot.title,
        description: `Study session planned for ${slot.title}`,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        location: null,
        priority: task?.priority ?? 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: 15,
        notes: null,
        fixed: false,
        locked: false,
        occurrenceId: createdId,
        seriesId: createdId,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    // Update remaining duration on tasks
    for (const task of state.tasks) {
      const taskSlots = appliedSlots.filter((s) => s.taskId === task.id);
      const allocated = taskSlots.reduce((sum, s) => sum + minutesBetween(s.startsAt, s.endsAt), 0);
      task.remainingDurationMinutes = Math.max(0, task.remainingDurationMinutes - allocated);
      if (task.remainingDurationMinutes === 0) {
        task.status = 'COMPLETED';
      }
    }
    data = plan;
  }
  else if (schedulingRoute && method === 'GET' && route.endsWith('/ai-recommendation')) {
    const slotStart = getDemoDate(3, 14, 0); // Thursday 14:00
    const slotEnd = getDemoDate(3, 17, 20);   // Thursday 17:20
    data = {
      freeSlot: {
        dayOfWeek: 4,
        dayName: 'thứ 5',
        startsAt: slotStart,
        endsAt: slotEnd,
        durationMinutes: 200,
        durationFormatted: '3h 20m',
      },
      recommendedTasks: [
        {
          taskId: state.tasks.find((t) => t.title.includes('Machine Learning'))?.id ?? 'task-ml',
          title: 'Machine Learning Assignment',
          durationMinutes: 180,
          durationFormatted: '3h',
          priority: 'HIGH',
        },
        {
          taskId: state.tasks.find((t) => t.title.includes('Operating Systems Review') || t.title.includes('OS'))?.id ?? 'task-os',
          title: 'OS Review',
          durationMinutes: 120,
          durationFormatted: '2h',
          priority: 'MEDIUM',
        },
      ],
      message: 'Bạn có 3h 20m trống vào thứ 5. Mình đã tìm thấy 2 nhiệm vụ ưu tiên:',
    };
  } else if (schedulingRoute && method === 'POST' && route.endsWith('/apply-quick-slot')) {
    const req = body as { taskId: string; startsAt: string; endsAt: string };
    const task = state.tasks.find((t) => t.id === req.taskId);
    const createdId = id('event');
    const newEvent: EventItem = {
      id: createdId,
      scheduleId: scheduleId!,
      categoryId: task?.categoryId ?? 'cat-academic',
      title: task?.title ?? 'Buổi tự học',
      description: task?.description ?? '',
      startsAt: req.startsAt,
      endsAt: req.endsAt,
      location: 'Thư viện AI Campus',
      priority: task?.priority ?? 'MEDIUM',
      status: 'SCHEDULED',
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: task?.id ?? null,
      fixed: false,
      locked: false,
      occurrenceId: createdId,
      seriesId: createdId,
      createdAt: now(),
      updatedAt: now(),
    };
    state.events.push(newEvent);
    if (task) {
      const dur = minutesBetween(req.startsAt, req.endsAt);
      task.remainingDurationMinutes = Math.max(0, task.remainingDurationMinutes - dur);
      if (task.remainingDurationMinutes === 0) task.status = 'COMPLETED';
    }
    data = newEvent;
    status = 201;
  } else if (schedulingRoute && method === 'GET' && route.endsWith('/academic-summary')) {
    data = {
      coursesCount: 4,
      tasksCount: state.tasks.filter((t) => t.status !== 'COMPLETED').length,
      deadlinesCount: state.tasks.filter((t) => t.deadline && t.status !== 'COMPLETED').length,
      freeTimeMinutes: 380,
      freeTimeFormatted: '6h 20m',
      ongoingEventTitle: 'Operating Systems',
      ongoingEventLocation: 'Room 204 · Tech Wing',
      ongoingEventTime: '09:00 - 10:30',
      nextEventTitle: 'Machine Learning',
      nextEventLocation: 'Lecture Hall A',
      nextEventTime: '13:00 - 16:00',
      nextEventCountdown: 'Còn 2h',
      upcomingDeadlines: [
        {
          taskId: 'task-ml',
          title: 'Machine Learning Assignment',
          deadline: getDemoDate(5, 23, 59),
          countdown: 'Due in 3 days',
          formattedDate: '26/09',
        },
        {
          taskId: 'task-rp',
          title: 'Research Proposal',
          deadline: getDemoDate(6, 23, 59),
          countdown: 'Due in 4 days',
          formattedDate: '27/09',
        },
      ],
    };
  }

  // Rescheduling & Optimization
  else if (scheduleId && route.includes(`/schedules/${scheduleId}/rescheduling`) && method === 'POST' && route.endsWith('/analyze')) {
    data = buildImpact(state, scheduleId, body as { from: string; to: string });
  } else if (scheduleId && route.includes(`/schedules/${scheduleId}/rescheduling`) && method === 'POST' && route.endsWith('/generate')) {
    // Check if there is a conflict to resolve (e.g. Operating Systems Review overlapping Project Meeting)
    const osReview = state.events.find((e) => e.title.includes('Operating Systems Review'));
    const conflictCandidate = osReview || state.events.find((e) => !e.fixed && !e.locked);

    const altSlotStart = getDemoDate(3, 19, 0); // Thursday 19:00
    const altSlotEnd = getDemoDate(3, 21, 0);   // Thursday 21:00

    const alternativeA: RescheduleAlternative = {
      id: 'alt-opt-a',
      score: 0.98,
      fingerprint: 'alt-fingerprint-a',
      movedSessions: 1,
      preservedSessions: state.events.length - 1,
      createdSessions: 0,
      removedSessions: 0,
      totalMovedMinutes: 120,
      maxDisplacementMinutes: 1440,
      deadlineMarginMinutes: 2880,
      changeCost: 1,
      reasonCodes: ['RESOLVE_HARD_CONFLICT', 'BALANCED_WORKLOAD'],
      slots: [
        {
          eventId: conflictCandidate?.id,
          taskId: 'demo-task-3',
          title: conflictCandidate?.title ?? 'Operating Systems Review',
          startsAt: altSlotStart,
          endsAt: altSlotEnd,
          score: 0.98,
        },
      ],
    };

    const alternativeB: RescheduleAlternative = {
      id: 'alt-opt-b',
      score: 0.92,
      fingerprint: 'alt-fingerprint-b',
      movedSessions: 1,
      preservedSessions: state.events.length - 1,
      createdSessions: 0,
      removedSessions: 0,
      totalMovedMinutes: 120,
      maxDisplacementMinutes: 2880,
      deadlineMarginMinutes: 1440,
      changeCost: 2,
      reasonCodes: ['RESOLVE_HARD_CONFLICT', 'WEEKEND_CAPACITY'],
      slots: [
        {
          eventId: conflictCandidate?.id,
          taskId: 'demo-task-3',
          title: conflictCandidate?.title ?? 'Operating Systems Review',
          startsAt: getDemoDate(5, 14, 0), // Saturday 14:00
          endsAt: getDemoDate(5, 16, 0),   // Saturday 16:00
          score: 0.92,
        },
      ],
    };

    const rescheduleResult: RescheduleResult = {
      status: 'FEASIBLE',
      impact: {
        affectedSessions: 1,
        preservedSessions: Math.max(0, state.events.length - 1),
        movedMinutes: 120,
      },
      alternatives: [alternativeA, alternativeB],
      fingerprint: 'reschedule-plan-fingerprint',
      generatedAt: now(),
    };
    data = rescheduleResult;
  } else if (scheduleId && (route === `/schedules/${scheduleId}/what-if` || route.endsWith('/what-if')) && method === 'POST') {
    const impact = buildImpact(state, scheduleId, body as { from: string; to: string });
    data = { current: impact, simulated: impact, alternatives: [], fingerprint: impact.fingerprint } satisfies WhatIfResult;
  } else if (scheduleId && route.includes(`/schedules/${scheduleId}/rescheduling`) && method === 'POST' && route.endsWith('/apply')) {
    const alt = body as RescheduleAlternative;
    for (const slot of alt.slots ?? []) {
      const match = state.events.find((e) => (slot.eventId && e.id === slot.eventId) || e.title.includes(slot.title));
      if (match) {
        match.startsAt = slot.startsAt;
        match.endsAt = slot.endsAt;
        match.updatedAt = now();
      }
    }
    data = body;
  }

  // Events CRUD
  else if (method === 'GET' && scheduleId && route.endsWith('/events')) {
    data = state.events.filter((item) => item.scheduleId === scheduleId);
  } else if (method === 'POST' && scheduleId && route.endsWith('/events')) {
    const created = now();
    const newEvent: EventItem = {
      ...body,
      id: id('event'),
      scheduleId,
      userId: DEMO_USER_ID,
      workspaceId: scheduleId,
      categoryId: body.categoryId ?? null,
      description: body.description ?? null,
      location: body.location ?? null,
      locationId: body.locationId ?? null,
      locationRef: resolveLocationRef(body.locationId, body.location),
      notes: body.notes ?? null,
      recurrenceRule: null,
      occurrenceId: '',
      seriesId: '',
      createdAt: created,
      updatedAt: created,
    } as EventItem;
    newEvent.occurrenceId = newEvent.id;
    newEvent.seriesId = newEvent.id;
    state.events.push(newEvent);
    data = newEvent;
    status = 201;
  } else if (method === 'GET' && eventId) {
    data = state.events.find((item) => item.id === eventId);
  } else if (method === 'PUT' && eventId) {
    const item = state.events.find((entry) => entry.id === eventId || entry.occurrenceId === eventId);
    if (item) {
      Object.assign(item, body, {
        updatedAt: now(),
        locationRef: resolveLocationRef(body.locationId ?? item.locationId, body.location ?? item.location),
      });
      data = item;
    }
  } else if (method === 'DELETE' && eventId) {
    const toRemove = state.events.find((item) => item.id === eventId);
    if (toRemove && (toRemove.sourceTaskId || toRemove.taskId)) {
      const tid = toRemove.sourceTaskId || toRemove.taskId;
      const task = state.tasks.find((t) => t.id === tid);
      if (task) {
        const dur = Math.round((new Date(toRemove.endsAt).getTime() - new Date(toRemove.startsAt).getTime()) / 60000);
        task.remainingDurationMinutes = Math.min(task.estimatedDurationMinutes, task.remainingDurationMinutes + dur);
        if (task.status === 'COMPLETED' && task.remainingDurationMinutes > 0) {
          task.status = 'IN_PROGRESS';
        }
      }
    }
    state.events = state.events.filter((item) => item.id !== eventId && item.seriesId !== eventId);
  } else if (method === 'POST' && eventId && route.endsWith('/duplicate')) {
    const source = state.events.find((item) => item.id === eventId);
    if (source) {
      const copy: EventItem = {
        ...source,
        id: id('event'),
        title: `${source.title} (copy)`,
        createdAt: now(),
        updatedAt: now(),
        occurrenceId: '',
        seriesId: '',
      };
      copy.occurrenceId = copy.id;
      copy.seriesId = copy.id;
      state.events.push(copy);
      data = copy;
      status = 201;
    }
  }

  // Tasks CRUD
  else if (method === 'GET' && scheduleId && route.endsWith('/tasks')) {
    const content = state.tasks.filter((item) => item.scheduleId === scheduleId);
    data = { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 } satisfies PageResponse<Task>;
  } else if (method === 'POST' && scheduleId && route.endsWith('/tasks')) {
    const created = now();
    const newTask: Task = {
      ...body,
      id: id('task'),
      scheduleId,
      ownerId: DEMO_USER_ID,
      userId: DEMO_USER_ID,
      workspaceId: scheduleId,
      categoryId: body.categoryId ?? null,
      createdAt: created,
      updatedAt: created,
    } as Task;
    state.tasks.push(newTask);
    data = newTask;
    status = 201;
  } else if (method === 'PUT' && taskId) {
    const item = state.tasks.find((entry) => entry.id === taskId);
    if (item) Object.assign(item, body, { updatedAt: now() });
    data = item;
  } else if (method === 'DELETE' && taskId) {
    state.tasks = state.tasks.filter((item) => item.id !== taskId);
  }

  // Categories CRUD
  else if (method === 'GET' && route === '/categories') {
    data = state.categories;
  } else if (method === 'POST' && route === '/categories') {
    const created = now();
    const newCat: Category = {
      ...body,
      id: id('category'),
      ownerId: DEMO_USER_ID,
      userId: DEMO_USER_ID,
      workspaceId: scheduleId || DEMO_SCHEDULE_ID,
      icon: body.icon ?? null,
      createdAt: created,
      updatedAt: created,
    } as Category;
    state.categories.push(newCat);
    data = newCat;
    status = 201;
  } else if (method === 'PUT' && route.startsWith('/categories/')) {
    const catId = route.split('/').pop();
    const item = state.categories.find((c) => c.id === catId);
    if (item) {
      Object.assign(item, body, { updatedAt: now() });
      data = item;
    }
  } else if (method === 'DELETE' && route.startsWith('/categories/')) {
    const catId = route.split('/').pop();
    state.categories = state.categories.filter((c) => c.id !== catId);
  }

  // Availability CRUD
  else if (method === 'GET' && scheduleId && route.endsWith('/availability')) {
    data = state.availability.filter((item) => item.scheduleId === scheduleId);
  } else if (method === 'POST' && scheduleId && route.endsWith('/availability')) {
    const created = now();
    const item: Availability = {
      ...body,
      id: id('availability'),
      scheduleId,
      userId: DEMO_USER_ID,
      workspaceId: scheduleId,
      createdAt: created,
      updatedAt: created,
    } as Availability;
    state.availability.push(item);
    data = item;
    status = 201;
  } else if (method === 'PUT' && scheduleId && route.includes('/availability/')) {
    const availId = route.split('/').pop();
    const item = state.availability.find((entry) => entry.id === availId);
    if (item) Object.assign(item, body, { updatedAt: now() });
    data = item;
  } else if (method === 'DELETE' && scheduleId && route.includes('/availability/')) {
    const availId = route.split('/').pop();
    state.availability = state.availability.filter((item) => item.id !== availId);
  }

  // Collaboration & Share Links
  else if (method === 'GET' && scheduleId && route.endsWith('/share-links')) {
    data = state.shareLinks;
  } else if (method === 'POST' && scheduleId && route.endsWith('/share-links')) {
    const created = now();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const newLink: ShareLink = {
      id: id('share-link'),
      mode: 'VIEW_ONLY',
      expiresAt: body.expiresAt ?? null,
      revokedAt: null,
      createdAt: created,
      url: `${origin}/demo/share/smart-schedule-demo`,
    };
    state.shareLinks.unshift(newLink);
    data = newLink;
    status = 201;
  } else if (method === 'DELETE' && scheduleId && route.includes('/share-links/')) {
    const linkId = route.split('/').pop();
    const target = state.shareLinks.find((l) => l.id === linkId);
    if (target) target.revokedAt = now();
    data = target;
  } else if (method === 'GET' && scheduleId && route.endsWith('/members')) {
    const members: ScheduleMember[] = [
      {
        userId: DEMO_USER_ID,
        email: 'alex.nguyen@university.edu.vn',
        displayName: 'Alex Nguyen',
        role: 'OWNER',
        createdAt: state.schedules[0]?.createdAt ?? now(),
      },
    ];
    data = members;
  } else if (method === 'GET' && scheduleId && route.endsWith('/team-availability')) {
    const team: TeamAvailabilityResponse = {
      from: getDemoDate(0, 0, 0),
      to: getDemoDate(7, 0, 0),
      totalMembers: 1,
      slots: [
        { start: getDemoDate(0, 18, 0), end: getDemoDate(0, 22, 0), availableMembers: 1, totalMembers: 1 },
        { start: getDemoDate(1, 17, 0), end: getDemoDate(1, 22, 0), availableMembers: 1, totalMembers: 1 },
        { start: getDemoDate(2, 18, 0), end: getDemoDate(2, 22, 0), availableMembers: 1, totalMembers: 1 },
      ],
    };
    data = team;
  } else if (method === 'GET' && scheduleId && route.endsWith('/activity')) {
    const activity: ActivityItem[] = [
      { id: 'act-1', action: 'WORKSPACE_INITIALIZED', actorName: 'Alex Nguyen', createdAt: now() },
    ];
    data = activity;
  }

  // Public shared schedule endpoint
  else if (method === 'GET' && route.startsWith('/shared/')) {
    const categoryMap = new Map(state.categories.map((c) => [c.id, c.color]));
    const publicEvents = state.events
      .filter((e) => e.scheduleId === DEMO_SCHEDULE_ID)
      .map((e) => ({
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        location: e.location,
        color: e.categoryId ? (categoryMap.get(e.categoryId) ?? '#2563eb') : '#2563eb',
      }))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const publicSchedule: PublicSchedule = {
      name: 'Alex Nguyen — Academic Schedule',
      timezone: 'Asia/Ho_Chi_Minh',
      events: publicEvents,
    };
    data = publicSchedule;
  }

  // Notifications
  else if (method === 'GET' && route === '/notifications') {
    const unread = String((config.params as any)?.unreadOnly) === 'true';
    const content = state.notifications.filter((item) => !unread || !item.readAt);
    data = { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1 };
  } else if (method === 'POST' && route.endsWith('/read-all')) {
    state.notifications.forEach((item) => {
      item.readAt = now();
    });
  } else if (method === 'POST' && route.match(/^\/notifications\/[^/]+\/read$/)) {
    const item = state.notifications.find((entry) => route.includes(entry.id));
    if (item) item.readAt = now();
  }

  save(state);
  return response(config, data, status);
};

export function exportDemoLog() {
  const state = load();
  const blob = new Blob([JSON.stringify(state.log, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `smartschedule-demo-log-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
