package com.smartschedule.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.EventRequest;
import com.smartschedule.event.api.EventDtos.EventResponse;
import com.smartschedule.event.application.EventService;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

class EventTaskLinkTest {
    private EventRepository events;
    private CategoryRepository categories;
    private AuthorizationService authorization;
    private CurrentUserService currentUser;
    private ActivityLogService activity;
    private TaskRepository tasks;
    private EventService service;

    private User user;
    private Schedule schedule1;
    private Schedule schedule2;
    private Task task1;

    @BeforeEach
    void setUp() {
        events = mock(EventRepository.class);
        categories = mock(CategoryRepository.class);
        authorization = mock(AuthorizationService.class);
        currentUser = mock(CurrentUserService.class);
        activity = mock(ActivityLogService.class);
        tasks = mock(TaskRepository.class);

        service = new EventService(
                events, categories, authorization, currentUser, activity,
                new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper()),
                null, tasks
        );

        user = new User("tester@example.com", "hash", "Tester");
        schedule1 = new Schedule(user, "Schedule 1", null, "UTC", "PRIVATE");
        schedule2 = new Schedule(user, "Schedule 2", null, "UTC", "PRIVATE");

        when(currentUser.requireUser()).thenReturn(user);
        when(authorization.requireEditor(eq(schedule1.getId()), eq(user.getId()))).thenReturn(schedule1);
        when(authorization.requireEditor(eq(schedule2.getId()), eq(user.getId()))).thenReturn(schedule2);

        // Task with 120 estimated minutes in Schedule 1
        task1 = new Task(schedule1, user, null, "Complete Math Assignment", null,
                120, 120, "HIGH", null, "TODO", LocalTime.of(8, 0), LocalTime.of(22, 0), 30, 120);
        when(tasks.findById(task1.getId())).thenReturn(Optional.of(task1));
    }

    @Test
    void rejectsCrossScheduleTaskLink() {
        // Attempt to create event in Schedule 2 linked to Task in Schedule 1
        EventRequest request = new EventRequest(
                "Study Session", "description",
                Instant.parse("2026-09-24T08:00:00Z"), Instant.parse("2026-09-24T09:00:00Z"),
                null, null, task1.getId(), "HIGH", "SCHEDULED", null, null, null, true, true
        );

        assertThatThrownBy(() -> service.create(schedule2.getId(), request))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("must belong to the same schedule");
    }

    @Test
    void updatesTaskRemainingDurationWhenLinkedEventCreated() {
        Instant start = Instant.parse("2026-09-24T08:00:00Z");
        Instant end = Instant.parse("2026-09-24T09:30:00Z"); // 90 minutes
        Event savedEvent = new Event(schedule1, null, "Math Session 1", null, start, end,
                null, "HIGH", "SCHEDULED", null, 0, null, true, true, null, task1.getId());

        when(events.save(any(Event.class))).thenReturn(savedEvent);
        when(events.findAllBySourceTaskId(task1.getId())).thenReturn(List.of(savedEvent));

        EventRequest request = new EventRequest(
                "Math Session 1", null, start, end, null, null, task1.getId(),
                "HIGH", "SCHEDULED", null, null, null, true, true
        );

        EventResponse response = service.create(schedule1.getId(), request);

        assertThat(response.sourceTaskId()).isEqualTo(task1.getId());
        assertThat(response.taskId()).isEqualTo(task1.getId());

        // Initial 120 minutes - 90 scheduled minutes = 30 remaining minutes
        assertThat(task1.getRemainingMinutes()).isEqualTo(30);
        verify(tasks).save(task1);
    }

    @Test
    void taskRemainingCannotBeNegativeWhenOverScheduled() {
        Instant start = Instant.parse("2026-09-24T08:00:00Z");
        Instant end = Instant.parse("2026-09-24T11:00:00Z"); // 180 minutes (> 120 estimated)
        Event savedEvent = new Event(schedule1, null, "Long Session", null, start, end,
                null, "HIGH", "SCHEDULED", null, 0, null, true, true, null, task1.getId());

        when(events.save(any(Event.class))).thenReturn(savedEvent);
        when(events.findAllBySourceTaskId(task1.getId())).thenReturn(List.of(savedEvent));

        EventRequest request = new EventRequest(
                "Long Session", null, start, end, null, null, task1.getId(),
                "HIGH", "SCHEDULED", null, null, null, true, true
        );

        service.create(schedule1.getId(), request);

        // Invariant: remaining = max(0, estimated - scheduled)
        assertThat(task1.getRemainingMinutes()).isEqualTo(0);
    }
}
