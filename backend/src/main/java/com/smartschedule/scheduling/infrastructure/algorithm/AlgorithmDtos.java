package com.smartschedule.scheduling.infrastructure.algorithm;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.*;

public final class AlgorithmDtos {
    private AlgorithmDtos() {}

    public record TaskInput(
            String id,
            String title,
            int remainingMinutes,
            int estimatedMinutes,
            String priority,
            Instant deadline,
            String categoryId,
            String preferredStartTime,
            String preferredEndTime,
            int minimumSessionMinutes,
            int maximumSessionMinutes,
            boolean allowSplitting,
            String location,
            String locationId,
            String intensity
    ) {}

    public record ExistingEventInput(
            String id,
            String title,
            Instant startsAt,
            Instant endsAt,
            boolean fixed,
            boolean locked,
            String location,
            String locationId,
            String categoryId,
            String taskId,
            String sourceTaskId
    ) {}

    public record AvailabilityWindowInput(
            int dayOfWeek,
            String startTime,
            String endTime,
            boolean enabled
    ) {}

    public record SchedulingPreferencesInput(
            int maxDailyMinutes,
            int minBreakMinutes,
            String preferredStart,
            String preferredEnd,
            double workloadBalanceWeight,
            double deadlineWeight,
            double priorityWeight,
            double preferenceWeight,
            int maxConsecutiveIntensiveMinutes
    ) {}

    public record OptimizeRequest(
            String scheduleId,
            String algorithmVersion,
            @JsonProperty("from") Instant from,
            @JsonProperty("to") Instant to,
            String timezone,
            List<TaskInput> tasks,
            List<ExistingEventInput> existingEvents,
            List<AvailabilityWindowInput> availabilityWindows,
            SchedulingPreferencesInput preferences,
            Map<String, Integer> travelMatrix,
            int granularityMinutes,
            Long scheduleVersion
    ) {}

    public record ProposedSlot(
            String taskId,
            String title,
            String categoryId,
            String startsAt,
            String endsAt,
            int score,
            int sessionIndex,
            int sessionCount,
            String location,
            String locationId,
            List<String> reasons
    ) {}

    public record UnscheduledItem(
            String taskId,
            String taskTitle,
            String reason,
            int requiredMinutes,
            int availableMinutes,
            int deficitMinutes,
            String message
    ) {}

    public record DeadlineRiskItem(
            String taskId,
            String taskTitle,
            String deadline,
            int requiredMinutes,
            int availableMinutes,
            String level,
            String message
    ) {}

    public record MobilityFinding(
            String type,
            String severity,
            List<String> affectedEventIds,
            List<String> affectedLocations,
            Integer transitionCount,
            Integer travelMinutes,
            Integer sessionMinutes,
            Double ratio,
            String explanation
    ) {}

    public record OptimizationSummary(
            int plannedMinutes,
            int remainingMinutes,
            int hardConflicts,
            int deadlineRisks,
            int computationDurationMs
    ) {}

    public record OptimizeResponse(
            String planId,
            String scheduleId,
            String fingerprint,
            String algorithmVersion,
            Long scheduleVersion,
            String fromTime,
            String toTime,
            List<ProposedSlot> slots,
            List<UnscheduledItem> unscheduled,
            List<DeadlineRiskItem> deadlineRisks,
            List<MobilityFinding> mobilityFindings,
            OptimizationSummary summary
    ) {}

    // What-If Models
    public record WhatIfMutation(
            String changeType,
            String targetEventId,
            String targetTaskId,
            Instant newStartsAt,
            Instant newEndsAt,
            Instant newDeadline,
            Integer newDurationMinutes,
            String newLocation,
            String newLocationId
    ) {}

    public record WhatIfRequest(
            String scheduleId,
            WhatIfMutation mutation,
            List<ExistingEventInput> events,
            List<TaskInput> tasks,
            List<AvailabilityWindowInput> availabilityWindows,
            Map<String, Integer> travelMatrix,
            SchedulingPreferencesInput preferences
    ) {}

    public record WhatIfAlternativeSlot(
            String eventId,
            String taskId,
            String title,
            String startsAt,
            String endsAt,
            int score
    ) {}

    public record WhatIfAlternative(
            String id,
            double score,
            String fingerprint,
            int movedSessions,
            int preservedSessions,
            int createdSessions,
            int removedSessions,
            int totalMovedMinutes,
            List<String> reasonCodes,
            List<WhatIfAlternativeSlot> slots
    ) {}

    public record WhatIfImpact(
            List<Map<String, Object>> conflicts,
            List<Map<String, Object>> affectedTasks,
            List<Map<String, Object>> affectedSessions,
            List<Map<String, Object>> unaffectedSessions,
            int lostCapacityMinutes,
            int travelDeltaMinutes,
            String summary
    ) {}

    public record WhatIfResponse(
            String status,
            String fingerprint,
            WhatIfImpact impact,
            List<WhatIfAlternative> alternatives
    ) {}

    // Mobility Models
    public record AnalyzeMobilityRequest(
            List<ExistingEventInput> events,
            Map<String, Integer> travelMatrix,
            int minTransitionBufferMinutes
    ) {}

    public record AnalyzeMobilityResponse(
            List<MobilityFinding> findings,
            int totalTravelMinutes,
            int transitionCount,
            double routeEfficiencyScore
    ) {}
}
