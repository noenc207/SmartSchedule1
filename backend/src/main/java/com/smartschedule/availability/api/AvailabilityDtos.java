package com.smartschedule.availability.api;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public final class AvailabilityDtos {
    private AvailabilityDtos() {}
    public record AvailabilityRequest(@Min(1) @Max(7) int dayOfWeek, @NotNull LocalTime startTime,
                                       @NotNull LocalTime endTime, boolean enabled) {}
    public record AvailabilityResponse(UUID id, UUID scheduleId, int dayOfWeek, LocalTime startTime,
                                       LocalTime endTime, boolean enabled, Instant createdAt, Instant updatedAt) {}
}
