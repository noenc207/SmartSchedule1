package com.smartschedule.calendar.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class CalendarInteropDtos {
    private CalendarInteropDtos() {}

    public record ImportEvent(@NotBlank String title, @NotNull Instant startsAt, @NotNull Instant endsAt,
                              String description, String location) {}

    public record ImportPreview(int total, int valid, int invalid, int conflicts,
                                List<ImportEvent> events, List<String> errors) {}

    public record ImportRequest(List<ImportEvent> events, boolean skipConflicts) {}
}
