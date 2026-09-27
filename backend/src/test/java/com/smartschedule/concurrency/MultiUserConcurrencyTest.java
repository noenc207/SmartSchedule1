package com.smartschedule.concurrency;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.domain.Category;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.EventRequest;
import com.smartschedule.event.application.EventService;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventOccurrenceExceptionRepository;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.api.ScheduleDtos.UpdateScheduleRequest;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.application.ScheduleService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleMemberRepository;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.scheduling.api.SchedulingDtos.ApplyRequest;
import com.smartschedule.scheduling.api.SchedulingDtos.Slot;
import com.smartschedule.scheduling.application.SchedulingService;
import com.smartschedule.scheduling.infrastructure.SchedulingPreferencesRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class MultiUserConcurrencyTest {

    private ScheduleRepository scheduleRepository;
    private ScheduleMemberRepository scheduleMemberRepository;
    private EventRepository eventRepository;
    private TaskRepository taskRepository;
    private CategoryRepository categoryRepository;
    private ActivityLogService activityLogService;
    private AuthorizationService authorizationService;
    private CurrentUserService currentUserService;

    @BeforeEach
    void setUp() {
        scheduleRepository = mock(ScheduleRepository.class);
        scheduleMemberRepository = mock(ScheduleMemberRepository.class);
        eventRepository = mock(EventRepository.class);
        taskRepository = mock(TaskRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        activityLogService = mock(ActivityLogService.class);
        authorizationService = mock(AuthorizationService.class);
        currentUserService = mock(CurrentUserService.class);
    }

    /**
     * Requirement 29: Test at least 10 concurrent users with separate schedules, tasks, and events.
     * Verifies strict user isolation, no data cross-leakage, and thread safety.
     */
    @Test
    void tenConcurrentUsers_operateInParallel_maintainCompleteIsolation() throws Exception {
        int userCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(userCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch endGate = new CountDownLatch(userCount);
        ConcurrentMap<UUID, User> createdUsers = new ConcurrentHashMap<>();
        ConcurrentMap<UUID, Schedule> createdSchedules = new ConcurrentHashMap<>();
        ConcurrentMap<UUID, List<Task>> userTasks = new ConcurrentHashMap<>();
        ConcurrentLinkedQueue<Throwable> exceptions = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < userCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startGate.await();
                    User user = new User("user" + index + "@fpt.edu.vn", "hash" + index, "User " + index);
                    createdUsers.put(user.getId(), user);

                    Schedule schedule = new Schedule(user, "Schedule " + index, "Description " + index, "Asia/Ho_Chi_Minh", "PRIVATE");
                    createdSchedules.put(schedule.getId(), schedule);

                    List<Task> tasks = new ArrayList<>();
                    for (int t = 0; t < 3; t++) {
                        Task task = new Task(schedule, user, null, "Task " + index + "-" + t, null,
                                60, 60, "MEDIUM", null, "TODO", LocalTime.of(8, 0), LocalTime.of(18, 0), 30, 60);
                        tasks.add(task);
                    }
                    userTasks.put(user.getId(), tasks);

                    // Verification: ensure each user's schedule points strictly to themselves
                    assertEquals(user.getId(), schedule.getOwner().getId());
                    for (Task t : tasks) {
                        assertEquals(user.getId(), t.getOwner().getId());
                        assertEquals(schedule.getId(), t.getSchedule().getId());
                    }
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    endGate.countDown();
                }
            });
        }

        startGate.countDown();
        assertTrue(endGate.await(10, TimeUnit.SECONDS), "Concurrent user execution timed out");
        executor.shutdown();

        assertTrue(exceptions.isEmpty(), "Exceptions occurred during concurrent user execution: " + exceptions);
        assertEquals(userCount, createdUsers.size());
        assertEquals(userCount, createdSchedules.size());
        assertEquals(userCount, userTasks.size());

        // Verify zero cross-user collisions: all IDs are strictly unique
        Set<UUID> userIds = createdUsers.keySet();
        Set<UUID> scheduleIds = createdSchedules.keySet();
        assertEquals(userCount, userIds.size());
        assertEquals(userCount, scheduleIds.size());
    }

    /**
     * Requirement 22 & 28: Stale update protection on Schedule versioning.
     * User A opens schedule at v0 and updates to v1.
     * User B concurrently attempts to save changes using old v0.
     * User B must receive HTTP 409 RESOURCE_VERSION_CONFLICT.
     */
    @Test
    void concurrentScheduleUpdate_detectsStaleVersion_throws409Conflict() {
        User owner = new User("owner@fpt.edu.vn", "hash", "Owner");
        Schedule schedule = new Schedule(owner, "My Timetable", "Original description", "Asia/Ho_Chi_Minh", "PRIVATE");
        // Initial version is 0
        assertEquals(0, schedule.getVersion());

        when(currentUserService.requireUser()).thenReturn(owner);
        when(authorizationService.requireOwner(eq(schedule.getId()), eq(owner.getId()))).thenReturn(schedule);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduleService service = new ScheduleService(
                scheduleRepository, scheduleMemberRepository, currentUserService,
                authorizationService, activityLogService
        );

        // User A updates schedule specifying expected version 0
        UpdateScheduleRequest updateA = new UpdateScheduleRequest(
                "Timetable Renamed by User A", "Description A", "Asia/Ho_Chi_Minh", "PRIVATE", 0L
        );
        service.update(schedule.getId(), updateA);
        assertEquals(1, schedule.getVersion());
        assertEquals("Timetable Renamed by User A", schedule.getName());

        // User B attempts to update with stale version 0
        UpdateScheduleRequest updateB = new UpdateScheduleRequest(
                "Timetable Renamed by User B", "Description B", "Asia/Ho_Chi_Minh", "PRIVATE", 0L
        );

        DomainException exception = assertThrows(DomainException.class, () ->
                service.update(schedule.getId(), updateB)
        );

        assertEquals(409, exception.getStatus());
        assertEquals("RESOURCE_VERSION_CONFLICT", exception.getCode());
        assertTrue(exception.getMessage().contains("Lịch trình đã được cập nhật"));
    }

    /**
     * Requirement 25 & 26: Event <-> Task remaining duration invariant:
     * remaining = max(0, estimated - sum(linkedDuration))
     * Under concurrent event creations on the same task, all duration increments must be accounted for.
     */
    @Test
    void concurrentEventCreations_linkedToSameTask_strictlyPreservesRemainingDurationInvariant() throws Exception {
        User user = new User("student@fpt.edu.vn", "hash", "Student");
        Schedule schedule = new Schedule(user, "Study Schedule", null, "UTC", "PRIVATE");
        Task task = new Task(schedule, user, null, "Complete Thesis Chapter", null,
                180, 180, "HIGH", null, "TODO", LocalTime.of(8, 0), LocalTime.of(22, 0), 30, 120);

        List<Event> storedEvents = Collections.synchronizedList(new ArrayList<>());

        when(currentUserService.requireUser()).thenReturn(user);
        when(authorizationService.requireEditor(eq(schedule.getId()), eq(user.getId()))).thenReturn(schedule);
        when(taskRepository.findById(eq(task.getId()))).thenReturn(Optional.of(task));
        when(taskRepository.findByIdWithLock(eq(task.getId()))).thenReturn(Optional.of(task));

        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> {
            Event e = inv.getArgument(0);
            storedEvents.add(e);
            return e;
        });

        when(eventRepository.findAllBySourceTaskId(eq(task.getId()))).thenAnswer(inv -> new ArrayList<>(storedEvents));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        EventService eventService = new EventService(
                eventRepository, categoryRepository, authorizationService,
                currentUserService, activityLogService,
                new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper()),
                null, taskRepository
        );

        // Concurrently add two 60-minute sessions linked to the same 180-minute task
        int sessions = 2;
        ExecutorService executor = Executors.newFixedThreadPool(sessions);
        CountDownLatch latch = new CountDownLatch(sessions);

        executor.submit(() -> {
            try {
                EventRequest req1 = new EventRequest(
                        "Study Session 1", null,
                        Instant.parse("2026-09-25T08:00:00Z"), Instant.parse("2026-09-25T09:00:00Z"), // 60 min
                        null, null, task.getId(), "MEDIUM", "SCHEDULED", null, null, null, true, true
                );
                eventService.create(schedule.getId(), req1);
            } finally {
                latch.countDown();
            }
        });

        executor.submit(() -> {
            try {
                EventRequest req2 = new EventRequest(
                        "Study Session 2", null,
                        Instant.parse("2026-09-25T10:00:00Z"), Instant.parse("2026-09-25T11:00:00Z"), // 60 min
                        null, null, task.getId(), "MEDIUM", "SCHEDULED", null, null, null, true, true
                );
                eventService.create(schedule.getId(), req2);
            } finally {
                latch.countDown();
            }
        });

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // Total scheduled = 60 + 60 = 120 minutes
        // Invariant: remaining = max(0, 180 - 120) = 60 minutes
        assertEquals(2, storedEvents.size());
        assertEquals(60, task.getRemainingMinutes());
    }

    /**
     * Requirement 27 & 74: Scheduling Apply Concurrency:
     * User A generates plan on schedule v0. Schedule is updated to v1.
     * User A tries to apply plan with stale scheduleVersion 0.
     * Must be rejected with HTTP 409 RESOURCE_VERSION_CONFLICT.
     */
    @Test
    void applyPlan_withStaleScheduleVersion_isRejectedWith409() {
        User user = new User("student@fpt.edu.vn", "hash", "Student");
        Schedule schedule = new Schedule(user, "Semester 1", null, "UTC", "PRIVATE");
        schedule.incrementVersion(); // Version is now 1
        assertEquals(1, schedule.getVersion());

        when(currentUserService.requireUser()).thenReturn(user);
        when(authorizationService.requireEditor(eq(schedule.getId()), eq(user.getId()))).thenReturn(schedule);

        SchedulingService schedulingService = new SchedulingService(
                taskRepository, eventRepository, mock(com.smartschedule.availability.infrastructure.AvailabilityRepository.class),
                new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper()),
                authorizationService, currentUserService, activityLogService,
                mock(SchedulingPreferencesRepository.class)
        );

        // Apply request submitted with old version 0
        ApplyRequest staleApply = new ApplyRequest(
                UUID.randomUUID(), "fingerprint-mock", List.of(), 0L
        );

        DomainException ex = assertThrows(DomainException.class, () ->
                schedulingService.apply(schedule.getId(), staleApply)
        );

        assertEquals(409, ex.getStatus());
        assertEquals("RESOURCE_VERSION_CONFLICT", ex.getCode());
        assertTrue(ex.getMessage().contains("The schedule changed after this plan was generated"));
    }
}
