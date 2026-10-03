package com.smartschedule.integration.google.application;

import com.smartschedule.common.error.ValidationException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.*;
import com.smartschedule.integration.google.domain.ExternalEventLink;
import com.smartschedule.integration.google.domain.GoogleImportJob;
import com.smartschedule.integration.google.domain.SyncStatus;
import com.smartschedule.integration.google.infrastructure.ExternalEventLinkRepository;
import com.smartschedule.integration.google.infrastructure.GoogleImportJobRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
public class GoogleSyncService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSyncService.class);

    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final ExternalEventLinkRepository eventLinkRepository;
    private final GoogleImportJobRepository importJobRepository;

    public GoogleSyncService(EventRepository eventRepository,
                             ScheduleRepository scheduleRepository,
                             ExternalEventLinkRepository eventLinkRepository,
                             GoogleImportJobRepository importJobRepository) {
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.eventLinkRepository = eventLinkRepository;
        this.importJobRepository = importJobRepository;
    }

    @Transactional
    public SyncResponse importSheetEvents(User user, String spreadsheetId, List<ParsedSheetEventDto> events, boolean skipConflicts) {
        if (events == null || events.isEmpty()) {
            return new SyncResponse(0, 0, 0, 0, "Không có sự kiện nào được chọn để nhập.");
        }

        Schedule schedule = resolveUserSchedule(user);
        ZoneId zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "Asia/Ho_Chi_Minh");

        int createdCount = 0;
        int conflictCount = 0;

        for (ParsedSheetEventDto ev : events) {
            if (ev.missingFields() != null && (ev.missingFields().contains("startTime") || ev.missingFields().contains("date"))) {
                continue; // Skip invalid rows without inventing data
            }

            if (ev.hasConflict()) {
                conflictCount++;
                if (skipConflicts) {
                    continue;
                }
            }

            try {
                LocalDate date = LocalDate.parse(ev.date());
                LocalTime sTime = LocalTime.parse(ev.startTime());
                LocalTime eTime = ev.endTime() != null ? LocalTime.parse(ev.endTime()) : sTime.plusHours(1);

                Instant startsAt = date.atTime(sTime).atZone(zoneId).toInstant();
                Instant endsAt = date.atTime(eTime).atZone(zoneId).toInstant();

                String externalId = "SHEET:" + spreadsheetId + ":" + ev.sourceRow();
                String desc = ev.instructor() != null && !ev.instructor().isBlank()
                        ? "Giảng viên: " + ev.instructor()
                        : "Nhập từ Google Sheets";

                Event event = new Event(
                        schedule,
                        null,
                        ev.title(),
                        desc,
                        startsAt,
                        endsAt,
                        ev.location(),
                        "MEDIUM",
                        "SCHEDULED",
                        null,
                        15,
                        "Nguồn: Google Sheets",
                        false,
                        false
                );
                event.setSource("GOOGLE_SHEETS");
                event.setExternalId(externalId);

                eventRepository.save(event);
                createdCount++;
            } catch (Exception ex) {
                log.warn("Error importing event row {}: {}", ev.sourceRow(), ex.getMessage());
            }
        }

        // Audit telemetry
        GoogleImportJob job = new GoogleImportJob(
                user.getId(),
                "GOOGLE_SHEETS",
                spreadsheetId != null ? spreadsheetId : "UNKNOWN",
                events.size(),
                events.size(),
                createdCount,
                conflictCount
        );
        importJobRepository.save(job);

        String msg = String.format("Đã nhập thành công %d sự kiện từ Google Sheets vào SmartSchedule.", createdCount);
        return new SyncResponse(createdCount, createdCount, 0, conflictCount, msg);
    }

    @Transactional
    public SyncResponse importCalendarEvents(User user, String calendarId, List<ParsedSheetEventDto> events, boolean skipConflicts) {
        if (events == null || events.isEmpty()) {
            return new SyncResponse(0, 0, 0, 0, "Không có sự kiện Google Calendar nào được chọn.");
        }

        Schedule schedule = resolveUserSchedule(user);
        ZoneId zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "Asia/Ho_Chi_Minh");
        String calId = calendarId != null && !calendarId.isBlank() ? calendarId : "primary";

        int createdCount = 0;
        int conflictCount = 0;

        for (ParsedSheetEventDto ev : events) {
            String googleEventId = ev.instructor(); // We stored googleEventId in instructor field
            if (googleEventId == null || googleEventId.isBlank()) {
                continue;
            }

            // Duplicate prevention
            if (eventLinkRepository.existsByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
                    user.getId(), "GOOGLE_CALENDAR", calId, googleEventId)) {
                continue;
            }

            if (ev.hasConflict()) {
                conflictCount++;
                if (skipConflicts) {
                    continue;
                }
            }

            try {
                LocalDate date = LocalDate.parse(ev.date());
                LocalTime sTime = LocalTime.parse(ev.startTime());
                LocalTime eTime = ev.endTime() != null ? LocalTime.parse(ev.endTime()) : sTime.plusHours(1);

                Instant startsAt = date.atTime(sTime).atZone(zoneId).toInstant();
                Instant endsAt = date.atTime(eTime).atZone(zoneId).toInstant();

                Event event = new Event(
                        schedule,
                        null,
                        ev.title(),
                        "Đồng bộ từ Google Calendar (" + calId + ")",
                        startsAt,
                        endsAt,
                        ev.location(),
                        "MEDIUM",
                        "SCHEDULED",
                        null,
                        15,
                        null,
                        false,
                        false
                );
                event.setSource("GOOGLE_CALENDAR");
                event.setExternalId(googleEventId);

                Event saved = eventRepository.save(event);

                // Create link
                ExternalEventLink link = new ExternalEventLink(
                        user.getId(),
                        calId,
                        googleEventId,
                        saved.getId()
                );
                eventLinkRepository.save(link);
                createdCount++;
            } catch (Exception ex) {
                log.warn("Error importing calendar event {}: {}", googleEventId, ex.getMessage());
            }
        }

        // Audit telemetry
        GoogleImportJob job = new GoogleImportJob(
                user.getId(),
                "GOOGLE_CALENDAR",
                calId,
                events.size(),
                events.size(),
                createdCount,
                conflictCount
        );
        importJobRepository.save(job);

        String msg = String.format("Đã đồng bộ thành công %d sự kiện từ Google Calendar vào SmartSchedule.", createdCount);
        return new SyncResponse(createdCount, createdCount, 0, conflictCount, msg);
    }

    private Schedule resolveUserSchedule(User user) {
        return scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> scheduleRepository.save(new Schedule(user, "Lịch cá nhân", "Lịch mặc định tạo tự động", "Asia/Ho_Chi_Minh", "PRIVATE")));
    }
}
