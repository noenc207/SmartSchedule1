package com.smartschedule.scheduling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.rescheduling.api.ReschedulingDtos.*;
import com.smartschedule.rescheduling.application.ReschedulingService;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.scheduling.application.SchedulingService;
import com.smartschedule.scheduling.api.SchedulingDtos.Preferences;
import com.smartschedule.scheduling.domain.SchedulingPreferences;
import com.smartschedule.scheduling.infrastructure.SchedulingPreferencesRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class Phase6SchedulingTest {
    @Test
    void schedulingPreferencesArePersistedByDefault() {
        User user = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(user, "Test", "Desc", "UTC", "PRIVATE");
        UUID scheduleId = schedule.getId();

        SchedulingPreferencesRepository repo = mock(SchedulingPreferencesRepository.class);
        TaskRepository tasks = mock(TaskRepository.class);
        EventRepository events = mock(EventRepository.class);
        AvailabilityRepository availability = mock(AvailabilityRepository.class);
        RecurrenceService recurrence = new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper());
        AuthorizationService authorization = mock(AuthorizationService.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        ActivityLogService activity = mock(ActivityLogService.class);

        when(authorization.requireOwner(scheduleId, user.getId())).thenReturn(schedule);
        when(currentUser.requireUser()).thenReturn(user);
        when(repo.findByScheduleId(scheduleId)).thenReturn(Optional.empty());
        when(repo.save(any(SchedulingPreferences.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchedulingService service = new SchedulingService(tasks, events, availability, recurrence, authorization, currentUser, activity, repo);
        Preferences prefs = service.preferences(scheduleId);

        assertThat(prefs.maxDailyMinutes()).isEqualTo(480);
        assertThat(prefs.minimumSessionMinutes()).isEqualTo(30);
        verify(repo).save(any(SchedulingPreferences.class));
    }

    @Test
    void reschedulingAnalysisClassifiesAffectedAndUnaffectedGeneratedSessions() {
        User owner = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(owner, "Plan", "Desc", "UTC", "PRIVATE");
        UUID scheduleId = schedule.getId();

        Task affectedTask = new Task(schedule, owner, null, "Write", null, 120, 120, "HIGH", null, "ACTIVE",
                LocalTime.of(9, 0), LocalTime.of(12, 0), 30, 120);
        Task unaffectedTask = new Task(schedule, owner, null, "Review", null, 60, 60, "MEDIUM", null, "ACTIVE",
                LocalTime.of(14, 0), LocalTime.of(15, 0), 30, 60);

        Instant affectedStart = Instant.parse("2026-09-22T10:00:00Z");
        Instant affectedEnd = Instant.parse("2026-09-22T11:00:00Z");
        Instant unaffectedStart = Instant.parse("2026-09-23T09:00:00Z");
        Instant unaffectedEnd = Instant.parse("2026-09-23T10:00:00Z");

        Event affectedGenerated = new Event(schedule, null, "Write session", null, affectedStart, affectedEnd, null, "HIGH", "SCHEDULED",
                null, null, null, false, false, UUID.randomUUID(), affectedTask.getId());
        Event unaffectedGenerated = new Event(schedule, null, "Review session", null, unaffectedStart, unaffectedEnd, null, "MEDIUM", "SCHEDULED",
                null, null, null, false, false, UUID.randomUUID(), unaffectedTask.getId());

        Event fixed = new Event(schedule, null, "Customer call", null, affectedStart.plusSeconds(1800), affectedStart.plusSeconds(3600), null, "HIGH", "SCHEDULED",
                null, null, null, true, true);

        EventRepository events = mock(EventRepository.class);
        TaskRepository tasks = mock(TaskRepository.class);
        AvailabilityRepository availability = mock(AvailabilityRepository.class);
        AuthorizationService authorization = mock(AuthorizationService.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        ActivityLogService activity = mock(ActivityLogService.class);
        RecurrenceService recurrence = new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper());

        when(authorization.requireOwner(scheduleId, owner.getId())).thenReturn(schedule);
        when(authorization.requireEditor(scheduleId, owner.getId())).thenReturn(schedule);
        when(currentUser.requireUser()).thenReturn(owner);
        when(tasks.findAllByScheduleId(scheduleId)).thenReturn(List.of(affectedTask, unaffectedTask));
        when(events.findGeneratedByScheduleId(scheduleId)).thenReturn(List.of(affectedGenerated, unaffectedGenerated));
        when(events.findAllByScheduleId(scheduleId)).thenReturn(List.of(affectedGenerated, unaffectedGenerated, fixed));
        when(availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId)).thenReturn(List.of(
                new Availability(schedule, DayOfWeek.TUESDAY.getValue(), LocalTime.of(8, 0), LocalTime.of(18, 0), true)));

        ReschedulingService service = new ReschedulingService(events, tasks, availability, recurrence, authorization, currentUser, activity);
        RescheduleImpact impact = service.analyze(scheduleId, new ReschedulingRequest(ChangeType.EVENT_MOVED, affectedGenerated.getId(), null,
                affectedStart.minusSeconds(1800), affectedEnd.plusSeconds(1800)));

        assertThat(impact.affectedSessions()).hasSize(1);
        assertThat(impact.unaffectedSessions()).hasSize(1);
        assertThat(impact.affectedTasks()).extracting(ImpactItem::taskId).containsExactly(affectedTask.getId());

        RescheduleResult result = service.generate(scheduleId, new ReschedulingRequest(ChangeType.EVENT_MOVED, affectedGenerated.getId(), null,
                affectedStart.minusSeconds(1800), affectedEnd.plusSeconds(1800)));
        assertThat(result.alternatives()).hasSizeLessThanOrEqualTo(3);
        assertThat(result.alternatives()).isNotEmpty();
    }
}
