package com.smartschedule.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.RecurrenceRule;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecurrenceServiceTest {
    private final RecurrenceService recurrence = new RecurrenceService(new ObjectMapper());

    @Test
    void expandsWeeklyOccurrencesWithStableIds() {
        User user = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(user, "Personal", null, "UTC", "PRIVATE");
        Event event = new Event(schedule, null, "Study", null,
                Instant.parse("2026-09-21T08:00:00Z"), Instant.parse("2026-09-21T09:00:00Z"),
                null, "MEDIUM", "SCHEDULED", recurrence.serialize(
                        new RecurrenceRule("WEEKLY", 1, List.of(1, 3), null, null),
                        Instant.parse("2026-09-21T08:00:00Z")), null, null, true, false);

        var first = recurrence.expand(event, Instant.parse("2026-09-21T00:00:00Z"), Instant.parse("2026-09-28T00:00:00Z"));
        var second = recurrence.expand(event, Instant.parse("2026-09-21T00:00:00Z"), Instant.parse("2026-09-28T00:00:00Z"));

        assertThat(first).hasSize(2);
        assertThat(first.get(0).occurrenceId()).isEqualTo(second.get(0).occurrenceId());
    }

    @Test
    void rejectsWeeklyRuleWithoutWeekdays() {
        assertThatThrownBy(() -> recurrence.serialize(
                new RecurrenceRule("WEEKLY", 1, List.of(), null, null),
                Instant.parse("2026-09-21T08:00:00Z")))
                .isInstanceOf(DomainException.class);
    }
}
