package com.smartschedule.event.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.api.EventDtos.RecurrenceRule;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.domain.EventOccurrenceException;
import com.smartschedule.event.infrastructure.EventOccurrenceExceptionRepository;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RecurrenceService {
    private final ObjectMapper mapper;
    private final EventOccurrenceExceptionRepository exceptions;
    public RecurrenceService(ObjectMapper mapper) { this(mapper, null); }
    @Autowired
    public RecurrenceService(ObjectMapper mapper, EventOccurrenceExceptionRepository exceptions) {
        this.mapper = mapper;
        this.exceptions = exceptions;
    }
    public String serialize(RecurrenceRule rule, Instant startsAt) {
        if (rule == null || rule.frequency() == null || "NONE".equalsIgnoreCase(rule.frequency())) return null;
        validate(rule, startsAt);
        try { return mapper.writeValueAsString(rule); }
        catch (JsonProcessingException exception) { throw new DomainException("INVALID_RECURRENCE", 422, "Recurrence rule is invalid."); }
    }
    public RecurrenceRule parse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return mapper.readValue(raw, RecurrenceRule.class); }
        catch (Exception exception) { throw new DomainException("INVALID_RECURRENCE", 422, "Recurrence rule is invalid."); }
    }
    public List<Occurrence> expand(Event event, Instant from, Instant to) {
        RecurrenceRule rule = parse(event.getRecurrenceRule());
        if (rule == null) return List.of(new Occurrence(event.getId().toString(), event.getId().toString(), event.getStartsAt(), event.getEndsAt()));
        Duration duration = Duration.between(event.getStartsAt(), event.getEndsAt());
        ZoneId zone = ZoneId.of(event.getSchedule().getTimezone());
        ZonedDateTime base = event.getStartsAt().atZone(zone);
        List<Occurrence> result = new ArrayList<>();
        ZonedDateTime cursor = base;
        int produced = 0;
        while (cursor.toInstant().isBefore(to) && produced < (rule.count() == null ? 1000 : rule.count())) {
            if (!cursor.toInstant().plus(duration).isBefore(from) && allowed(rule, base, cursor)) {
                Instant occurrenceStart = cursor.toInstant();
                String occurrenceId = UUID.nameUUIDFromBytes((event.getId() + ":" + occurrenceStart).getBytes(StandardCharsets.UTF_8)).toString();
                Occurrence occurrence = new Occurrence(occurrenceId, event.getId().toString(), occurrenceStart, occurrenceStart.plus(duration));
                if (exceptions != null) {
                    occurrence = applyException(event, occurrence);
                }
                if (occurrence != null) {
                    result.add(occurrence);
                }
                produced++;
            }
                cursor = next(cursor, rule);
                if (rule.until() != null && cursor.toInstant().isAfter(rule.until())) break;
        }
        return result;
    }

    private Occurrence applyException(Event event, Occurrence occurrence) {
        EventOccurrenceException exception = exceptions.findByEventIdAndOccurrenceStart(
                    event.getId(), occurrence.startsAt()).orElse(null);
        if (exception == null || "CANCELLED".equalsIgnoreCase(exception.getAction())) {
                return exception == null ? occurrence : null;
        }
        Instant start = exception.getOverrideStart() == null ? occurrence.startsAt() : exception.getOverrideStart();
        Instant end = exception.getOverrideEnd() == null ? occurrence.endsAt() : exception.getOverrideEnd();
        return new Occurrence(occurrence.occurrenceId(), occurrence.seriesId(), start, end,
                    exception.getOverrideTitle(), exception.getOverrideLocation(), exception.getOverrideNotes());
    }
    private ZonedDateTime next(ZonedDateTime cursor, RecurrenceRule rule) {
        int interval = rule.interval() == null ? 1 : rule.interval();
        return switch (rule.frequency().toUpperCase(Locale.ROOT)) {
            case "DAILY" -> cursor.plusDays(interval);
            case "WEEKLY", "MONTHLY" -> cursor.plusDays(1);
            default -> throw new DomainException("INVALID_RECURRENCE", 422, "Unsupported recurrence frequency.");
        };
    }
    private boolean allowed(RecurrenceRule rule, ZonedDateTime base, ZonedDateTime value) {
        int interval = rule.interval() == null ? 1 : rule.interval();
        if ("WEEKLY".equalsIgnoreCase(rule.frequency())) {
            long weeks = java.time.temporal.ChronoUnit.WEEKS.between(base.toLocalDate(), value.toLocalDate());
            return weeks % interval == 0 && rule.byWeekdays().contains(value.getDayOfWeek().getValue());
        }
        if ("MONTHLY".equalsIgnoreCase(rule.frequency())) {
            long months = java.time.temporal.ChronoUnit.MONTHS.between(base.toLocalDate().withDayOfMonth(1), value.toLocalDate().withDayOfMonth(1));
            return months % interval == 0 && value.getDayOfMonth() == base.getDayOfMonth();
        }
        return true;
    }
    private void validate(RecurrenceRule rule, Instant startsAt) {
        String frequency = rule.frequency().toUpperCase(Locale.ROOT);
        if (!List.of("DAILY", "WEEKLY", "MONTHLY").contains(frequency)
                || rule.interval() == null || rule.interval() < 1
                || (rule.count() != null && rule.count() < 1)
                || (rule.until() != null && !rule.until().isAfter(startsAt))
                || (rule.byWeekdays() != null && rule.byWeekdays().stream().anyMatch(day -> day < 1 || day > 7))) {
            throw new DomainException("INVALID_RECURRENCE", 422, "Recurrence rule is invalid.");
        }
        if ("WEEKLY".equals(frequency) && (rule.byWeekdays() == null || rule.byWeekdays().isEmpty())) {
            throw new DomainException("INVALID_RECURRENCE", 422, "Weekly recurrence requires weekdays.");
        }
    }
    public static final class Occurrence {
        private final String occurrenceId;
        private final String seriesId;
        private final Instant startsAt;
        private final Instant endsAt;
        private final String overrideTitle;
        private final String overrideLocation;
        private final String overrideNotes;

        public Occurrence(String occurrenceId, String seriesId, Instant startsAt, Instant endsAt) {
            this(occurrenceId, seriesId, startsAt, endsAt, null, null, null);
        }

        public Occurrence(String occurrenceId, String seriesId, Instant startsAt, Instant endsAt,
                          String overrideTitle, String overrideLocation, String overrideNotes) {
            this.occurrenceId = occurrenceId;
            this.seriesId = seriesId;
            this.startsAt = startsAt;
            this.endsAt = endsAt;
            this.overrideTitle = overrideTitle;
            this.overrideLocation = overrideLocation;
            this.overrideNotes = overrideNotes;
        }

        public String occurrenceId() { return occurrenceId; }
        public String seriesId() { return seriesId; }
        public Instant startsAt() { return startsAt; }
        public Instant endsAt() { return endsAt; }
        public String overrideTitle() { return overrideTitle; }
        public String overrideLocation() { return overrideLocation; }
        public String overrideNotes() { return overrideNotes; }
    }
}
