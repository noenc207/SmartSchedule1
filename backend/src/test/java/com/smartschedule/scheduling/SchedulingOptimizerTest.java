package com.smartschedule.scheduling;

import com.smartschedule.scheduling.core.SchedulingOptimizer;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SchedulingOptimizerTest {
    @Test
    void schedulesDeterministicallyWithoutBusyOverlapAndHonorsPreferences() {
        UUID taskId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        var task = new SchedulingOptimizer.TaskSpec(taskId, "Write", 60, "HIGH", Instant.parse("2026-09-22T23:00:00Z"),
                LocalTime.of(10, 0), LocalTime.of(12, 0), 30, 60, null);
        var window = new SchedulingOptimizer.AvailabilityWindow(DayOfWeek.TUESDAY, LocalDate.of(2026, 9, 22),
                LocalTime.of(9, 0), LocalTime.of(13, 0));
        var busy = new SchedulingOptimizer.BusyInterval(Instant.parse("2026-09-22T10:00:00Z"), Instant.parse("2026-09-22T10:30:00Z"));
        var optimizer = new SchedulingOptimizer();
        var first = optimizer.optimize(Instant.parse("2026-09-22T00:00:00Z"), Instant.parse("2026-09-23T00:00:00Z"),
                ZoneOffset.UTC, List.of(task), List.of(window), List.of(busy));
        var second = optimizer.optimize(Instant.parse("2026-09-22T00:00:00Z"), Instant.parse("2026-09-23T00:00:00Z"),
                ZoneOffset.UTC, List.of(task), List.of(window), List.of(busy));
        assertThat(first).isEqualTo(second);
        assertThat(first).hasSize(1);
        assertThat(first.get(0).start()).isEqualTo(Instant.parse("2026-09-22T10:30:00Z"));
    }

    @Test
    void leavesTaskUnscheduledWhenNoHardConstraintSlotExists() {
        var task = new SchedulingOptimizer.TaskSpec(UUID.randomUUID(), "Task", 30, "MEDIUM", null,
                null, null, 30, 60, null);
        var optimizer = new SchedulingOptimizer();
        assertThat(optimizer.optimize(Instant.parse("2026-09-22T00:00:00Z"), Instant.parse("2026-09-23T00:00:00Z"),
                ZoneOffset.UTC, List.of(task), List.of(), List.of())).isEmpty();
    }
}
