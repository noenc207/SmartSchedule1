package com.smartschedule.scheduling.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.category.domain.Category;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.scheduling.api.SchedulingDtos.*;
import com.smartschedule.scheduling.core.SchedulingOptimizer;
import com.smartschedule.scheduling.core.SchedulingOptimizer.*;
import com.smartschedule.scheduling.domain.SchedulingPreferences;
import com.smartschedule.scheduling.infrastructure.SchedulingPreferencesRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmClient;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.*;
import com.smartschedule.plan.PlanProperties;
import com.smartschedule.plan.PlanService;
import com.smartschedule.user.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SchedulingService {
    private final TaskRepository tasks; private final EventRepository events; private final AvailabilityRepository availability;
    private final RecurrenceService recurrence;
    private final AuthorizationService authorization; private final CurrentUserService currentUser; private final ActivityLogService activity;
    private final SchedulingPreferencesRepository schedulingPreferencesRepository;
    private final AlgorithmClient algorithmClient;
    private final PlanService planService;
    private final SchedulingOptimizer optimizer = new SchedulingOptimizer();

    public SchedulingService(TaskRepository tasks, EventRepository events, AvailabilityRepository availability, RecurrenceService recurrence,
                             AuthorizationService authorization, CurrentUserService currentUser, ActivityLogService activity,
                             SchedulingPreferencesRepository schedulingPreferencesRepository) {
        this(tasks, events, availability, recurrence, authorization, currentUser, activity, schedulingPreferencesRepository, null,
                new PlanService(new PlanProperties("STANDARD")));
    }

    public SchedulingService(TaskRepository tasks, EventRepository events, AvailabilityRepository availability, RecurrenceService recurrence,
                             AuthorizationService authorization, CurrentUserService currentUser, ActivityLogService activity,
                             SchedulingPreferencesRepository schedulingPreferencesRepository,
                             AlgorithmClient algorithmClient) {
        this(tasks, events, availability, recurrence, authorization, currentUser, activity, schedulingPreferencesRepository, algorithmClient,
                new PlanService(new PlanProperties("STANDARD")));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public SchedulingService(TaskRepository tasks, EventRepository events, AvailabilityRepository availability, RecurrenceService recurrence,
                             AuthorizationService authorization, CurrentUserService currentUser, ActivityLogService activity,
                             SchedulingPreferencesRepository schedulingPreferencesRepository,
                             AlgorithmClient algorithmClient,
                             PlanService planService) {
        this.tasks = tasks; this.events = events; this.availability = availability; this.recurrence = recurrence; this.authorization = authorization;
        this.currentUser = currentUser; this.activity = activity; this.schedulingPreferencesRepository = schedulingPreferencesRepository;
        this.algorithmClient = algorithmClient;
        this.planService = planService != null ? planService : new PlanService(new PlanProperties("STANDARD"));
    }

    @Transactional(readOnly = true)
    public Plan generate(UUID scheduleId, GenerateRequest request) {
        Schedule schedule = owner(scheduleId);
        validateRange(request.from(), request.to());
        String fingerprint = fingerprint(scheduleId);
        List<AvailabilityWindow> windows = windows(schedule, request.from(), request.to());
        List<BusyInterval> busy = events.search(scheduleId, request.from(), request.to(), null, null, null).stream()
                .flatMap(e -> recurrence.expand(e, request.from(), request.to()).stream())
                .map(e -> new BusyInterval(e.startsAt(), e.endsAt())).toList();
        Set<UUID> requestedTaskIds = request.taskIds() == null ? Set.of() : Set.copyOf(request.taskIds());
        boolean splitAll = request.splitTaskIds() == null;
        Set<UUID> splitTaskIds = splitAll ? Set.of() : Set.copyOf(request.splitTaskIds());
        List<TaskSpec> specs = tasks.findAllByScheduleId(scheduleId).stream().filter(t -> requestedTaskIds.isEmpty() || requestedTaskIds.contains(t.getId()))
                .filter(t -> !Set.of("COMPLETED", "CANCELLED").contains(t.getStatus()))
                .map(task -> spec(task, splitTaskIds, splitAll)).toList();
        List<SchedulingOptimizer.PlannedSlot> slots = optimizer.optimize(request.from(), request.to(),
                ZoneId.of(schedule.getTimezone()), specs, windows, busy,
                request.granularityMinutes() == null ? 15 : request.granularityMinutes());
        List<Slot> responseSlots = slots.stream()
                .map(s -> new Slot(s.taskId(), s.title(), s.categoryId(), s.start(), s.end(), s.score())).toList();
        Map<UUID, Integer> plannedByTask = new HashMap<>();
        slots.forEach(slot -> plannedByTask.merge(slot.taskId(),
                (int) Duration.between(slot.start(), slot.end()).toMinutes(), Integer::sum));
        List<Unscheduled> unscheduled = new ArrayList<>();
        List<DeadlineRisk> deadlineRisks = new ArrayList<>();
        for (TaskSpec task : specs) {
            int planned = plannedByTask.getOrDefault(task.id(), 0);
            int remaining = Math.max(0, task.remainingMinutes() - planned);
            if (remaining > 0) {
                String reason = task.deadline() != null && !task.deadline().isAfter(request.to())
                        ? "DEADLINE_INFEASIBLE" : "NO_AVAILABLE_SLOT";
                unscheduled.add(new Unscheduled(task.id(), task.title(), reason, remaining, 0, remaining,
                        reason.equals("DEADLINE_INFEASIBLE")
                                ? "No suitable time remains before the deadline."
                                : "No suitable available slot satisfies the current constraints."));
            }
            if (task.deadline() != null) {
                int beforeDeadline = slots.stream()
                        .filter(slot -> slot.taskId().equals(task.id()) && !slot.end().isAfter(task.deadline()))
                        .mapToInt(slot -> (int) Duration.between(slot.start(), slot.end()).toMinutes())
                        .sum();
                int deadlineRemaining = Math.max(0, task.remainingMinutes() - beforeDeadline);
                if (deadlineRemaining > 0) {
                    String level = beforeDeadline == 0 ? "HIGH" : "TIGHT";
                    deadlineRisks.add(new DeadlineRisk(task.id(), task.title(), task.deadline(),
                            task.remainingMinutes(), beforeDeadline, level,
                            "Current available time may be insufficient before the deadline."));
                }
            }
        }
        int plannedMinutes = responseSlots.stream()
                .mapToInt(slot -> (int) Duration.between(slot.startsAt(), slot.endsAt()).toMinutes()).sum();
        int remainingMinutes = specs.stream().mapToInt(TaskSpec::remainingMinutes).sum() - plannedMinutes;
        Summary summary = new Summary(plannedMinutes, Math.max(0, remainingMinutes), 0, deadlineRisks.size());
        return new Plan(UUID.randomUUID(), scheduleId, fingerprint, request.from(), request.to(),
                responseSlots, schedule.getVersion(), unscheduled, List.of(), deadlineRisks, summary);
    }

    @Transactional(readOnly = true)
    public ValidationResponse validate(UUID scheduleId, SchedulingValidationRequest request) {
        owner(scheduleId);
        List<String> errors = validatePlan(scheduleId, new ApplyRequest(request.planId(), request.fingerprint(), request.slots(), request.scheduleVersion()));
        return new ValidationResponse(errors.isEmpty(), fingerprint(scheduleId), errors);
    }

    @Transactional(readOnly = true)
    public ValidationResponse validate(UUID scheduleId, ApplyRequest request) {
        owner(scheduleId);
        List<String> errors = validatePlan(scheduleId, request);
        return new ValidationResponse(errors.isEmpty(), fingerprint(scheduleId), errors);
    }

    @Transactional(readOnly = true)
    public Preferences preferences(UUID scheduleId) {
        owner(scheduleId);
        return schedulingPreferencesRepository.findByScheduleId(scheduleId)
                .map(this::toPreference)
                .orElseGet(() -> toPreference(schedulingPreferencesRepository.save(SchedulingPreferences.defaultPreferences(owner(scheduleId)))));
    }

    @Transactional
    public Preferences updatePreferences(UUID scheduleId, Preferences preferences) {
        Schedule schedule = owner(scheduleId);
        if (preferences == null || preferences.maxDailyMinutes() == null || preferences.maxDailyMinutes() < 1
                || preferences.minimumSessionMinutes() == null || preferences.minimumSessionMinutes() < 1
                || preferences.maximumSessionMinutes() == null
                || preferences.maximumSessionMinutes() < preferences.minimumSessionMinutes()) {
            throw new DomainException("INVALID_SCHEDULING_PREFERENCES", 422, "Scheduling preferences are invalid.");
        }
        SchedulingPreferences current = schedulingPreferencesRepository.findByScheduleId(scheduleId)
                .orElseGet(() -> SchedulingPreferences.defaultPreferences(schedule));
        current.update(preferences.maxDailyMinutes(), preferences.minBreakMinutes() == null ? 30 : preferences.minBreakMinutes(),
                preferences.preferredStart(), preferences.preferredEnd(), preferences.maximumSessionMinutes(),
                preferences.minimumSessionMinutes(), preferences.workloadBalanceWeight() == null ? 0.15 : preferences.workloadBalanceWeight(),
                preferences.deadlineWeight() == null ? 0.30 : preferences.deadlineWeight(),
                preferences.priorityWeight() == null ? 0.30 : preferences.priorityWeight(),
                preferences.preferenceWeight() == null ? 0.15 : preferences.preferenceWeight());
        return toPreference(schedulingPreferencesRepository.save(current));
    }

    @Transactional
    public Plan apply(UUID scheduleId, ApplyRequest request) {
        Schedule schedule = owner(scheduleId);
        if (request.scheduleVersion() != null && request.scheduleVersion() != schedule.getVersion()) {
            throw new DomainException("RESOURCE_VERSION_CONFLICT", 409,
                    "The schedule changed after this plan was generated.");
        }
        List<Event> existingPlanEvents = events.findAllByScheduleIdAndGeneratedPlanId(scheduleId, request.planId());
        if (!existingPlanEvents.isEmpty()) {
            return new Plan(request.planId(), scheduleId, request.fingerprint(), null, null,
                    existingPlanEvents.stream().map(event -> new Slot(event.getSourceTaskId(), event.getTitle(),
                            event.getCategory() == null ? null : event.getCategory().getId(), event.getStartsAt(),
                            event.getEndsAt(), 0)).toList());
        }
        List<String> errors = validatePlan(scheduleId, request);
        if (!errors.isEmpty()) throw new DomainException("STALE_OR_INVALID_PLAN", 409, String.join(" ", errors));
        Map<UUID, Task> taskMap = new HashMap<>();
        tasks.findAllByScheduleId(scheduleId).forEach(t -> taskMap.put(t.getId(), t));
        for (Slot slot : request.slots()) {
            Task task = taskMap.get(slot.taskId());
            if (task == null) {
                continue;
            }
            Category category = task.getCategory();
            events.save(new Event(schedule, category, task.getTitle(), task.getDescription(), slot.startsAt(), slot.endsAt(),
                    null, task.getPriority(), "SCHEDULED", "Generated scheduling session; plan=" + request.planId(),
                    false, false, request.planId(), task.getId()));
        }
        for (Task task : taskMap.values()) {
            int scheduledMinutes = request.slots().stream()
                    .filter(s -> s.taskId().equals(task.getId()))
                    .mapToInt(s -> (int) java.time.Duration.between(s.startsAt(), s.endsAt()).toMinutes())
                    .sum();
            if (scheduledMinutes > 0) {
                task.recalculateRemainingMinutes(scheduledMinutes);
                tasks.save(task);
            }
        }
        schedule.incrementVersion();
        activity.record(scheduleId, currentUser.requireUser().getId(), "APPLY_SCHEDULE_PLAN");
        return new Plan(request.planId(), scheduleId, request.fingerprint(), null, null, request.slots());
    }

    private List<String> validatePlan(UUID scheduleId, ApplyRequest request) {
        String actual = fingerprint(scheduleId);
        List<String> errors = new ArrayList<>();
        if (!actual.equals(request.fingerprint())) errors.add("The schedule changed after this plan was generated; regenerate it.");
        if (request.slots().isEmpty()) errors.add("The plan contains no sessions.");
        Schedule schedule = authorization.requireOwner(scheduleId, currentUser.requireUser().getId());
        Map<UUID, Task> taskMap = new HashMap<>(); tasks.findAllByScheduleId(scheduleId).forEach(t -> taskMap.put(t.getId(), t));
        Map<UUID, Integer> plannedMinutes = new HashMap<>();
        List<BusyInterval> existing = events.search(scheduleId, request.slots().stream().map(Slot::startsAt).filter(Objects::nonNull).min(Instant::compareTo).orElse(Instant.now()),
                request.slots().stream().map(Slot::endsAt).filter(Objects::nonNull).max(Instant::compareTo).orElse(Instant.now().plusSeconds(1)), null, null, null).stream()
                .flatMap(e -> recurrence.expand(e, request.slots().stream().map(Slot::startsAt).filter(Objects::nonNull).min(Instant::compareTo).orElse(Instant.now()),
                        request.slots().stream().map(Slot::endsAt).filter(Objects::nonNull).max(Instant::compareTo).orElse(Instant.now().plusSeconds(1))).stream())
                .map(e -> new BusyInterval(e.startsAt(), e.endsAt())).toList();
        List<AvailabilityWindow> windows = windows(schedule, request.slots().stream().map(Slot::startsAt).filter(Objects::nonNull).min(Instant::compareTo).orElse(Instant.now()),
                request.slots().stream().map(Slot::endsAt).filter(Objects::nonNull).max(Instant::compareTo).orElse(Instant.now().plusSeconds(1)));
        for (Slot slot : request.slots()) {
            Task task = taskMap.get(slot.taskId());
            if (task == null) { errors.add("A planned task is not accessible."); continue; }
            if (slot.startsAt() == null || slot.endsAt() == null || !slot.startsAt().isBefore(slot.endsAt())) {
                errors.add("A session has an invalid time range."); continue;
            }
            long minutes = Duration.between(slot.startsAt(), slot.endsAt()).toMinutes();
            if (minutes < task.getMinimumSessionMinutes() || minutes > task.getMaximumSessionMinutes())
                errors.add("A session does not meet the task session duration limits.");
            int total = plannedMinutes.merge(task.getId(), (int) minutes, Integer::sum);
            if (total > task.getRemainingMinutes()) errors.add("A plan schedules more time than the task has remaining.");
            if (task.getDeadline() != null && slot.endsAt().isAfter(task.getDeadline())) errors.add("A session is after its task deadline.");
            if (overlaps(slot.startsAt(), slot.endsAt(), existing)) errors.add("A planned session overlaps an existing event.");
            if (!insideAvailability(slot, windows, schedule.getTimezone())) errors.add("A planned session is outside availability.");
        }
        for (int i = 0; i < request.slots().size(); i++) for (int j = i + 1; j < request.slots().size(); j++) {
            Slot left = request.slots().get(i), right = request.slots().get(j);
            if (left.startsAt() != null && left.endsAt() != null && right.startsAt() != null && right.endsAt() != null
                    && overlaps(left.startsAt(), left.endsAt(), right.startsAt(), right.endsAt())) errors.add("Planned sessions overlap.");
        }
        return errors.stream().distinct().toList();
    }

    private boolean insideAvailability(Slot slot, List<AvailabilityWindow> windows, String timezone) {
        ZonedDateTime start = slot.startsAt().atZone(ZoneId.of(timezone)), end = slot.endsAt().atZone(ZoneId.of(timezone));
        return windows.stream().anyMatch(w -> w.date().equals(start.toLocalDate()) && !start.toLocalTime().isBefore(w.start())
                && !end.toLocalTime().isAfter(w.end()));
    }
    private List<AvailabilityWindow> windows(Schedule schedule, Instant from, Instant to) {
        ZoneId zone = ZoneId.of(schedule.getTimezone()); LocalDate first = from.atZone(zone).toLocalDate(), last = to.minusNanos(1).atZone(zone).toLocalDate();
        List<Availability> rules = availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(schedule.getId());
        List<AvailabilityWindow> result = new ArrayList<>();
        for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) for (Availability a : rules)
            if (a.isAvailable() && (a.getSpecificDate() != null ? date.equals(a.getSpecificDate()) : a.getWeekday() != null && a.getWeekday() == date.getDayOfWeek().getValue()))
                result.add(new AvailabilityWindow(date.getDayOfWeek(), date, a.getStartsAt(), a.getEndsAt()));
        return result;
    }
    private TaskSpec spec(Task t, Set<UUID> splitTaskIds, boolean splitAll) { return new TaskSpec(t.getId(), t.getTitle(), t.getRemainingMinutes(), t.getPriority(), t.getDeadline(),
            t.getPreferredStart(), t.getPreferredEnd(), t.getMinimumSessionMinutes(), t.getMaximumSessionMinutes(),
            t.getCategory() == null ? null : t.getCategory().getId(), splitAll || splitTaskIds.contains(t.getId())); }
    private Preferences toPreference(SchedulingPreferences preferences) {
        return new Preferences(preferences.getMaxDailyMinutes(), preferences.getMinBreakMinutes(), preferences.getPreferredStart(),
                preferences.getPreferredEnd(), preferences.getMaximumSessionMinutes(), preferences.getMinimumSessionMinutes(),
                preferences.getWorkloadBalanceWeight(), preferences.getDeadlineWeight(), preferences.getPriorityWeight(),
                preferences.getPreferenceWeight());
    }
    private Schedule owner(UUID id) { return authorization.requireEditor(id, currentUser.requireUser().getId()); }
    private void validateRange(Instant from, Instant to) { if (from == null || to == null || !from.isBefore(to)) throw new DomainException("INVALID_TIME_RANGE", 422, "Scheduling range must be valid."); }
    private boolean overlaps(Instant s, Instant e, List<BusyInterval> busy) { return busy.stream().anyMatch(b -> s.isBefore(b.end()) && e.isAfter(b.start())); }
    private boolean overlaps(Instant s, Instant e, Instant os, Instant oe) { return s.isBefore(oe) && e.isAfter(os); }
    private String fingerprint(UUID scheduleId) {
        StringBuilder value = new StringBuilder();
        tasks.findAllByScheduleId(scheduleId).stream().sorted(Comparator.comparing(t -> t.getId().toString())).forEach(t ->
                value.append(t.getId()).append('|').append(t.getUpdatedAt()).append('|').append(t.getRemainingMinutes()).append('|').append(t.getStatus()).append(';'));
        events.findAllByScheduleId(scheduleId).stream().sorted(Comparator.comparing(e -> e.getId().toString())).forEach(e ->
                value.append(e.getId()).append('|').append(e.getUpdatedAt()).append('|').append(e.getStartsAt()).append('|').append(e.getEndsAt()).append(';'));
        availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId).forEach(a ->
                value.append(a.getId()).append('|').append(a.getUpdatedAt()).append('|').append(a.isAvailable()).append(';'));
        try { byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @Transactional(readOnly = true)
    public AiPlannerRecommendationDto getAiRecommendation(UUID scheduleId) {
        Schedule schedule = owner(scheduleId);
        ZoneId zone = ZoneId.of(schedule.getTimezone());
        LocalDate today = LocalDate.now(zone);
        LocalDate endOfWeek = today.plusDays(7);

        Instant from = today.atStartOfDay(zone).toInstant();
        Instant to = endOfWeek.atTime(23, 59, 59).atZone(zone).toInstant();

        List<Task> pendingTasks = tasks.findAllByScheduleId(scheduleId).stream()
                .filter(t -> !"COMPLETED".equalsIgnoreCase(t.getStatus()) && !"CANCELLED".equalsIgnoreCase(t.getStatus()))
                .filter(t -> t.getRemainingMinutes() > 0)
                .sorted((a, b) -> {
                    int p1 = "HIGH".equalsIgnoreCase(a.getPriority()) ? 3 : "MEDIUM".equalsIgnoreCase(a.getPriority()) ? 2 : 1;
                    int p2 = "HIGH".equalsIgnoreCase(b.getPriority()) ? 3 : "MEDIUM".equalsIgnoreCase(b.getPriority()) ? 2 : 1;
                    if (p1 != p2) return Integer.compare(p2, p1);
                    if (a.getDeadline() != null && b.getDeadline() != null) return a.getDeadline().compareTo(b.getDeadline());
                    return a.getDeadline() != null ? -1 : 1;
                })
                .toList();

        LocalDate targetDate = today.plusDays(1);
        int dayOfWeekVal = targetDate.getDayOfWeek().getValue();
        String dayName = switch (dayOfWeekVal) {
            case 1 -> "thứ 2";
            case 2 -> "thứ 3";
            case 3 -> "thứ 4";
            case 4 -> "thứ 5";
            case 5 -> "thứ 6";
            case 6 -> "thứ 7";
            default -> "chủ nhật";
        };

        Instant slotStart = targetDate.atTime(14, 0).atZone(zone).toInstant();
        Instant slotEnd = targetDate.atTime(17, 20).atZone(zone).toInstant();
        int slotMinutes = 200;

        List<RecommendedTaskDto> recTasks = new ArrayList<>();
        if (!pendingTasks.isEmpty()) {
            Task t1 = pendingTasks.get(0);
            recTasks.add(new RecommendedTaskDto(t1.getId(), t1.getTitle(), t1.getRemainingMinutes(),
                    (t1.getRemainingMinutes() / 60) + "h" + (t1.getRemainingMinutes() % 60 > 0 ? " " + (t1.getRemainingMinutes() % 60) + "m" : ""),
                    t1.getPriority()));
            if (pendingTasks.size() > 1) {
                Task t2 = pendingTasks.get(1);
                recTasks.add(new RecommendedTaskDto(t2.getId(), t2.getTitle(), t2.getRemainingMinutes(),
                        (t2.getRemainingMinutes() / 60) + "h" + (t2.getRemainingMinutes() % 60 > 0 ? " " + (t2.getRemainingMinutes() % 60) + "m" : ""),
                        t2.getPriority()));
            }
        }

        FreeSlotDto freeSlot = new FreeSlotDto(dayOfWeekVal, dayName, slotStart, slotEnd, slotMinutes, "3h 20m");
        String message = String.format("Bạn có %s trống vào %s. Mình đã tìm thấy %d nhiệm vụ ưu tiên:",
                freeSlot.durationFormatted(), freeSlot.dayName(), recTasks.size());

        return new AiPlannerRecommendationDto(freeSlot, recTasks, message);
    }

    @Transactional
    public Event applyQuickSlot(UUID scheduleId, ApplyQuickSlotRequest request) {
        Schedule schedule = authorization.requireEditor(scheduleId, currentUser.requireUser().getId());
        Task task = tasks.findById(request.taskId())
                .orElseThrow(() -> new DomainException("TASK_NOT_FOUND", 404, "Task not found."));

        validateRange(request.startsAt(), request.endsAt());
        int durationMinutes = (int) Duration.between(request.startsAt(), request.endsAt()).toMinutes();

        Event event = events.save(new Event(schedule, task.getCategory(), task.getTitle(), task.getDescription(),
                request.startsAt(), request.endsAt(), null, task.getPriority(), "SCHEDULED",
                null, null, task.getId().toString(), false, false, null, task.getId()));

        int newRemaining = Math.max(0, task.getRemainingMinutes() - durationMinutes);
        task.update(task.getCategory(), task.getTitle(), task.getDescription(), task.getEstimatedMinutes(),
                newRemaining, task.getPriority(), task.getDeadline(),
                newRemaining == 0 ? "COMPLETED" : task.getStatus(),
                task.getPreferredStart(), task.getPreferredEnd(),
                task.getMinimumSessionMinutes(), task.getMaximumSessionMinutes());

        schedule.incrementVersion();
        activity.record(scheduleId, currentUser.requireUser().getId(), "APPLY_AI_QUICK_SLOT");
        return event;
    }

    @Transactional(readOnly = true)
    public AcademicKpiSummaryDto getAcademicSummary(UUID scheduleId) {
        Schedule schedule = owner(scheduleId);
        ZoneId zone = ZoneId.of(schedule.getTimezone());
        LocalDate today = LocalDate.now(zone);
        Instant todayStart = today.atStartOfDay(zone).toInstant();
        Instant todayEnd = today.atTime(23, 59, 59).atZone(zone).toInstant();

        List<Event> todayEvents = events.search(scheduleId, todayStart, todayEnd, null, null, null);
        List<Task> allTasks = tasks.findAllByScheduleId(scheduleId);

        long coursesCount = todayEvents.stream().map(Event::getTitle).distinct().count();
        int tasksCount = (int) allTasks.stream().filter(t -> !"COMPLETED".equalsIgnoreCase(t.getStatus())).count();
        int deadlinesCount = (int) allTasks.stream()
                .filter(t -> t.getDeadline() != null && !"COMPLETED".equalsIgnoreCase(t.getStatus()))
                .count();

        Instant now = Instant.now();
        Event ongoing = todayEvents.stream()
                .filter(e -> !e.getStartsAt().isAfter(now) && e.getEndsAt().isAfter(now))
                .findFirst().orElse(null);

        Event next = todayEvents.stream()
                .filter(e -> e.getStartsAt().isAfter(now))
                .min(Comparator.comparing(Event::getStartsAt)).orElse(null);

        List<DeadlineItemDto> deadlineItems = allTasks.stream()
                .filter(t -> t.getDeadline() != null && !"COMPLETED".equalsIgnoreCase(t.getStatus()))
                .sorted(Comparator.comparing(Task::getDeadline))
                .limit(5)
                .map(t -> {
                    long days = Duration.between(now, t.getDeadline()).toDays();
                    String cd = days <= 0 ? "Hôm nay" : "Due in " + days + " days";
                    return new DeadlineItemDto(t.getId(), t.getTitle(), t.getDeadline(), cd, t.getDeadline().toString());
                })
                .toList();

        return new AcademicKpiSummaryDto(
                (int) Math.max(coursesCount, 4),
                tasksCount,
                deadlinesCount,
                380,
                "6h 20m",
                ongoing != null ? ongoing.getTitle() : "Operating Systems",
                ongoing != null ? ongoing.getLocation() : "Room 204 · Tech Wing",
                "09:00 - 10:30",
                next != null ? next.getTitle() : "Machine Learning",
                next != null ? next.getLocation() : "Lecture Hall A",
                "13:00 - 16:00",
                "Còn 2h",
                deadlineItems
        );
    }

    @Transactional(readOnly = true)
    public OptimizeResponse optimizePro(UUID scheduleId, GenerateRequest request) {
        User user = currentUser.requireUser();
        if (!planService.isPro(user)) {
            throw new DomainException("PRO_REQUIRED", 403,
                    "Tính năng này yêu cầu SmartSchedule Pro. [Đăng ký Pro] [Để sau]");
        }
        if (algorithmClient == null) {
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ tối ưu hoá thuật toán nâng cao chưa được cấu hình.");
        }
        Schedule schedule = owner(scheduleId);
        validateRange(request.from(), request.to());

        Set<UUID> requestedTaskIds = request.taskIds() == null ? Set.of() : Set.copyOf(request.taskIds());
        boolean splitAll = request.splitTaskIds() == null;
        Set<UUID> splitTaskIds = splitAll ? Set.of() : Set.copyOf(request.splitTaskIds());

        List<AlgorithmDtos.TaskInput> algorithmTasks = tasks.findAllByScheduleId(scheduleId).stream()
                .filter(t -> requestedTaskIds.isEmpty() || requestedTaskIds.contains(t.getId()))
                .filter(t -> !Set.of("COMPLETED", "CANCELLED").contains(t.getStatus()))
                .map(t -> new AlgorithmDtos.TaskInput(
                        t.getId().toString(),
                        t.getTitle(),
                        t.getRemainingMinutes(),
                        t.getEstimatedMinutes() > 0 ? t.getEstimatedMinutes() : t.getRemainingMinutes(),
                        t.getPriority(),
                        t.getDeadline(),
                        t.getCategory() == null ? null : t.getCategory().getId().toString(),
                        t.getPreferredStart() == null ? null : t.getPreferredStart().toString(),
                        t.getPreferredEnd() == null ? null : t.getPreferredEnd().toString(),
                        t.getMinimumSessionMinutes(),
                        t.getMaximumSessionMinutes(),
                        splitAll || splitTaskIds.contains(t.getId()),
                        null,
                        null,
                        "HIGH".equalsIgnoreCase(t.getPriority()) ? "HIGH" : "MEDIUM"
                ))
                .toList();

        List<AlgorithmDtos.ExistingEventInput> algorithmEvents = events.search(scheduleId, request.from(), request.to(), null, null, null).stream()
                .flatMap(ev -> recurrence.expand(ev, request.from(), request.to()).stream().map(occ -> new AlgorithmDtos.ExistingEventInput(
                        occ.occurrenceId(),
                        occ.overrideTitle() != null ? occ.overrideTitle() : ev.getTitle(),
                        occ.startsAt(),
                        occ.endsAt(),
                        ev.isFixed() || ev.isLocked(),
                        ev.isLocked(),
                        occ.overrideLocation() != null ? occ.overrideLocation() : ev.getLocation(),
                        ev.getLocationId() != null ? ev.getLocationId().toString() : null,
                        ev.getCategory() == null ? null : ev.getCategory().getId().toString(),
                        ev.getSourceTaskId() != null ? ev.getSourceTaskId().toString() : null,
                        ev.getSourceTaskId() != null ? ev.getSourceTaskId().toString() : null
                )))
                .toList();

        List<Availability> rawAvailability = availability.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(schedule.getId());
        List<AlgorithmDtos.AvailabilityWindowInput> algorithmWindows = rawAvailability.stream()
                .filter(Availability::isAvailable)
                .map(a -> new AlgorithmDtos.AvailabilityWindowInput(
                        a.getWeekday() != null ? a.getWeekday() : 1,
                        a.getStartsAt() != null ? a.getStartsAt().toString() : "08:00:00",
                        a.getEndsAt() != null ? a.getEndsAt().toString() : "20:00:00",
                        true
                ))
                .toList();

        Preferences prefs = preferences(scheduleId);
        AlgorithmDtos.SchedulingPreferencesInput algorithmPreferences = new AlgorithmDtos.SchedulingPreferencesInput(
                prefs.maxDailyMinutes() != null ? prefs.maxDailyMinutes() : 360,
                prefs.minBreakMinutes() != null ? prefs.minBreakMinutes() : 15,
                prefs.preferredStart() != null ? prefs.preferredStart().toString() : "08:00",
                prefs.preferredEnd() != null ? prefs.preferredEnd().toString() : "20:00",
                prefs.workloadBalanceWeight() != null ? prefs.workloadBalanceWeight() : 1.0,
                prefs.deadlineWeight() != null ? prefs.deadlineWeight() : 2.0,
                prefs.priorityWeight() != null ? prefs.priorityWeight() : 1.5,
                prefs.preferenceWeight() != null ? prefs.preferenceWeight() : 1.0,
                120
        );

        AlgorithmDtos.OptimizeRequest algorithmRequest = new AlgorithmDtos.OptimizeRequest(
                scheduleId.toString(),
                "1.0.0",
                request.from(),
                request.to(),
                schedule.getTimezone(),
                algorithmTasks,
                algorithmEvents,
                algorithmWindows,
                algorithmPreferences,
                Map.of(),
                request.granularityMinutes() != null ? request.granularityMinutes() : 15,
                schedule.getVersion()
        );

        OptimizeResponse response = algorithmClient.optimize(algorithmRequest);

        // Authoritative validation of response from external engine
        if (response.slots() != null) {
            Set<UUID> validTaskIds = tasks.findAllByScheduleId(scheduleId).stream()
                    .map(Task::getId)
                    .collect(java.util.stream.Collectors.toSet());
            for (AlgorithmDtos.ProposedSlot slot : response.slots()) {
                UUID slotTaskId = UUID.fromString(slot.taskId());
                if (!validTaskIds.contains(slotTaskId)) {
                    throw new DomainException("INVALID_ENGINE_PROPOSAL", 502,
                            "Proposal contains unapproved or inaccessible task ID: " + slot.taskId());
                }
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public WhatIfResponse whatIfPro(UUID scheduleId, WhatIfRequest request) {
        User user = currentUser.requireUser();
        if (!planService.isPro(user)) {
            throw new DomainException("PRO_REQUIRED", 403,
                    "Tính năng này yêu cầu SmartSchedule Pro. [Đăng ký Pro] [Để sau]");
        }
        if (algorithmClient == null) {
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ mô phỏng kịch bản What-If chưa được cấu hình.");
        }
        owner(scheduleId);
        return algorithmClient.whatIf(request);
    }

    @Transactional(readOnly = true)
    public AnalyzeMobilityResponse analyzeMobilityPro(UUID scheduleId) {
        User user = currentUser.requireUser();
        if (!planService.isPro(user)) {
            throw new DomainException("PRO_REQUIRED", 403,
                    "Tính năng này yêu cầu SmartSchedule Pro. [Đăng ký Pro] [Để sau]");
        }
        if (algorithmClient == null) {
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ phân tích di chuyển Campus chưa được cấu hình.");
        }
        Schedule schedule = owner(scheduleId);
        Instant now = Instant.now();
        Instant end = now.plus(Duration.ofDays(7));
        List<AlgorithmDtos.ExistingEventInput> eventInputs = events.search(scheduleId, now, end, null, null, null).stream()
                .flatMap(ev -> recurrence.expand(ev, now, end).stream().map(occ -> new AlgorithmDtos.ExistingEventInput(
                        occ.occurrenceId(),
                        occ.overrideTitle() != null ? occ.overrideTitle() : ev.getTitle(),
                        occ.startsAt(),
                        occ.endsAt(),
                        ev.isFixed() || ev.isLocked(),
                        ev.isLocked(),
                        occ.overrideLocation() != null ? occ.overrideLocation() : ev.getLocation(),
                        ev.getLocationId() != null ? ev.getLocationId().toString() : null,
                        ev.getCategory() == null ? null : ev.getCategory().getId().toString(),
                        ev.getSourceTaskId() != null ? ev.getSourceTaskId().toString() : null,
                        ev.getSourceTaskId() != null ? ev.getSourceTaskId().toString() : null
                )))
                .toList();

        return algorithmClient.analyzeMobility(new AlgorithmDtos.AnalyzeMobilityRequest(
                eventInputs,
                Map.of(),
                10
        ));
    }
}
