package com.smartschedule.scheduling;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.scheduling.api.SchedulingDtos.GenerateRequest;
import com.smartschedule.scheduling.application.SchedulingService;
import com.smartschedule.scheduling.infrastructure.SchedulingPreferencesRepository;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmClient;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.*;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AlgorithmGatingTest {
    private TaskRepository tasks;
    private EventRepository events;
    private AvailabilityRepository availability;
    private RecurrenceService recurrence;
    private AuthorizationService authorization;
    private CurrentUserService currentUser;
    private ActivityLogService activity;
    private SchedulingPreferencesRepository preferencesRepo;
    private AlgorithmClient algorithmClient;
    private SchedulingService service;

    private User freeUser;
    private User proUser;
    private Schedule schedule;

    @BeforeEach
    void setUp() {
        tasks = mock(TaskRepository.class);
        events = mock(EventRepository.class);
        availability = mock(AvailabilityRepository.class);
        recurrence = mock(RecurrenceService.class);
        authorization = mock(AuthorizationService.class);
        currentUser = mock(CurrentUserService.class);
        activity = mock(ActivityLogService.class);
        preferencesRepo = mock(SchedulingPreferencesRepository.class);
        algorithmClient = mock(AlgorithmClient.class);

        service = new SchedulingService(
                tasks, events, availability, recurrence, authorization,
                currentUser, activity, preferencesRepo, algorithmClient
        );

        freeUser = new User("free@example.com", "hash", "Free User");
        freeUser.setTier("FREE");

        proUser = new User("pro@example.com", "hash", "Pro User");
        proUser.setTier("PRO");

        schedule = new Schedule(proUser, "My Schedule", "Description", "UTC", "PRIVATE");
        when(authorization.requireEditor(any(), any())).thenReturn(schedule);
        when(preferencesRepo.findByScheduleId(any())).thenReturn(
                Optional.of(com.smartschedule.scheduling.domain.SchedulingPreferences.defaultPreferences(schedule))
        );
    }

    @Test
    void freeUser_invokingOptimizePro_throwsProRequiredWithExactVietnamesePrompt() {
        when(currentUser.requireUser()).thenReturn(freeUser);

        Instant now = Instant.now();
        GenerateRequest req = new GenerateRequest(now, now.plus(1, ChronoUnit.DAYS), 15, List.of());

        DomainException ex = assertThrows(DomainException.class, () ->
                service.optimizePro(schedule.getId(), req)
        );

        assertEquals("PRO_REQUIRED", ex.getCode());
        assertEquals(403, ex.getStatus());
        assertEquals("Tính năng này yêu cầu SmartSchedule Pro. [Đăng ký Pro] [Để sau]", ex.getMessage());

        // Zero calls made to algorithm engine
        verifyNoInteractions(algorithmClient);
    }

    @Test
    void proUser_invokingOptimizePro_callsAlgorithmClient() {
        when(currentUser.requireUser()).thenReturn(proUser);
        when(tasks.findAllByScheduleId(schedule.getId())).thenReturn(List.of());
        when(events.search(any(), any(), any(), any(), any(), any())).thenReturn(List.of());
        when(availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(any())).thenReturn(List.of());

        Instant now = Instant.now();
        Instant to = now.plus(1, ChronoUnit.DAYS);
        GenerateRequest req = new GenerateRequest(now, to, 15, List.of());

        OptimizeResponse mockResponse = new OptimizeResponse(
                "plan-1", schedule.getId().toString(), "fp-123", "1.0.0",
                schedule.getVersion(), now.toString(), to.toString(),
                List.of(), List.of(), List.of(), List.of(),
                new OptimizationSummary(0, 0, 0, 0, 10)
        );
        when(algorithmClient.optimize(any())).thenReturn(mockResponse);

        OptimizeResponse result = service.optimizePro(schedule.getId(), req);

        assertNotNull(result);
        assertEquals("plan-1", result.planId());
        verify(algorithmClient, times(1)).optimize(any());
    }

    @Test
    void proUser_whenAlgorithmEngineUnavailable_bubblesUp503() {
        when(currentUser.requireUser()).thenReturn(proUser);
        when(tasks.findAllByScheduleId(schedule.getId())).thenReturn(List.of());
        when(events.search(any(), any(), any(), any(), any(), any())).thenReturn(List.of());
        when(availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(any())).thenReturn(List.of());

        Instant now = Instant.now();
        GenerateRequest req = new GenerateRequest(now, now.plus(1, ChronoUnit.DAYS), 15, List.of());

        when(algorithmClient.optimize(any())).thenThrow(
                new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503, "Dịch vụ tối ưu hoá thuật toán nâng cao tạm thời không khả dụng.")
        );

        DomainException ex = assertThrows(DomainException.class, () ->
                service.optimizePro(schedule.getId(), req)
        );

        assertEquals("ALGORITHM_ENGINE_UNAVAILABLE", ex.getCode());
        assertEquals(503, ex.getStatus());
    }
}
