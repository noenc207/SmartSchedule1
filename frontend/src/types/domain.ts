export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ScheduleSummary = { id: string; name: string; timezone: string; visibility: 'PRIVATE' | 'PUBLIC' | 'SHARED'; role?: MemberRole; owned?: boolean; version?: number; userId?: string; workspaceId?: string };
export type Schedule = ScheduleSummary & { ownerId: string; description: string | null; createdAt: string; updatedAt: string; userId?: string; workspaceId?: string };
export type Category = { id: string; ownerId: string; name: string; color: string; icon: string | null; createdAt: string; updatedAt: string; userId?: string; workspaceId?: string };
export type RecurrenceRule = { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; interval: number; byWeekdays: number[]; until: string | null; count: number | null };

export type LocationType = 'ONLINE' | 'CAMPUS' | 'EXTERNAL' | 'TBD' | 'HOME' | 'OFFICE' | 'CAFE' | 'CUSTOM';
export type UserLocationCategory = 'HOME' | 'OFFICE' | 'CAFE' | 'CAMPUS' | 'GYM' | 'ONLINE' | 'CUSTOM' | 'TBD';

export interface UserLocation {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  category: UserLocationCategory;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  building?: string | null;
  room?: string | null;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LocationRef = {
  id: string;
  name: string;
  type: LocationType;
  category?: UserLocationCategory;
  address?: string | null;
  building?: string | null;
  room?: string | null;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  campusId?: string;
  userId?: string;
  workspaceId?: string;
};

export type TravelEstimate = {
  fromLocationId: string;
  toLocationId: string;
  durationMinutes: number;
  distanceMeters?: number;
  mode: 'WALK' | 'DRIVE';
  source: string;
  cached?: boolean;
};

export type MobilityFinding = {
  status: 'NORMAL' | 'MOBILITY_WARNING' | 'MOBILITY_CONFLICT';
  hasWarning: boolean;
  isHardConflict: boolean;
  isAcknowledged: boolean;
  fromTitle: string;
  toTitle: string;
  fromLocationName: string;
  toLocationName: string;
  travelMinutes: number;
  availableMinutes: number;
  bufferMinutes: number;
  signature: string;
  message: string;
};

export type EventItem = { id: string; scheduleId: string; categoryId: string | null; taskId?: string | null; sourceTaskId?: string | null; title: string; description: string | null; startsAt: string; endsAt: string; location: string | null; locationId?: string | null; locationRef?: LocationRef | null; priority: string; status: string; recurrenceRule: string | null; reminderMinutes: number | null; notes: string | null; fixed: boolean; locked: boolean; color?: string | null; createdAt: string; updatedAt: string; occurrenceId: string; seriesId: string; userId?: string; workspaceId?: string };
export type Task = { id: string; scheduleId: string; ownerId: string; categoryId: string | null; title: string; description: string | null; estimatedDurationMinutes: number; remainingDurationMinutes: number; priority: string; deadline: string | null; status: string; preferredStartTime: string | null; preferredEndTime: string | null; minimumSessionMinutes: number; maximumSessionMinutes: number; location?: string | null; locationId?: string | null; locationRef?: LocationRef | null; color?: string | null; createdAt: string; updatedAt: string; userId?: string; workspaceId?: string };

export type Availability = { id: string; scheduleId: string; dayOfWeek: number; startTime: string; endTime: string; enabled: boolean; createdAt: string; updatedAt: string; userId?: string; workspaceId?: string };
export type PageResponse<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };
export type ConflictSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type ConflictFinding = { type: 'EVENT_OVERLAP' | 'AVAILABILITY_VIOLATION' | 'DEADLINE_INFEASIBLE' | 'OVERLOADED_DAY'; severity: ConflictSeverity; title: string; description: string; startsAt: string; endsAt: string; relatedId: string | null; relatedTitle: string | null; minutes: number };
export type ConflictAnalysis = { from: string; to: string; conflicts: ConflictFinding[]; errorCount: number; warningCount: number; infoCount: number };
export type SchedulingPreferences = { maxDailyMinutes: number; minBreakMinutes: number; preferredStart: string | null; preferredEnd: string | null; maximumSessionMinutes: number; minimumSessionMinutes: number; workloadBalanceWeight: number; deadlineWeight: number; priorityWeight: number; preferenceWeight: number };
export type SchedulingRequest = { from: string; to: string; granularityMinutes?: number; taskIds?: string[]; splitTaskIds?: string[] };
export type SchedulePlanItem = { id: string; taskId: string; taskTitle: string; categoryId: string | null; start: string; end: string; durationMinutes: number; sessionIndex: number; sessionCount: number; reasons: string[] };
export type UnscheduledTask = { taskId: string; taskTitle: string; reason: 'NO_AVAILABLE_SLOT' | 'DEADLINE_PASSED' | 'INSUFFICIENT_CAPACITY' | 'CONSTRAINT_CONFLICT' | 'SESSION_TOO_SHORT' | 'SEARCH_LIMIT_REACHED'; requiredMinutes: number; availableMinutes: number; deficitMinutes: number; lastValidTime: string | null };
export type SchedulingSlot = {
  taskId: string;
  title: string;
  categoryId: string | null;
  startsAt: string;
  endsAt: string;
  score: number;
  sessionIndex?: number;
  sessionCount?: number;
  location?: string | null;
  locationId?: string | null;
  reasons?: string[];
};
export type SchedulingValidationRequest = { planId: string; fingerprint: string; slots: SchedulingSlot[]; scheduleVersion?: number | null };
export type ValidationResponse = { valid: boolean; fingerprint: string; errors: string[] };
export type SchedulingResult = {
  planId: string;
  scheduleId: string;
  fingerprint: string;
  from: string;
  to: string;
  scheduleVersion?: number;
  algorithmVersion?: string;
  slots: SchedulingSlot[];
  unscheduled?: Array<{ taskId: string; taskTitle: string; reason: string; requiredMinutes: number; availableMinutes: number; deficitMinutes: number; message: string }>;
  conflicts?: string[];
  deadlineRisks?: Array<{ taskId: string; taskTitle: string; deadline: string; requiredMinutes: number; availableMinutes: number; level: string; message: string }>;
  mobilityFindings?: Array<{
    type: string;
    severity: string;
    affectedEventIds: string[];
    affectedLocations: string[];
    transitionCount?: number;
    travelMinutes?: number;
    sessionMinutes?: number;
    ratio?: number;
    explanation: string;
  }>;
  summary?: { plannedMinutes: number; remainingMinutes: number; hardConflicts: number; deadlineRisks: number };
};
export type RescheduleChangeType = 'EVENT_ADDED' | 'EVENT_MOVED' | 'EVENT_RESIZED' | 'EVENT_CANCELLED' | 'AVAILABILITY_CHANGED' | 'TASK_DEADLINE_CHANGED' | 'TASK_DURATION_CHANGED' | 'TASK_CANCELLED';
export type ReschedulingRequest = { changeType: RescheduleChangeType; eventId?: string; taskId?: string; from: string; to: string };
export type ImpactItem = { id: string; title: string; taskId: string | null; classification: 'DIRECTLY_AFFECTED' | 'INDIRECTLY_AFFECTED' | 'UNAFFECTED'; startsAt: string | null; endsAt: string | null; minutes: number };
export type RescheduleImpact = { affectedTasks: ImpactItem[]; affectedSessions: ImpactItem[]; unaffectedSessions: ImpactItem[]; introducedConflicts: ConflictFinding[]; lostCapacityMinutes: number; impactSummary: string; fingerprint: string };
export type RescheduleAlternative = { id: string; score: number; fingerprint: string; movedSessions: number; preservedSessions: number; createdSessions: number; removedSessions: number; totalMovedMinutes: number; maxDisplacementMinutes: number; deadlineMarginMinutes: number; changeCost: number; reasonCodes: string[]; slots: Array<{ eventId?: string; taskId: string; title: string; startsAt: string; endsAt: string; score: number }> };
export type RescheduleResult = { status: 'FEASIBLE' | 'PARTIAL' | 'INFEASIBLE'; impact: { affectedSessions: number; preservedSessions: number; movedMinutes: number }; alternatives: RescheduleAlternative[]; fingerprint: string; generatedAt: string };
export type WhatIfResult = { current: RescheduleImpact; simulated: RescheduleImpact; alternatives: RescheduleAlternative[]; fingerprint: string };
export type ScheduleMember = { userId: string; email: string; displayName: string; role: MemberRole; createdAt: string };
export type TeamAvailabilitySlot = { start: string; end: string; availableMembers: number; totalMembers: number };
export type TeamAvailabilityResponse = { slots: TeamAvailabilitySlot[]; totalMembers: number; from: string; to: string };
export type ShareLink = { id: string; mode: 'VIEW_ONLY'; expiresAt: string | null; revokedAt: string | null; createdAt: string; url?: string };
export type PublicSchedule = { name: string; timezone: string; events: Array<{ title: string; startsAt: string; endsAt: string; location: string | null; color: string | null }> };
export type ActivityItem = { id: string; action: string; actorName: string | null; createdAt: string };
