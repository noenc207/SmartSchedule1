package com.smartschedule.rescheduling.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.rescheduling.api.ReschedulingDtos.*;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.scheduling.core.SchedulingOptimizer;
import com.smartschedule.scheduling.core.SchedulingOptimizer.*;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReschedulingService {
    private final EventRepository events;
    private final TaskRepository tasks;
    private final AvailabilityRepository availability;
    private final RecurrenceService recurrence;
    private final AuthorizationService authorization;
    private final CurrentUserService currentUser;
    private final ActivityLogService activity;
    private final SchedulingOptimizer optimizer = new SchedulingOptimizer();

    public ReschedulingService(EventRepository events, TaskRepository tasks, AvailabilityRepository availability,
                               RecurrenceService recurrence, AuthorizationService authorization,
                               CurrentUserService currentUser, ActivityLogService activity) {
        this.events = events;
        this.tasks = tasks;
        this.availability = availability;
        this.recurrence = recurrence;
        this.authorization = authorization;
        this.currentUser = currentUser;
        this.activity = activity;
    }

    @Transactional(readOnly = true)
    public RescheduleImpact analyze(UUID scheduleId, ReschedulingRequest request) {
        Schedule schedule = owner(scheduleId);
        List<Event> generated = generatedEvents(scheduleId);
        Set<UUID> taskIds = determineAffectedTaskIds(generated, request);
        List<ImpactItem> affectedSessions = generated.stream()
                .filter(e -> e.getSourceTaskId() != null && taskIds.contains(e.getSourceTaskId()))
                .map(e -> new ImpactItem(e.getId(), e.getTitle(), e.getSourceTaskId(), "DIRECTLY_AFFECTED",
                        e.getStartsAt(), e.getEndsAt(), (int) Duration.between(e.getStartsAt(), e.getEndsAt()).toMinutes()))
                .toList();
        List<ImpactItem> unaffectedSessions = generated.stream()
                .filter(e -> e.getSourceTaskId() != null && !taskIds.contains(e.getSourceTaskId()))
                .map(e -> new ImpactItem(e.getId(), e.getTitle(), e.getSourceTaskId(), "UNAFFECTED",
                        e.getStartsAt(), e.getEndsAt(), (int) Duration.between(e.getStartsAt(), e.getEndsAt()).toMinutes()))
                .toList();
        List<ImpactItem> affectedTasks = tasks.findAllByScheduleId(scheduleId).stream()
                .filter(t -> taskIds.contains(t.getId()))
                .map(t -> new ImpactItem(t.getId(), t.getTitle(), t.getId(), "DIRECTLY_AFFECTED",
                        null, null, t.getRemainingMinutes()))
                .toList();

        List<EventDtos.ConflictFinding> conflicts = new ArrayList<>();
        for (Event slot : generated.stream().filter(e -> e.getSourceTaskId() != null && taskIds.contains(e.getSourceTaskId())).toList()) {
            for (Event other : events.findAllByScheduleId(scheduleId).stream().filter(e -> !e.getId().equals(slot.getId()) && e.getGeneratedPlanId() == null).toList()) {
                if (slot.getStartsAt().isBefore(other.getEndsAt()) && slot.getEndsAt().isAfter(other.getStartsAt())) {
                    conflicts.add(new EventDtos.ConflictFinding("EVENT_OVERLAP", EventDtos.ConflictSeverity.WARNING,
                            "Generated session overlaps a fixed event", "A generated session now conflicts with a user-created event.",
                            slot.getStartsAt(), slot.getEndsAt(), other.getId().toString(), other.getTitle(),
                            Math.max(0L, Math.min(slot.getEndsAt().toEpochMilli(), other.getEndsAt().toEpochMilli()) -
                                    Math.max(slot.getStartsAt().toEpochMilli(), other.getStartsAt().toEpochMilli())) / 60000L));
                }
            }
        }

        long lostCapacityMinutes = affectedSessions.stream().mapToLong(ImpactItem::minutes).sum();
        String summary = String.format("%d generated sessions affect %d tasks and preserve %d unaffected sessions.",
                affectedSessions.size(), affectedTasks.size(), unaffectedSessions.size());
        return new RescheduleImpact(affectedTasks, affectedSessions, unaffectedSessions, conflicts,
                lostCapacityMinutes, summary, fingerprint(scheduleId));
    }

    @Transactional(readOnly = true)
    public RescheduleResult generate(UUID scheduleId, ReschedulingRequest request) {
        Schedule schedule = owner(scheduleId);
        RescheduleImpact impact = analyze(scheduleId, request);
        List<RescheduleAlternative> alternatives = buildAlternatives(schedule, scheduleId, request, impact);
        String status = alternatives.isEmpty() ? "INFEASIBLE" : (alternatives.size() >= 2 ? "FEASIBLE" : "PARTIAL");
        return new RescheduleResult(status, new RescheduleMetrics(impact.affectedSessions().size(), impact.unaffectedSessions().size(),
                impact.lostCapacityMinutes()), alternatives, impact.fingerprint(), Instant.now());
    }

    @Transactional
    public RescheduleResult apply(UUID scheduleId, RescheduleAlternative alternative) {
        Schedule schedule = owner(scheduleId);
        String currentFingerprint = fingerprint(scheduleId);
        if (alternative == null || alternative.fingerprint() == null || !currentFingerprint.equals(alternative.fingerprint())) {
            throw new DomainException("STALE_OR_INVALID_PLAN", 409,
                    "The schedule changed after this reschedule alternative was generated.");
        }

        Map<UUID, Event> currentById = events.findGeneratedByScheduleId(scheduleId).stream().collect(Collectors.toMap(Event::getId, e -> e));
        Set<UUID> candidateTaskIds = alternative.slots().stream().map(RescheduleSlot::taskId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> matchedIds = new HashSet<>();

        for (RescheduleSlot slot : alternative.slots()) {
            UUID taskId = slot.taskId();
            if (taskId == null) {
                continue;
            }
            Task task = tasks.findById(taskId).orElse(null);
            if (task == null || !Objects.equals(task.getSchedule().getId(), scheduleId)) {
                continue;
            }
            if (slot.eventId() != null && currentById.containsKey(slot.eventId())) {
                Event existing = currentById.get(slot.eventId());
                matchedIds.add(existing.getId());
                if (!existing.getStartsAt().equals(slot.startsAt()) || !existing.getEndsAt().equals(slot.endsAt())) {
                    existing.update(task.getCategory(), task.getTitle(), task.getDescription(), slot.startsAt(), slot.endsAt(),
                            null, task.getPriority(), "SCHEDULED", null, null, null, false, false);
                    events.save(existing);
                }
            } else {
                Event created = new Event(schedule, task.getCategory(), task.getTitle(), task.getDescription(),
                        slot.startsAt(), slot.endsAt(), null, task.getPriority(), "SCHEDULED",
                        null, false, false, UUID.randomUUID(), taskId);
                events.save(created);
            }
        }

        for (Event existing : events.findGeneratedByScheduleId(scheduleId)) {
            if (existing.getSourceTaskId() != null && candidateTaskIds.contains(existing.getSourceTaskId())
                    && existing.getId() != null && !matchedIds.contains(existing.getId())) {
                events.delete(existing);
            }
        }

        activity.record(scheduleId, currentUser.requireUser().getId(), "APPLY_RESCHEDULE_ALTERNATIVE");
        return generate(scheduleId, new ReschedulingRequest(ChangeType.EVENT_MOVED, null, null,
                alternative.slots().stream().map(RescheduleSlot::startsAt).filter(Objects::nonNull).min(Instant::compareTo).orElse(Instant.now()),
                alternative.slots().stream().map(RescheduleSlot::endsAt).filter(Objects::nonNull).max(Instant::compareTo).orElse(Instant.now())));
    }

    @Transactional(readOnly = true)
    public WhatIfResult whatIf(UUID scheduleId, ReschedulingRequest request) {
        RescheduleImpact current = analyze(scheduleId, request);
        RescheduleImpact simulated = new RescheduleImpact(current.affectedTasks(), current.affectedSessions(), current.unaffectedSessions(),
                current.introducedConflicts(), current.lostCapacityMinutes() + 30, "Simulated preview without writing to the database.",
                current.fingerprint());
        List<RescheduleAlternative> alternatives = buildAlternatives(owner(scheduleId), scheduleId, request, current);
        return new WhatIfResult(current, simulated, alternatives, current.fingerprint());
    }

    private List<RescheduleAlternative> buildAlternatives(Schedule schedule, UUID scheduleId, ReschedulingRequest request,
                                                        RescheduleImpact impact) {
        Set<UUID> affectedTaskIds = impact.affectedTasks().stream().map(ImpactItem::taskId).filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        if (affectedTaskIds.isEmpty()) {
            return List.of();
        }
        List<Task> affectedTaskEntities = tasks.findAllByScheduleId(scheduleId).stream()
                .filter(task -> affectedTaskIds.contains(task.getId()))
                .toList();
        if (affectedTaskEntities.isEmpty()) {
            return List.of();
        }

        ZoneId zone = ZoneId.of(schedule.getTimezone());
        Instant windowStart = request.from().minusSeconds(Duration.ofDays(2).toSeconds());
        Instant windowEnd = request.to().plusSeconds(Duration.ofDays(2).toSeconds());
        List<AvailabilityWindow> windows = windows(schedule, windowStart, windowEnd);
        List<BusyInterval> busy = buildBusy(scheduleId, windowStart, windowEnd, affectedTaskIds, request);

        List<RescheduleAlternative> options = new ArrayList<>();
        LocalDate candidateStart = request.from().atZone(zone).toLocalDate();
        for (int offsetDays = 0; offsetDays < 7; offsetDays++) {
            LocalDate candidateDate = candidateStart.plusDays(offsetDays);
            Instant from = candidateDate.atStartOfDay(zone).toInstant();
            Instant to = candidateDate.plusDays(1).atStartOfDay(zone).toInstant();
            List<PlannedSlot> planned = optimizer.optimize(from, to, zone, affectedTaskEntities.stream().map(this::taskSpec).toList(), windows, busy, 30);
            if (planned.isEmpty()) {
                continue;
            }
            List<RescheduleSlot> slots = new ArrayList<>();
            for (PlannedSlot slot : planned) {
                slots.add(new RescheduleSlot(null, slot.taskId(), slot.title(), slot.start(), slot.end(), slot.score()));
            }
            long totalMovedMinutes = slots.stream().mapToLong(s -> Duration.between(s.startsAt(), s.endsAt()).toMinutes()).sum();
            long displacement = slots.stream().mapToLong(s -> Math.abs(Duration.between(s.startsAt(), request.from()).toMinutes())).max().orElse(0L);
            long deadlineMargin = slots.stream().mapToLong(s -> {
                Task task = affectedTaskEntities.stream().filter(t -> t.getId().equals(s.taskId())).findFirst().orElse(null);
                if (task == null || task.getDeadline() == null) {
                    return 0L;
                }
                return Math.max(0L, Duration.between(s.endsAt(), task.getDeadline()).toMinutes());
            }).sum();
            String id = "alt-" + (offsetDays + 1);
            options.add(new RescheduleAlternative(id, 100 - (offsetDays * 10), fingerprint(scheduleId),
                    slots.size(), impact.unaffectedSessions().size(), slots.size(), Math.max(0, impact.affectedSessions().size() - slots.size()),
                    totalMovedMinutes, displacement, deadlineMargin, 20L + (offsetDays * 15L), List.of("PRESERVE_UNAFFECTED", "KEEP_DEADLINE_MARGIN"), slots));
            if (options.size() >= 3) {
                break;
            }
        }
        return options;
    }

    private List<BusyInterval> buildBusy(UUID scheduleId, Instant from, Instant to, Set<UUID> affectedTaskIds,
                                         ReschedulingRequest request) {
        List<BusyInterval> busy = new ArrayList<>();
        for (Event event : events.findAllByScheduleId(scheduleId)) {
            if (event.getGeneratedPlanId() != null && event.getSourceTaskId() != null && affectedTaskIds.contains(event.getSourceTaskId())) {
                continue;
            }
            if (event.getStartsAt().isBefore(to) && event.getEndsAt().isAfter(from)) {
                busy.add(new BusyInterval(event.getStartsAt(), event.getEndsAt()));
            }
        }
        if (request.changeType() == ChangeType.EVENT_ADDED || request.changeType() == ChangeType.AVAILABILITY_CHANGED) {
            busy.add(new BusyInterval(request.from(), request.to()));
        }
        return busy;
    }

    private List<Event> generatedEvents(UUID scheduleId) {
        return events.findGeneratedByScheduleId(scheduleId).stream()
                .sorted(Comparator.comparing(Event::getStartsAt).thenComparing(Event::getId)).toList();
    }

    private Set<UUID> determineAffectedTaskIds(List<Event> generated, ReschedulingRequest request) {
        Set<UUID> taskIds = new LinkedHashSet<>();
        if (request.taskId() != null) {
            taskIds.add(request.taskId());
        }
        if (request.eventId() != null) {
            generated.stream().filter(e -> e.getId().equals(request.eventId()) && e.getSourceTaskId() != null)
                    .map(Event::getSourceTaskId).forEach(taskIds::add);
        }
        if (taskIds.isEmpty()) {
            for (Event event : generated) {
                if (event.getSourceTaskId() != null && event.getStartsAt().isBefore(request.to()) && event.getEndsAt().isAfter(request.from())) {
                    taskIds.add(event.getSourceTaskId());
                }
            }
        }
        return taskIds;
    }

    private TaskSpec taskSpec(Task task) {
        return new TaskSpec(task.getId(), task.getTitle(), task.getRemainingMinutes(), task.getPriority(), task.getDeadline(),
                task.getPreferredStart(), task.getPreferredEnd(), task.getMinimumSessionMinutes(), task.getMaximumSessionMinutes(),
                task.getCategory() == null ? null : task.getCategory().getId());
    }

    private List<AvailabilityWindow> windows(Schedule schedule, Instant from, Instant to) {
        ZoneId zone = ZoneId.of(schedule.getTimezone());
        LocalDate first = from.atZone(zone).toLocalDate();
        LocalDate last = to.minusNanos(1).atZone(zone).toLocalDate();
        List<Availability> rules = availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(schedule.getId());
        List<AvailabilityWindow> result = new ArrayList<>();
        for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) {
            for (Availability availabilityRule : rules) {
                if (availabilityRule.isAvailable() && (availabilityRule.getSpecificDate() != null ? date.equals(availabilityRule.getSpecificDate())
                        : availabilityRule.getWeekday() != null && availabilityRule.getWeekday() == date.getDayOfWeek().getValue())) {
                    result.add(new AvailabilityWindow(date.getDayOfWeek(), date, availabilityRule.getStartsAt(), availabilityRule.getEndsAt()));
                }
            }
        }
        return result;
    }

    private Schedule owner(UUID scheduleId) {
        return authorization.requireEditor(scheduleId, currentUser.requireUser().getId());
    }

    private String fingerprint(UUID scheduleId) {
        StringBuilder value = new StringBuilder();
        tasks.findAllByScheduleId(scheduleId).stream().sorted(Comparator.comparing(t -> t.getId().toString())).forEach(t ->
                value.append(t.getId()).append('|').append(t.getUpdatedAt()).append('|').append(t.getRemainingMinutes()).append('|').append(t.getStatus()).append(';'));
        events.findAllByScheduleId(scheduleId).stream().sorted(Comparator.comparing(e -> e.getId().toString())).forEach(e ->
                value.append(e.getId()).append('|').append(e.getUpdatedAt()).append('|').append(e.getStartsAt()).append('|').append(e.getEndsAt()).append('|')
                        .append(e.getGeneratedPlanId()).append('|').append(e.getSourceTaskId()).append(';'));
        availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId).forEach(a ->
                value.append(a.getId()).append('|').append(a.getUpdatedAt()).append('|').append(a.isAvailable()).append(';'));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
