package com.smartschedule.task.api;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public final class TaskDtos {
    private TaskDtos() {}
    public record TaskRequest(@NotBlank @Size(max = 200) String title, @Size(max = 10000) String description,
                              @Positive int estimatedDurationMinutes, @PositiveOrZero int remainingDurationMinutes,
                              String priority, Instant deadline, String status, UUID categoryId,
                              LocalTime preferredStartTime, LocalTime preferredEndTime,
                              @PositiveOrZero Integer minimumSessionMinutes, @PositiveOrZero Integer maximumSessionMinutes) {}
    public record TaskResponse(UUID id, UUID scheduleId, UUID ownerId, UUID categoryId, String title, String description,
                               int estimatedDurationMinutes, int remainingDurationMinutes, String priority, Instant deadline,
                               String status, LocalTime preferredStartTime, LocalTime preferredEndTime,
                               int minimumSessionMinutes, int maximumSessionMinutes, Instant createdAt, Instant updatedAt) {}
}
