package com.smartschedule.scheduling.api;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalTime;
import java.util.*;

public final class SchedulingDtos {
    private SchedulingDtos() {}
    public record GenerateRequest(@NotNull Instant from, @NotNull Instant to,
                                  @Min(1) @Max(1440) Integer granularityMinutes,
                                  List<UUID> taskIds, List<UUID> splitTaskIds) {
        public GenerateRequest(Instant from, Instant to, Integer granularityMinutes, List<UUID> taskIds) {
            this(from, to, granularityMinutes, taskIds, List.of());
        }
    }
    public record Slot(UUID taskId, String title, UUID categoryId, Instant startsAt, Instant endsAt, int score) {}
    public record Unscheduled(UUID taskId, String taskTitle, String reason, int requiredMinutes,
                              int availableMinutes, int deficitMinutes, String message) {}
    public record DeadlineRisk(UUID taskId, String taskTitle, Instant deadline, int requiredMinutes,
                               int availableMinutes, String level, String message) {}
    public record Summary(int plannedMinutes, int remainingMinutes, int hardConflicts, int deadlineRisks) {}
    public record Plan(UUID planId, UUID scheduleId, String fingerprint, Instant from, Instant to,
                       List<Slot> slots, Long scheduleVersion, List<Unscheduled> unscheduled,
                       List<String> conflicts, List<DeadlineRisk> deadlineRisks, Summary summary) {
        public Plan(UUID planId, UUID scheduleId, String fingerprint, Instant from, Instant to, List<Slot> slots) {
            this(planId, scheduleId, fingerprint, from, to, slots, null, List.of(), List.of(), List.of(), null);
        }
        public Plan(UUID planId, UUID scheduleId, String fingerprint, Instant from, Instant to,
                    List<Slot> slots, Long scheduleVersion) {
            this(planId, scheduleId, fingerprint, from, to, slots, scheduleVersion, List.of(), List.of(), List.of(), null);
        }
    }
    public record ApplyRequest(@NotNull UUID planId, @NotBlank String fingerprint, @NotNull List<Slot> slots,
                               Long scheduleVersion) {
        public ApplyRequest(UUID planId, String fingerprint, List<Slot> slots) {
            this(planId, fingerprint, slots, null);
        }
    }
    public record SchedulingValidationRequest(@NotNull UUID planId, @NotBlank String fingerprint, @NotNull List<Slot> slots,
                                              Long scheduleVersion) {}
    public record ValidationResponse(boolean valid, String fingerprint, List<String> errors) {}
    public record Preferences(Integer maxDailyMinutes, Integer minBreakMinutes, LocalTime preferredStart,
                              LocalTime preferredEnd, Integer maximumSessionMinutes, Integer minimumSessionMinutes,
                              Double workloadBalanceWeight, Double deadlineWeight, Double priorityWeight,
                              Double preferenceWeight) {}

    // AI Planner & Academic Intelligence DTOs
    public record FreeSlotDto(int dayOfWeek, String dayName, Instant startsAt, Instant endsAt, int durationMinutes, String durationFormatted) {}
    public record RecommendedTaskDto(UUID taskId, String title, int durationMinutes, String durationFormatted, String priority) {}
    public record AiPlannerRecommendationDto(FreeSlotDto freeSlot, List<RecommendedTaskDto> recommendedTasks, String message) {}
    public record ApplyQuickSlotRequest(@NotNull UUID taskId, @NotNull Instant startsAt, @NotNull Instant endsAt) {}
    public record DeadlineItemDto(UUID taskId, String title, Instant deadline, String countdown, String formattedDate) {}
    public record AcademicKpiSummaryDto(
        int coursesCount,
        int tasksCount,
        int deadlinesCount,
        int freeTimeMinutes,
        String freeTimeFormatted,
        String ongoingEventTitle,
        String ongoingEventLocation,
        String ongoingEventTime,
        String nextEventTitle,
        String nextEventLocation,
        String nextEventTime,
        String nextEventCountdown,
        List<DeadlineItemDto> upcomingDeadlines
    ) {}
}
