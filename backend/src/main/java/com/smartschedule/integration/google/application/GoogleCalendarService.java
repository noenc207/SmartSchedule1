package com.smartschedule.integration.google.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.application.AiDateTimeUtils;
import com.smartschedule.common.error.ValidationException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.*;
import com.smartschedule.integration.google.domain.ExternalEventLink;
import com.smartschedule.integration.google.infrastructure.ExternalEventLinkRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);
    private static final String CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

    private final GoogleWorkspaceAuthService authService;
    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final ExternalEventLinkRepository eventLinkRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GoogleCalendarService(GoogleWorkspaceAuthService authService,
                                 EventRepository eventRepository,
                                 ScheduleRepository scheduleRepository,
                                 ExternalEventLinkRepository eventLinkRepository,
                                 ObjectMapper objectMapper) {
        this.authService = authService;
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.eventLinkRepository = eventLinkRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<GoogleCalendarDto> listCalendars(User user) {
        String token = authService.getValidAccessToken(user.getId());
        String url = CALENDAR_API_BASE + "/users/me/calendarList";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        List<GoogleCalendarDto> calendars = new ArrayList<>();
        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (res.getBody() != null) {
                JsonNode root = objectMapper.readTree(res.getBody());
                JsonNode items = root.path("items");
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        calendars.add(new GoogleCalendarDto(
                                item.path("id").asText("primary"),
                                item.path("summary").asText("Calendar"),
                                item.path("description").asText(null),
                                item.path("primary").asBoolean(false),
                                item.path("timeZone").asText("Asia/Ho_Chi_Minh")
                        ));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to list Google Calendars for user {}: {}", user.getId(), e.getMessage());
            throw new ValidationException("Không thể tải danh sách Google Calendar: " + e.getMessage());
        }

        return calendars;
    }

    @Transactional(readOnly = true)
    public List<GoogleCalendarEventDto> listEvents(User user, String calendarId, Instant timeMin, Instant timeMax) {
        String token = authService.getValidAccessToken(user.getId());
        String calId = (calendarId != null && !calendarId.isBlank()) ? calendarId : "primary";

        String url = CALENDAR_API_BASE + "/calendars/" + calId + "/events?singleEvents=true&orderBy=startTime&maxResults=250";
        if (timeMin != null) url += "&timeMin=" + timeMin.toString();
        if (timeMax != null) url += "&timeMax=" + timeMax.toString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        List<GoogleCalendarEventDto> events = new ArrayList<>();
        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (res.getBody() != null) {
                JsonNode root = objectMapper.readTree(res.getBody());
                JsonNode items = root.path("items");
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        JsonNode startNode = item.path("start");
                        JsonNode endNode = item.path("end");
                        boolean allDay = startNode.has("date");
                        String start = allDay ? startNode.path("date").asText() : startNode.path("dateTime").asText();
                        String end = allDay ? endNode.path("date").asText() : endNode.path("dateTime").asText();

                        events.add(new GoogleCalendarEventDto(
                                item.path("id").asText(),
                                item.path("summary").asText("(Không có tiêu đề)"),
                                item.path("description").asText(null),
                                item.path("location").asText(null),
                                start,
                                end,
                                allDay
                        ));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to list Google Calendar events for calendar {}: {}", calId, e.getMessage());
            throw new ValidationException("Không thể đọc sự kiện từ Google Calendar: " + e.getMessage());
        }

        return events;
    }

    @Transactional(readOnly = true)
    public CalendarImportResponse prepareCalendarImport(User user, String calendarId, Integer daysAhead) {
        int days = (daysAhead != null && daysAhead > 0) ? daysAhead : 14;
        ZoneId zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "Asia/Ho_Chi_Minh");
        Instant now = Instant.now();
        Instant until = now.plus(Duration.ofDays(days));

        String calId = (calendarId != null && !calendarId.isBlank()) ? calendarId : "primary";
        List<GoogleCalendarEventDto> gEvents = listEvents(user, calId, now, until);

        Schedule schedule = resolveUserSchedule(user);
        List<ParsedSheetEventDto> importCandidates = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        int newCount = 0;
        int duplicateCount = 0;
        int conflictCount = 0;
        int index = 1;

        for (GoogleCalendarEventDto ge : gEvents) {
            // 1. Duplicate check via external identity
            boolean isDuplicate = eventLinkRepository.existsByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
                    user.getId(), "GOOGLE_CALENDAR", calId, ge.id()
            );

            if (isDuplicate) {
                duplicateCount++;
                continue; // Do not import already linked events
            }

            // Parse dates and times
            String dateStr = null;
            String startTimeStr = null;
            String endTimeStr = null;
            boolean hasConflict = false;
            String conflictDetails = null;
            List<String> missingFields = new ArrayList<>();

            if (ge.start() != null) {
                try {
                    if (ge.allDay()) {
                        dateStr = ge.start();
                        startTimeStr = "08:00";
                        endTimeStr = "17:00";
                    } else {
                        ZonedDateTime zdtStart = ZonedDateTime.parse(ge.start()).withZoneSameInstant(zoneId);
                        ZonedDateTime zdtEnd = ge.end() != null ? ZonedDateTime.parse(ge.end()).withZoneSameInstant(zoneId) : zdtStart.plusHours(1);

                        dateStr = zdtStart.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
                        startTimeStr = zdtStart.toLocalTime().format(AiDateTimeUtils.TIME_FMT);
                        endTimeStr = zdtEnd.toLocalTime().format(AiDateTimeUtils.TIME_FMT);

                        // Conflict check
                        Instant sInstant = zdtStart.toInstant();
                        Instant eInstant = zdtEnd.toInstant();
                        List<Event> overlaps = eventRepository.search(schedule.getId(), sInstant, eInstant, null, null, null);
                        if (!overlaps.isEmpty()) {
                            hasConflict = true;
                            conflictCount++;
                            Event clash = overlaps.get(0);
                            conflictDetails = String.format("Trùng với '%s' (%s–%s)",
                                    clash.getTitle(),
                                    clash.getStartsAt().atZone(zoneId).format(AiDateTimeUtils.TIME_FMT),
                                    clash.getEndsAt().atZone(zoneId).format(AiDateTimeUtils.TIME_FMT));
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Failed parsing Google event dateTime {}: {}", ge.start(), ex.getMessage());
                    missingFields.add("startTime");
                }
            } else {
                missingFields.add("date");
                missingFields.add("startTime");
            }

            ParsedSheetEventDto parsed = new ParsedSheetEventDto(
                    ge.summary(),
                    dateStr,
                    startTimeStr,
                    endTimeStr,
                    ge.location(),
                    ge.id(), // Use instructor field to store external Google event ID
                    1.0,
                    index++,
                    hasConflict,
                    conflictDetails,
                    missingFields
            );

            importCandidates.add(parsed);
            newCount++;
        }

        if (duplicateCount > 0) {
            warnings.add(String.format("Bỏ qua %d sự kiện đã có trong SmartSchedule.", duplicateCount));
        }
        if (conflictCount > 0) {
            warnings.add(String.format("Phát hiện %d sự kiện xung đột giờ với lịch hiện có.", conflictCount));
        }

        return new CalendarImportResponse(
                calId,
                gEvents.size(),
                newCount,
                duplicateCount,
                conflictCount,
                importCandidates,
                warnings
        );
    }

    @Transactional
    public CalendarExportResponse exportEvent(User user, UUID smartEventId, String calendarId) {
        String calId = (calendarId != null && !calendarId.isBlank()) ? calendarId : "primary";
        Schedule schedule = resolveUserSchedule(user);

        Event event = eventRepository.findByIdAndScheduleId(smartEventId, schedule.getId())
                .orElseThrow(() -> new ValidationException("Không tìm thấy sự kiện SmartSchedule để xuất."));

        ZoneId zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "Asia/Ho_Chi_Minh");
        String googleEventId = createCalendarEvent(
                user,
                calId,
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getStartsAt(),
                event.getEndsAt(),
                zoneId
        );

        // Update external link mapping
        ExternalEventLink link = eventLinkRepository.findBySmartEventId(smartEventId)
                .orElse(new ExternalEventLink(user.getId(), calId, googleEventId, smartEventId));
        link.setLastSyncedAt(Instant.now());
        eventLinkRepository.save(link);

        event.setExternalId(googleEventId);
        event.setSource("GOOGLE_CALENDAR");
        eventRepository.save(event);

        return new CalendarExportResponse(
                smartEventId,
                calId,
                googleEventId,
                "SYNCED",
                "Đã đẩy thành công sự kiện '" + event.getTitle() + "' sang Google Calendar."
        );
    }

    public String createCalendarEvent(User user, String calendarId, String title, String description,
                                      String location, Instant startsAt, Instant endsAt, ZoneId zoneId) {
        String token = authService.getValidAccessToken(user.getId());
        String calId = (calendarId != null && !calendarId.isBlank()) ? calendarId : "primary";
        String url = CALENDAR_API_BASE + "/calendars/" + calId + "/events";

        ZonedDateTime sZdt = startsAt.atZone(zoneId);
        ZonedDateTime eZdt = endsAt.atZone(zoneId);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("summary", title);
        if (description != null) payload.put("description", description);
        if (location != null) payload.put("location", location);
        payload.put("start", Map.of("dateTime", sZdt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)));
        payload.put("end", Map.of("dateTime", eZdt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> res = restTemplate.postForEntity(url, entity, Map.class);
            if (res.getBody() != null && res.getBody().containsKey("id")) {
                return (String) res.getBody().get("id");
            }
            throw new ValidationException("Google Calendar không trả về ID sự kiện mới.");
        } catch (Exception e) {
            log.error("Failed creating Google Calendar event: {}", e.getMessage());
            throw new ValidationException("Không thể tạo sự kiện trên Google Calendar: " + e.getMessage());
        }
    }

    public void deleteCalendarEvent(User user, String calendarId, String eventId) {
        String token = authService.getValidAccessToken(user.getId());
        String calId = (calendarId != null && !calendarId.isBlank()) ? calendarId : "primary";
        String url = CALENDAR_API_BASE + "/calendars/" + calId + "/events/" + eventId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
        } catch (Exception e) {
            log.warn("Could not delete Google Calendar event {}: {}", eventId, e.getMessage());
        }
    }

    private Schedule resolveUserSchedule(User user) {
        return scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> scheduleRepository.save(new Schedule(user, "Lịch cá nhân", "Lịch mặc định tạo tự động", "Asia/Ho_Chi_Minh", "PRIVATE")));
    }
}
