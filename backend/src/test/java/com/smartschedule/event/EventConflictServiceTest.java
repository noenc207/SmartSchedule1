package com.smartschedule.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.event.application.EventConflictService;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class EventConflictServiceTest {
    @Test
    void boundaryTouchDoesNotConflict() {
        EventRepository repository = mock(EventRepository.class);
        AuthorizationService authorization = mock(AuthorizationService.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        User user = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(user, "Personal", null, "UTC", "PRIVATE");
        when(currentUser.requireUser()).thenReturn(user);
        when(repository.search(any(), any(), any(), isNull(), isNull(), isNull())).thenReturn(List.of());

        var service = new EventConflictService(repository, new RecurrenceService(new ObjectMapper()), authorization, currentUser);
        var result = service.check(schedule.getId(), Instant.parse("2026-09-21T10:00:00Z"), Instant.parse("2026-09-21T11:00:00Z"), null);

        assertThat(result.hasConflict()).isFalse();
    }
}
