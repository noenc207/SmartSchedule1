package com.smartschedule.event;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.EventRequest;
import com.smartschedule.event.application.EventService;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EventServiceTest {
    @Test
    void rejectsNonIncreasingEventRange() {
        EventRepository events = mock(EventRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        AuthorizationService authorization = mock(AuthorizationService.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        User user = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(user, "Work", null, "UTC", "PRIVATE");
        when(currentUser.requireUser()).thenReturn(user);
        when(authorization.requireOwner(schedule.getId(), user.getId())).thenReturn(schedule);

        EventService service = new EventService(events, categories, authorization, currentUser, mock(ActivityLogService.class));
        EventRequest request = new EventRequest("Invalid", null, Instant.parse("2026-09-21T10:00:00Z"),
                Instant.parse("2026-09-21T09:00:00Z"), null, null, "MEDIUM", "SCHEDULED", null, null, null, true, true);

        assertThatThrownBy(() -> service.create(schedule.getId(), request))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("before");
    }
}
