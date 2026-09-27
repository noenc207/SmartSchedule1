package com.smartschedule.calendar.application;

import com.smartschedule.calendar.api.CalendarInteropDtos.*;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CalendarInteropService {
    private static final int MAX_BYTES = 2_000_000;
    private static final int MAX_EVENTS = 500;
    private final EventRepository events;
    private final AuthorizationService authorization;
    private final RecurrenceService recurrence;

    public CalendarInteropService(EventRepository events, AuthorizationService authorization,
                                  RecurrenceService recurrence) {
        this.events = events;
        this.authorization = authorization;
        this.recurrence = recurrence;
    }

    @Transactional(readOnly = true)
    public String export(UUID scheduleId, Instant from, Instant to, UUID userId) {
        Schedule schedule = authorization.requireViewer(scheduleId, userId);
        Instant start = from == null ? Instant.now().minus(Duration.ofDays(365)) : from;
        Instant end = to == null ? Instant.now().plus(Duration.ofDays(365)) : to;
        if (!start.isBefore(end)) throw new DomainException("INVALID_TIME_RANGE", 422, "Export range is invalid.");
        StringBuilder ics = new StringBuilder("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SmartSchedule//EN\r\n");
        ics.append("X-WR-TIMEZONE:").append(schedule.getTimezone()).append("\r\n");
        for (Event event : events.search(scheduleId, start, end, null, null, null)) {
            for (RecurrenceService.Occurrence occurrence : recurrence.expand(event, start, end)) {
                ics.append("BEGIN:VEVENT\r\n");
                ics.append("UID:").append(event.getId()).append("-").append(occurrence.occurrenceId()).append("\r\n");
                ics.append("DTSTART:").append(formatUtc(occurrence.startsAt())).append("\r\n");
                ics.append("DTEND:").append(formatUtc(occurrence.endsAt())).append("\r\n");
                ics.append("SUMMARY:").append(escape(event.getTitle())).append("\r\n");
                if (event.getDescription() != null) ics.append("DESCRIPTION:").append(escape(event.getDescription())).append("\r\n");
                if (event.getLocation() != null) ics.append("LOCATION:").append(escape(event.getLocation())).append("\r\n");
                ics.append("END:VEVENT\r\n");
            }
        }
        return ics.append("END:VCALENDAR\r\n").toString();
    }

    public ImportPreview preview(MultipartFile file, UUID scheduleId, UUID userId) {
        authorization.requireEditor(scheduleId, userId);
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new DomainException("ICS_FILE_INVALID", 422, "ICS file is empty or exceeds the size limit.");
        }
        try {
            String text = new String(file.getBytes(), StandardCharsets.UTF_8);
            List<ImportEvent> parsed = parse(text);
            List<ImportEvent> valid = parsed.stream().filter(item -> item.startsAt().isBefore(item.endsAt())).toList();
            int conflicts = (int) valid.stream().filter(item -> !events.search(scheduleId, item.startsAt(), item.endsAt(),
                    null, null, null).isEmpty()).count();
            return new ImportPreview(parsed.size(), valid.size(), parsed.size() - valid.size(), conflicts,
                    valid, List.of());
        } catch (Exception exception) {
            throw new DomainException("ICS_PARSE_FAILED", 422, "The ICS file could not be parsed.");
        }
    }

    @Transactional
    public int importEvents(UUID scheduleId, ImportRequest request, UUID userId) {
        Schedule schedule = authorization.requireEditor(scheduleId, userId);
        if (request == null || request.events() == null || request.events().size() > MAX_EVENTS) {
            throw new DomainException("ICS_IMPORT_INVALID", 422, "Import contains too many events.");
        }
        int imported = 0;
        for (ImportEvent item : request.events()) {
            if (item == null || item.title() == null || !item.startsAt().isBefore(item.endsAt())) continue;
            if (request.skipConflicts() && !events.search(scheduleId, item.startsAt(), item.endsAt(), null, null, null).isEmpty()) continue;
            events.save(new Event(schedule, null, item.title().trim(), item.description(), item.startsAt(), item.endsAt(),
                    item.location(), "MEDIUM", "SCHEDULED", null, null, null, false, false));
            imported++;
        }
        schedule.incrementVersion();
        return imported;
    }

    private List<ImportEvent> parse(String text) {
        String[] lines = text.replace("\r\n", "\n").split("\n");
        List<ImportEvent> result = new ArrayList<>();
        String title = null, description = null, location = null;
        Instant start = null, end = null;
        for (String line : lines) {
            if (line.startsWith("SUMMARY:")) title = unescape(line.substring(8));
            else if (line.startsWith("DESCRIPTION:")) description = unescape(line.substring(12));
            else if (line.startsWith("LOCATION:")) location = unescape(line.substring(9));
            else if (line.startsWith("DTSTART")) start = parseDate(line.substring(line.indexOf(':') + 1));
            else if (line.startsWith("DTEND")) end = parseDate(line.substring(line.indexOf(':') + 1));
            else if (line.equals("END:VEVENT")) {
                if (title != null && start != null && end != null) result.add(new ImportEvent(title, start, end, description, location));
                if (result.size() >= MAX_EVENTS) break;
                title = description = location = null; start = end = null;
            }
        }
        return result;
    }

    private Instant parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        try {
            return OffsetDateTime.parse(trimmed, DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmssX")).toInstant();
        } catch (Exception e1) {
            try {
                return LocalDateTime.parse(trimmed, DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss")).atZone(ZoneOffset.UTC).toInstant();
            } catch (Exception e2) {
                try {
                    return LocalDate.parse(trimmed, DateTimeFormatter.ofPattern("yyyyMMdd")).atStartOfDay(ZoneOffset.UTC).toInstant();
                } catch (Exception e3) {
                    try {
                        return Instant.parse(trimmed);
                    } catch (Exception e4) {
                        return null;
                    }
                }
            }
        }
    }
    private String formatUtc(Instant value) { return DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC).format(value); }
    private String escape(String value) { return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n"); }
    private String unescape(String value) { return value.replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\"); }
}
