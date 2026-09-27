package com.smartschedule.event.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.domain.Category;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.*;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.domain.EventOccurrenceException;
import com.smartschedule.event.infrastructure.EventOccurrenceExceptionRepository;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventService {
    private final EventRepository events;
    private final CategoryRepository categories;
    private final AuthorizationService authorization;
    private final CurrentUserService currentUser;
    private final ActivityLogService activity;
    private final RecurrenceService recurrence;
    private final EventOccurrenceExceptionRepository occurrenceExceptions;
    private final TaskRepository tasks;

    public EventService(EventRepository events, CategoryRepository categories, AuthorizationService authorization,
                        CurrentUserService currentUser, ActivityLogService activity, RecurrenceService recurrence) {
        this(events, categories, authorization, currentUser, activity, recurrence, null, null);
    }

    public EventService(EventRepository events, CategoryRepository categories, AuthorizationService authorization,
                        CurrentUserService currentUser, ActivityLogService activity) {
        this(events, categories, authorization, currentUser, activity,
                new RecurrenceService(new com.fasterxml.jackson.databind.ObjectMapper()), null, null);
    }

    @Autowired
    public EventService(EventRepository events, CategoryRepository categories, AuthorizationService authorization,
                        CurrentUserService currentUser, ActivityLogService activity, RecurrenceService recurrence,
                        EventOccurrenceExceptionRepository occurrenceExceptions, TaskRepository tasks) {
        this.events = events;
        this.categories = categories;
        this.authorization = authorization;
        this.currentUser = currentUser;
        this.activity = activity;
        this.recurrence = recurrence;
        this.occurrenceExceptions = occurrenceExceptions;
        this.tasks = tasks;
    }

    @Transactional(readOnly = true)
    public List<EventResponse> list(UUID scheduleId, Instant from, Instant to, UUID categoryId, String priority, String status) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        Instant rangeFrom = from == null ? Instant.now().minusSeconds(86400L * 365) : from;
        Instant rangeTo = to == null ? Instant.now().plusSeconds(86400L * 365) : to;
        if (!rangeFrom.isBefore(rangeTo)) {
            throw new DomainException("INVALID_TIME_RANGE", 422, "from must be before to.");
        }
        return events.search(scheduleId, rangeFrom, rangeTo, categoryId, normalize(priority), normalize(status)).stream()
                .flatMap(event -> recurrence.expand(event, rangeFrom, rangeTo).stream().map(occurrence -> toResponse(event, occurrence)))
                .toList();
    }

    @Transactional
    public EventResponse create(UUID scheduleId, EventRequest r) {
        UUID userId = currentUser.requireUser().getId();
        Schedule schedule = authorization.requireEditor(scheduleId, userId);
        validateRange(r.startsAt(), r.endsAt());
        Category category = category(r.categoryId(), userId, schedule.getOwner().getId());

        UUID sourceTaskId = r.sourceTaskId();
        if (sourceTaskId != null && tasks != null) {
            Task task = tasks.findById(sourceTaskId)
                    .orElseThrow(() -> new DomainException("TASK_NOT_FOUND", 404, "Source task not found."));
            if (!task.getSchedule().getId().equals(scheduleId)) {
                throw new DomainException("CROSS_SCHEDULE_TASK_LINK", 403, "Source task must belong to the same schedule.");
            }
        }

        Event event = events.save(new Event(
                schedule,
                category,
                r.title().trim(),
                r.description(),
                r.startsAt(),
                r.endsAt(),
                r.location(),
                value(r.priority(), "MEDIUM", List.of("LOW", "MEDIUM", "HIGH", "URGENT")),
                value(r.status(), "SCHEDULED", List.of("SCHEDULED", "COMPLETED", "CANCELLED")),
                recurrence.serialize(r.recurrence(), r.startsAt()),
                r.reminderMinutes(),
                r.notes(),
                r.fixed() == null || r.fixed(),
                r.locked() == null || r.locked(),
                null,
                sourceTaskId
        ));
        schedule.incrementVersion();

        if (sourceTaskId != null) {
            recalculateTaskRemaining(sourceTaskId);
        }

        activity.record(scheduleId, userId, "CREATE_EVENT");
        return toResponse(event);
    }

    @Transactional(readOnly = true)
    public EventResponse get(UUID id) {
        return toResponse(requireReadable(id));
    }

    @Transactional
    public EventResponse update(UUID id, EventRequest r) {
        Event event = requireEditable(id);
        validateRange(r.startsAt(), r.endsAt());
        UUID oldSourceTaskId = event.getSourceTaskId();
        UUID newSourceTaskId = r.sourceTaskId();

        if (newSourceTaskId != null && tasks != null) {
            Task task = tasks.findById(newSourceTaskId)
                    .orElseThrow(() -> new DomainException("TASK_NOT_FOUND", 404, "Source task not found."));
            if (!task.getSchedule().getId().equals(event.getSchedule().getId())) {
                throw new DomainException("CROSS_SCHEDULE_TASK_LINK", 403, "Source task must belong to the same schedule.");
            }
        }

        event.update(
                category(r.categoryId(), currentUser.requireUser().getId(), event.getSchedule().getOwner().getId()),
                newSourceTaskId,
                r.title().trim(),
                r.description(),
                r.startsAt(),
                r.endsAt(),
                r.location(),
                event.getLocationId(),
                value(r.priority(), "MEDIUM", List.of("LOW", "MEDIUM", "HIGH", "URGENT")),
                value(r.status(), "SCHEDULED", List.of("SCHEDULED", "COMPLETED", "CANCELLED")),
                recurrence.serialize(r.recurrence(), r.startsAt()),
                r.reminderMinutes(),
                r.notes(),
                r.fixed() == null || r.fixed(),
                r.locked() == null || r.locked()
        );
        event.getSchedule().incrementVersion();

        if (oldSourceTaskId != null) {
            recalculateTaskRemaining(oldSourceTaskId);
        }
        if (newSourceTaskId != null && !newSourceTaskId.equals(oldSourceTaskId)) {
            recalculateTaskRemaining(newSourceTaskId);
        }

        activity.record(event.getSchedule().getId(), currentUser.requireUser().getId(), "UPDATE_EVENT");
        return toResponse(event);
    }

    @Transactional
    public EventResponse duplicate(UUID id) {
        Event source = requireEditable(id);
        Event copy = events.save(new Event(
                source.getSchedule(),
                source.getCategory(),
                source.getTitle() + " (copy)",
                source.getDescription(),
                source.getStartsAt().plus(1, java.time.temporal.ChronoUnit.DAYS),
                source.getEndsAt().plus(1, java.time.temporal.ChronoUnit.DAYS),
                source.getLocation(),
                source.getPriority(),
                source.getStatus(),
                source.getRecurrenceRule(),
                source.getReminderMinutes(),
                source.getNotes(),
                source.isFixed(),
                source.isLocked(),
                null,
                source.getSourceTaskId()
        ));
        source.getSchedule().incrementVersion();
        if (source.getSourceTaskId() != null) {
            recalculateTaskRemaining(source.getSourceTaskId());
        }
        return toResponse(copy);
    }

    @Transactional
    public void delete(UUID id) {
        Event event = requireEditable(id);
        UUID sourceTaskId = event.getSourceTaskId();
        event.getSchedule().incrementVersion();
        events.delete(event);
        if (sourceTaskId != null) {
            recalculateTaskRemaining(sourceTaskId);
        }
        activity.record(event.getSchedule().getId(), currentUser.requireUser().getId(), "DELETE_EVENT");
    }

    @Transactional
    public void saveOccurrenceException(UUID id, OccurrenceExceptionRequest request) {
        Event event = requireEditable(id);
        if (occurrenceExceptions == null) {
            throw new DomainException("RECURRENCE_EXCEPTIONS_UNAVAILABLE", 500, "Recurrence exceptions are not configured.");
        }
        if (!List.of("MODIFIED", "CANCELLED").contains(request.action().toUpperCase(Locale.ROOT))) {
            throw new DomainException("INVALID_RECURRENCE_EXCEPTION", 422, "Exception action is invalid.");
        }
        if ("MODIFIED".equalsIgnoreCase(request.action())
                && ((request.overrideStart() == null) != (request.overrideEnd() == null)
                || (request.overrideStart() != null && !request.overrideStart().isBefore(request.overrideEnd())))) {
            throw new DomainException("INVALID_TIME_RANGE", 422, "Override start must be before override end.");
        }
        EventOccurrenceException exception = occurrenceExceptions.findByEventIdAndOccurrenceStart(id, request.occurrenceStart())
                .orElseGet(() -> new EventOccurrenceException(event, request.occurrenceStart(), request.action(),
                        request.overrideStart(), request.overrideEnd(), request.overrideTitle(),
                        request.overrideLocation(), request.overrideNotes()));
        if (exception.getId() != null) {
            exception.update(request.action(), request.overrideStart(), request.overrideEnd(),
                    request.overrideTitle(), request.overrideLocation(), request.overrideNotes());
        }
        occurrenceExceptions.save(exception);
        event.getSchedule().incrementVersion();
        activity.record(event.getSchedule().getId(), currentUser.requireUser().getId(), "RECURRENCE_EXCEPTION_CREATED");
    }

    @Transactional
    public void deleteOccurrenceException(UUID id, Instant occurrenceStart) {
        Event event = requireEditable(id);
        if (occurrenceExceptions != null) {
            occurrenceExceptions.findByEventIdAndOccurrenceStart(id, occurrenceStart).ifPresent(occurrenceExceptions::delete);
        }
        event.getSchedule().incrementVersion();
    }

    private void recalculateTaskRemaining(UUID taskId) {
        if (taskId == null || tasks == null) return;
        Optional<Task> taskOpt;
        try {
            taskOpt = tasks.findByIdWithLock(taskId);
        } catch (Exception e) {
            taskOpt = tasks.findById(taskId);
        }
        if (taskOpt == null || taskOpt.isEmpty()) {
            taskOpt = tasks.findById(taskId);
        }
        taskOpt.ifPresent(task -> {
            List<Event> linkedEvents = events.findAllBySourceTaskId(taskId);
            long scheduledMinutes = linkedEvents.stream()
                    .filter(e -> !"CANCELLED".equalsIgnoreCase(e.getStatus()))
                    .mapToLong(e -> Duration.between(e.getStartsAt(), e.getEndsAt()).toMinutes())
                    .sum();
            task.recalculateRemainingMinutes((int) scheduledMinutes);
            tasks.save(task);
        });
    }

    private Event requireEditable(UUID id) {
        Event event = events.findById(id).orElseThrow(() -> new DomainException("EVENT_NOT_FOUND", 404, "Event not found."));
        authorization.requireEditor(event.getSchedule().getId(), currentUser.requireUser().getId());
        return event;
    }

    private Event requireReadable(UUID id) {
        Event event = events.findById(id).orElseThrow(() -> new DomainException("EVENT_NOT_FOUND", 404, "Event not found."));
        authorization.requireViewer(event.getSchedule().getId(), currentUser.requireUser().getId());
        return event;
    }

    private EventResponse toResponse(Event e) {
        return toResponse(e, new RecurrenceService.Occurrence(e.getId().toString(), e.getId().toString(), e.getStartsAt(), e.getEndsAt()));
    }

    private Category category(UUID id, UUID ownerId, UUID scheduleOwnerId) {
        if (id == null) return null;
        return categories.findByIdAndOwnerId(id, ownerId)
                .or(() -> categories.findByIdAndOwnerId(id, scheduleOwnerId))
                .orElseThrow(() -> new DomainException("CATEGORY_ACCESS_DENIED", 403, "Category is not accessible."));
    }

    private void validateRange(Instant from, Instant to) {
        if (from == null || to == null || !from.isBefore(to)) {
            throw new DomainException("INVALID_TIME_RANGE", 422, "Event start must be before event end.");
        }
    }

    private String value(String value, String fallback, List<String> allowed) {
        String normalized = value == null ? fallback : value.toUpperCase();
        if (!allowed.contains(normalized)) {
            throw new DomainException("INVALID_EVENT_VALUE", 422, "Event priority or status is invalid.");
        }
        return normalized;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.toUpperCase();
    }

    private EventResponse toResponse(Event e, RecurrenceService.Occurrence occurrence) {
        return new EventResponse(
                e.getId(),
                e.getSchedule().getId(),
                e.getCategory() == null ? null : e.getCategory().getId(),
                e.getSourceTaskId(),
                occurrence.overrideTitle() == null ? e.getTitle() : occurrence.overrideTitle(),
                e.getDescription(),
                occurrence.startsAt(),
                occurrence.endsAt(),
                occurrence.overrideLocation() == null ? e.getLocation() : occurrence.overrideLocation(),
                e.getPriority(),
                e.getStatus(),
                e.getRecurrenceRule(),
                e.getReminderMinutes(),
                occurrence.overrideNotes() == null ? e.getNotes() : occurrence.overrideNotes(),
                e.isFixed(),
                e.isLocked(),
                e.getCreatedAt(),
                e.getUpdatedAt(),
                occurrence.occurrenceId(),
                occurrence.seriesId()
        );
    }
}
