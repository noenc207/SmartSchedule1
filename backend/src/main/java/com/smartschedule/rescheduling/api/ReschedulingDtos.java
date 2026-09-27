package com.smartschedule.rescheduling.api;

import com.smartschedule.event.api.EventDtos;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ReschedulingDtos {
    private ReschedulingDtos() {}

    public enum ChangeType { EVENT_ADDED, EVENT_MOVED, EVENT_RESIZED, EVENT_CANCELLED, AVAILABILITY_CHANGED,
        TASK_DEADLINE_CHANGED, TASK_DURATION_CHANGED, TASK_CANCELLED }

    public record ReschedulingRequest(ChangeType changeType, UUID eventId, UUID taskId,
                                     @NotNull Instant from, @NotNull Instant to) {}

    public record ImpactItem(UUID id, String title, UUID taskId, String classification,
                            Instant startsAt, Instant endsAt, int minutes) {}

    public record RescheduleImpact(List<ImpactItem> affectedTasks, List<ImpactItem> affectedSessions,
                                   List<ImpactItem> unaffectedSessions, List<EventDtos.ConflictFinding> introducedConflicts,
                                   long lostCapacityMinutes, String impactSummary, String fingerprint) {}

    public record RescheduleSlot(UUID eventId, UUID taskId, String title, Instant startsAt, Instant endsAt, int score) {}

    public record RescheduleAlternative(String id, int score, String fingerprint, int movedSessions,
                                        int preservedSessions, int createdSessions, int removedSessions,
                                        long totalMovedMinutes, long maxDisplacementMinutes, long deadlineMarginMinutes,
                                        long changeCost, List<String> reasonCodes, List<RescheduleSlot> slots) {}

    public record RescheduleMetrics(int affectedSessions, int preservedSessions, long movedMinutes) {}

    public record RescheduleResult(String status, RescheduleMetrics impact, List<RescheduleAlternative> alternatives,
                                   String fingerprint, Instant generatedAt) {}

    public record WhatIfResult(RescheduleImpact current, RescheduleImpact simulated,
                               List<RescheduleAlternative> alternatives, String fingerprint) {}
}
