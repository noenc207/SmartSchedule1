package com.smartschedule.event.api;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

public final class EventDtos {
    private EventDtos() {}
    public record RecurrenceRule(String frequency, Integer interval, List<Integer> byWeekdays,
                                 Instant until, Integer count) {}
    public record EventRequest(@NotBlank @Size(max = 200) String title, @Size(max = 10000) String description,
                               @NotNull Instant startsAt, @NotNull Instant endsAt, @Size(max = 255) String location,
                               UUID categoryId,
                               @com.fasterxml.jackson.annotation.JsonAlias({"taskId", "sourceTaskId"}) UUID sourceTaskId,
                               String priority, String status, RecurrenceRule recurrence,
                               @Min(0) Integer reminderMinutes, String notes, Boolean fixed, Boolean locked) {
        public EventRequest(String title, String description, Instant startsAt, Instant endsAt, String location,
                            UUID categoryId, String priority, String status, RecurrenceRule recurrence,
                            Integer reminderMinutes, String notes, Boolean fixed, Boolean locked) {
            this(title, description, startsAt, endsAt, location, categoryId, null, priority, status, recurrence,
                    reminderMinutes, notes, fixed, locked);
        }
    }
    public record OccurrenceExceptionRequest(@NotNull Instant occurrenceStart, @NotBlank String action,
                                             Instant overrideStart, Instant overrideEnd,
                                             String overrideTitle, String overrideLocation, String overrideNotes) {}
    public record EventResponse(UUID id, UUID scheduleId, UUID categoryId, UUID sourceTaskId, String title, String description,
                                Instant startsAt, Instant endsAt, String location, String priority, String status,
                                String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked,
                                Instant createdAt, Instant updatedAt, String occurrenceId, String seriesId) {
        @com.fasterxml.jackson.annotation.JsonProperty("taskId")
        public UUID taskId() {
            return sourceTaskId;
        }
    }
    public record ConflictItem(String eventId, String title, long overlapMinutes) {}
    public record ConflictCheckResponse(boolean hasConflict, List<ConflictItem> conflicts) {}
    public enum ConflictSeverity { INFO, WARNING, ERROR }
    public enum ConflictType { EVENT_OVERLAP, AVAILABILITY_VIOLATION, DEADLINE_INFEASIBLE, OVERLOADED_DAY }
    public record ConflictFinding(String type, ConflictSeverity severity, String title, String description,
                                  Instant startsAt, Instant endsAt, String relatedId, String relatedTitle,
                                  long minutes) {}
    public record ConflictAnalysisResponse(Instant from, Instant to, List<ConflictFinding> conflicts,
                                           int errorCount, int warningCount, int infoCount) {}
}
