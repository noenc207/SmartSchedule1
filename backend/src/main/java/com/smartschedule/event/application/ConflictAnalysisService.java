package com.smartschedule.event.application;

import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.event.api.EventDtos.*;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ConflictAnalysisService {
    private static final long DAILY_CAPACITY_MINUTES = 8 * 60;
    private final EventRepository events;
    private final TaskRepository tasks;
    private final AvailabilityRepository availabilities;
    private final RecurrenceService recurrence;
    private final AuthorizationService authorization;
    private final CurrentUserService currentUser;

    public ConflictAnalysisService(EventRepository events, TaskRepository tasks, AvailabilityRepository availabilities,
                                   RecurrenceService recurrence, AuthorizationService authorization,
                                   CurrentUserService currentUser) {
        this.events = events;
        this.tasks = tasks;
        this.availabilities = availabilities;
        this.recurrence = recurrence;
        this.authorization = authorization;
        this.currentUser = currentUser;
    }

    public ConflictAnalysisResponse analyze(UUID scheduleId, Instant from, Instant to) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        List<EventOccurrence> occurrences = events.search(scheduleId, from, to, null, null, null).stream()
                .flatMap(event -> recurrence.expand(event, from, to).stream()
                        .map(occurrence -> new EventOccurrence(event, occurrence.startsAt(), occurrence.endsAt())))
                .toList();
        List<ConflictFinding> findings = new ArrayList<>();
        addEventOverlaps(occurrences, findings);
        addAvailabilityViolations(scheduleId, occurrences, findings);
        addOverloadedDays(occurrences, findings);
        addDeadlineFindings(scheduleId, from, to, findings);
        return summarize(from, to, findings);
    }

    private void addEventOverlaps(List<EventOccurrence> occurrences, List<ConflictFinding> findings) {
        for (int first = 0; first < occurrences.size(); first++) {
            for (int second = first + 1; second < occurrences.size(); second++) {
                EventOccurrence left = occurrences.get(first);
                EventOccurrence right = occurrences.get(second);
                if (!left.startsAt.isBefore(right.endsAt) || !left.endsAt.isAfter(right.startsAt)) continue;
                Instant overlapStart = left.startsAt.isAfter(right.startsAt) ? left.startsAt : right.startsAt;
                Instant overlapEnd = left.endsAt.isBefore(right.endsAt) ? left.endsAt : right.endsAt;
                findings.add(new ConflictFinding("EVENT_OVERLAP", overlapSeverity(left.event, right.event),
                        "Overlapping events",
                        "\"" + left.event.getTitle() + "\" overlaps \"" + right.event.getTitle() + "\".",
                        overlapStart, overlapEnd, right.event.getId().toString(), right.event.getTitle(),
                        Duration.between(overlapStart, overlapEnd).toMinutes()));
            }
        }
    }

    private void addAvailabilityViolations(UUID scheduleId, List<EventOccurrence> occurrences,
                                           List<ConflictFinding> findings) {
        List<Availability> rules = availabilities.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId);
        if (rules.isEmpty()) return;
        for (EventOccurrence occurrence : occurrences) {
            ZoneId zone = ZoneId.of(occurrence.event.getSchedule().getTimezone());
            ZonedDateTime localStart = occurrence.startsAt.atZone(zone);
            ZonedDateTime localEnd = occurrence.endsAt.atZone(zone);
            boolean covered = rules.stream().anyMatch(rule -> rule.isAvailable()
                    && rule.getWeekday() == localStart.getDayOfWeek().getValue()
                    && !localStart.toLocalTime().isBefore(rule.getStartsAt())
                    && !localEnd.toLocalTime().isAfter(rule.getEndsAt()));
            if (!covered) {
                findings.add(new ConflictFinding("AVAILABILITY_VIOLATION", occurrence.event.isFixed()
                        ? ConflictSeverity.WARNING : ConflictSeverity.ERROR,
                        "Outside available hours",
                        "\"" + occurrence.event.getTitle() + "\" is outside a configured available window.",
                        occurrence.startsAt, occurrence.endsAt, occurrence.event.getId().toString(),
                        occurrence.event.getTitle(), Duration.between(occurrence.startsAt, occurrence.endsAt).toMinutes()));
            }
        }
    }

    private void addOverloadedDays(List<EventOccurrence> occurrences, List<ConflictFinding> findings) {
        Map<LocalDate, List<EventOccurrence>> byDay = occurrences.stream().collect(Collectors.groupingBy(
                occurrence -> occurrence.startsAt.atZone(ZoneId.of(occurrence.event.getSchedule().getTimezone())).toLocalDate()));
        byDay.forEach((day, items) -> {
            long minutes = items.stream().mapToLong(item -> Duration.between(item.startsAt, item.endsAt).toMinutes()).sum();
            if (minutes > DAILY_CAPACITY_MINUTES) {
                findings.add(new ConflictFinding("OVERLOADED_DAY", ConflictSeverity.WARNING,
                        "Day exceeds planning capacity", day + " contains " + minutes + " scheduled minutes.",
                        items.get(0).startsAt, items.get(items.size() - 1).endsAt, null, null,
                        minutes - DAILY_CAPACITY_MINUTES));
            }
        });
    }

    private void addDeadlineFindings(UUID scheduleId, Instant from, Instant to, List<ConflictFinding> findings) {
        List<Availability> rules = availabilities.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId);
        if (rules.isEmpty()) return;
        for (Task task : tasks.findAllByScheduleId(scheduleId)) {
            if (task.getRemainingMinutes() <= 0 || task.getDeadline() == null || task.getDeadline().isBefore(from)
                    || task.getDeadline().isAfter(to)) continue;
            long availableMinutes = availableMinutesUntil(task.getSchedule().getTimezone(), rules, from, task.getDeadline());
            if (availableMinutes < task.getRemainingMinutes()) {
                findings.add(new ConflictFinding("DEADLINE_INFEASIBLE", task.getPriority().equals("URGENT")
                        ? ConflictSeverity.ERROR : ConflictSeverity.WARNING,
                        "Deadline may be infeasible",
                        "\"" + task.getTitle() + "\" needs " + task.getRemainingMinutes()
                                + " minutes but only " + availableMinutes + " available minutes remain.",
                        from, task.getDeadline(), task.getId().toString(), task.getTitle(),
                        task.getRemainingMinutes() - availableMinutes));
            }
        }
    }

    private long availableMinutesUntil(String timezone, List<Availability> rules, Instant from, Instant deadline) {
        if (rules.isEmpty()) return 0;
        ZoneId zone = ZoneId.of(timezone);
        long total = 0;
        for (LocalDate day = from.atZone(zone).toLocalDate(); !day.isAfter(deadline.atZone(zone).toLocalDate()); day = day.plusDays(1)) {
            for (Availability rule : rules) {
                if (!rule.isAvailable() || rule.getWeekday() != day.getDayOfWeek().getValue()) continue;
                Instant start = ZonedDateTime.of(day, rule.getStartsAt(), zone).toInstant();
                Instant end = ZonedDateTime.of(day, rule.getEndsAt(), zone).toInstant();
                Instant clippedStart = start.isAfter(from) ? start : from;
                Instant clippedEnd = end.isBefore(deadline) ? end : deadline;
                if (clippedStart.isBefore(clippedEnd)) total += Duration.between(clippedStart, clippedEnd).toMinutes();
            }
        }
        return total;
    }

    private ConflictSeverity overlapSeverity(Event left, Event right) {
        return left.isFixed() || right.isFixed() || left.isLocked() || right.isLocked()
                ? ConflictSeverity.ERROR : ConflictSeverity.WARNING;
    }

    private ConflictAnalysisResponse summarize(Instant from, Instant to, List<ConflictFinding> findings) {
        return new ConflictAnalysisResponse(from, to, findings,
                (int) findings.stream().filter(f -> f.severity() == ConflictSeverity.ERROR).count(),
                (int) findings.stream().filter(f -> f.severity() == ConflictSeverity.WARNING).count(),
                (int) findings.stream().filter(f -> f.severity() == ConflictSeverity.INFO).count());
    }

    private record EventOccurrence(Event event, Instant startsAt, Instant endsAt) {}
}
