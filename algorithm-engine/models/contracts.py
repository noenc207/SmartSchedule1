"""
Canonical data contracts for the SmartSchedule Advanced Algorithm Engine.
All inputs, outputs, enums, and explanation metadata are strictly typed with Pydantic.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Intensity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class UnscheduledReason(str, Enum):
    NO_AVAILABLE_SLOT = "NO_AVAILABLE_SLOT"
    DEADLINE_INFEASIBLE = "DEADLINE_INFEASIBLE"
    INSUFFICIENT_CAPACITY = "INSUFFICIENT_CAPACITY"
    CONSTRAINT_CONFLICT = "CONSTRAINT_CONFLICT"
    SESSION_TOO_SHORT = "SESSION_TOO_SHORT"
    MAX_DAILY_LOAD_EXCEEDED = "MAX_DAILY_LOAD_EXCEEDED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    TIGHT = "TIGHT"
    HIGH = "HIGH"


class MobilityFindingType(str, Enum):
    ZIG_ZAG_ROUTE = "ZIG_ZAG_ROUTE"
    DOMINO_TRANSITION_RISK = "DOMINO_TRANSITION_RISK"
    TRAVEL_HEAVY_SESSION = "TRAVEL_HEAVY_SESSION"


class WhatIfStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    PARTIAL = "PARTIAL"
    INFEASIBLE = "INFEASIBLE"


class MutationType(str, Enum):
    EVENT_ADDED = "EVENT_ADDED"
    EVENT_MOVED = "EVENT_MOVED"
    EVENT_RESIZED = "EVENT_RESIZED"
    EVENT_CANCELLED = "EVENT_CANCELLED"
    AVAILABILITY_CHANGED = "AVAILABILITY_CHANGED"
    TASK_DEADLINE_CHANGED = "TASK_DEADLINE_CHANGED"
    TASK_DURATION_CHANGED = "TASK_DURATION_CHANGED"
    TASK_CANCELLED = "TASK_CANCELLED"


# --- Input DTOs ---

class TaskInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    remainingMinutes: int = Field(ge=0, description="Authoritative remaining minutes calculated by Spring Boot")
    estimatedMinutes: int = Field(gt=0)
    priority: str = "MEDIUM"
    deadline: Optional[datetime] = None
    categoryId: Optional[str] = None
    preferredStartTime: Optional[str] = None  # "HH:MM"
    preferredEndTime: Optional[str] = None    # "HH:MM"
    minimumSessionMinutes: int = 30
    maximumSessionMinutes: int = 120
    allowSplitting: bool = True
    location: Optional[str] = None
    locationId: Optional[str] = None
    intensity: str = "MEDIUM"  # "HIGH" for Research, Coding, Exam; "MEDIUM" default


class ExistingEventInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    startsAt: datetime
    endsAt: datetime
    fixed: bool = True
    locked: bool = True
    location: Optional[str] = None
    locationId: Optional[str] = None
    categoryId: Optional[str] = None
    taskId: Optional[str] = None
    sourceTaskId: Optional[str] = None


class AvailabilityWindowInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    dayOfWeek: int = Field(ge=1, le=7, description="1=Monday, 7=Sunday")
    startTime: str = "08:00:00"  # "HH:MM:SS"
    endTime: str = "20:00:00"
    enabled: bool = True


class SchedulingPreferencesInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    maxDailyMinutes: int = 360
    minBreakMinutes: int = 15
    preferredStart: Optional[str] = "08:00"
    preferredEnd: Optional[str] = "20:00"
    workloadBalanceWeight: float = 1.0
    deadlineWeight: float = 2.0
    priorityWeight: float = 1.5
    preferenceWeight: float = 1.0
    maxConsecutiveIntensiveMinutes: int = 120


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scheduleId: str
    algorithmVersion: str = "1.0.0"
    fromTime: datetime = Field(alias="from")
    toTime: datetime = Field(alias="to")
    timezone: str = "Asia/Ho_Chi_Minh"
    tasks: List[TaskInput] = []
    existingEvents: List[ExistingEventInput] = []
    availabilityWindows: List[AvailabilityWindowInput] = []
    preferences: SchedulingPreferencesInput = Field(default_factory=SchedulingPreferencesInput)
    travelMatrix: Dict[str, int] = Field(default_factory=dict, description="Travel estimates between locations in minutes")
    granularityMinutes: int = 15
    scheduleVersion: Optional[int] = None


# --- Output DTOs ---

class ProposedSlot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    taskId: str
    title: str
    categoryId: Optional[str] = None
    startsAt: str  # ISO-8601 UTC
    endsAt: str    # ISO-8601 UTC
    score: int = 100
    sessionIndex: int = 1
    sessionCount: int = 1
    location: Optional[str] = None
    locationId: Optional[str] = None
    reasons: List[str] = []


class UnscheduledItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    taskId: str
    taskTitle: str
    reason: str
    requiredMinutes: int
    availableMinutes: int
    deficitMinutes: int
    message: str


class DeadlineRiskItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    taskId: str
    taskTitle: str
    deadline: str
    requiredMinutes: int
    availableMinutes: int
    level: str  # "HIGH", "TIGHT", "LOW"
    message: str


class MobilityFinding(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str  # ZIG_ZAG_ROUTE | DOMINO_TRANSITION_RISK | TRAVEL_HEAVY_SESSION
    severity: str = "WARNING"  # INFO | WARNING | CRITICAL
    affectedEventIds: List[str] = []
    affectedLocations: List[str] = []
    transitionCount: Optional[int] = None
    travelMinutes: Optional[int] = None
    sessionMinutes: Optional[int] = None
    ratio: Optional[float] = None
    explanation: str = ""


class OptimizationSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plannedMinutes: int
    remainingMinutes: int
    hardConflicts: int = 0
    deadlineRisks: int = 0
    computationDurationMs: int = 0


class OptimizeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    planId: str
    scheduleId: str
    fingerprint: str
    algorithmVersion: str = "1.0.0"
    scheduleVersion: Optional[int] = None
    fromTime: str
    toTime: str
    slots: List[ProposedSlot] = []
    unscheduled: List[UnscheduledItem] = []
    deadlineRisks: List[DeadlineRiskItem] = []
    mobilityFindings: List[MobilityFinding] = []
    summary: OptimizationSummary


# --- What-If Simulation DTOs ---

class WhatIfMutation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    changeType: str
    targetEventId: Optional[str] = None
    targetTaskId: Optional[str] = None
    newStartsAt: Optional[datetime] = None
    newEndsAt: Optional[datetime] = None
    newDeadline: Optional[datetime] = None
    newDurationMinutes: Optional[int] = None
    newLocation: Optional[str] = None
    newLocationId: Optional[str] = None


class WhatIfRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scheduleId: str
    mutation: WhatIfMutation
    events: List[ExistingEventInput] = []
    tasks: List[TaskInput] = []
    availabilityWindows: List[AvailabilityWindowInput] = []
    travelMatrix: Dict[str, int] = Field(default_factory=dict)
    preferences: SchedulingPreferencesInput = Field(default_factory=SchedulingPreferencesInput)


class WhatIfAlternativeSlot(BaseModel):
    eventId: Optional[str] = None
    taskId: Optional[str] = None
    title: str
    startsAt: str
    endsAt: str
    score: int = 90


class WhatIfAlternative(BaseModel):
    id: str
    score: float
    fingerprint: str
    movedSessions: int
    preservedSessions: int
    createdSessions: int
    removedSessions: int
    totalMovedMinutes: int
    reasonCodes: List[str] = []
    slots: List[WhatIfAlternativeSlot] = []


class WhatIfImpact(BaseModel):
    conflicts: List[Dict[str, Any]] = []
    affectedTasks: List[Dict[str, Any]] = []
    affectedSessions: List[Dict[str, Any]] = []
    unaffectedSessions: List[Dict[str, Any]] = []
    lostCapacityMinutes: int = 0
    travelDeltaMinutes: int = 0
    summary: str = ""


class WhatIfResponse(BaseModel):
    status: str  # FEASIBLE | PARTIAL | INFEASIBLE
    fingerprint: str
    impact: WhatIfImpact
    alternatives: List[WhatIfAlternative] = []


# --- Mobility Analysis DTOs ---

class AnalyzeMobilityRequest(BaseModel):
    events: List[ExistingEventInput]
    travelMatrix: Dict[str, int] = Field(default_factory=dict)
    minTransitionBufferMinutes: int = 10


class AnalyzeMobilityResponse(BaseModel):
    findings: List[MobilityFinding]
    totalTravelMinutes: int
    transitionCount: int
    routeEfficiencyScore: float
