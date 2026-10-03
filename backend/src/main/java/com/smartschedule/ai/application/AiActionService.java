package com.smartschedule.ai.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.domain.AiAction;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.infrastructure.AiActionRepository;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AiActionService {
    private static final Logger log = LoggerFactory.getLogger(AiActionService.class);

    private final AiActionRepository actionRepository;
    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final ObjectMapper objectMapper;

    public record ConflictResult(boolean hasConflict, String details) {}

    public AiActionService(AiActionRepository actionRepository,
                           EventRepository eventRepository,
                           ScheduleRepository scheduleRepository,
                           ObjectMapper objectMapper) {
        this.actionRepository = actionRepository;
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AiDtos.ProposedActionDto proposeAction(User user,
                                                  AiConversation conversation,
                                                  String toolName,
                                                  Map<String, Object> arguments,
                                                  AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        Schedule schedule = resolveUserSchedule(user);

        String summary = "";
        boolean hasConflict = false;
        String conflictDetails = null;
        UUID targetEventId = null;
        Map<String, Object> canonicalParams = new LinkedHashMap<>();

        switch (toolName) {
            case "create_schedule" -> {
                String title = getString(arguments, "title", null);
                if (title == null || title.isBlank()) {
                    throw new AiException("MISSING_TITLE", "Vui lòng cung cấp tên sự kiện hoặc môn học.");
                }

                // Date resolution: arguments -> clientContext -> today in user timezone
                LocalDate refDate = null;
                if (arguments.containsKey("date") && arguments.get("date") != null && !arguments.get("date").toString().isBlank()) {
                    try {
                        refDate = LocalDate.parse(arguments.get("date").toString().trim());
                    } catch (Exception ignored) {}
                }
                if (refDate == null && clientContext != null && clientContext.selectedDate() != null && !clientContext.selectedDate().isBlank()) {
                    try {
                        refDate = LocalDate.parse(clientContext.selectedDate().trim());
                    } catch (Exception ignored) {}
                }
                if (refDate == null) {
                    refDate = LocalDate.now(zoneId);
                }

                // STRICT VALIDATION: Start time is required, NO SILENT DEFAULT
                LocalTime startTime = AiDateTimeUtils.parseLocalTime(arguments.get("start_time"));
                if (startTime == null) {
                    throw new AiException("MISSING_START_TIME", "Vui lòng cung cấp giờ bắt đầu cho sự kiện.");
                }

                // End time or duration required, NO SILENT DEFAULT
                LocalTime endTime = AiDateTimeUtils.parseLocalTime(arguments.get("end_time"));
                Integer durationMinutes = AiDateTimeUtils.parseDurationMinutes(arguments.get("duration_minutes"));

                if (endTime == null && (durationMinutes == null || durationMinutes <= 0)) {
                    throw new AiException("MISSING_DURATION", "Vui lòng cung cấp thời lượng hoặc giờ kết thúc cho sự kiện.");
                }

                // Single canonical time utility calculates start/end Instants
                AiDateTimeUtils.TimeRange timeRange = AiDateTimeUtils.calculateTimeRange(
                        refDate, startTime, endTime, durationMinutes, zoneId
                );

                ConflictResult cr = detectConflict(schedule.getId(), timeRange.startsAt(), timeRange.endsAt(), null, zoneId);
                hasConflict = cr.hasConflict();
                conflictDetails = cr.details();

                String location = getString(arguments, "location", null);
                String description = getString(arguments, "description", null);

                // Build canonical parameters map (SINGLE SOURCE OF TRUTH)
                canonicalParams.put("title", title.trim());
                canonicalParams.put("date", timeRange.startDate().toString());
                canonicalParams.put("start_time", timeRange.startTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("end_time", timeRange.endTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("duration_minutes", timeRange.durationMinutes());
                canonicalParams.put("starts_at", timeRange.startsAt().toString());
                canonicalParams.put("ends_at", timeRange.endsAt().toString());
                canonicalParams.put("timezone", zoneId.getId());
                if (location != null && !location.isBlank()) {
                    canonicalParams.put("location", location.trim());
                }
                if (description != null && !description.isBlank()) {
                    canonicalParams.put("description", description.trim());
                }

                ZonedDateTime sLocal = timeRange.startsAt().atZone(zoneId);
                ZonedDateTime eLocal = timeRange.endsAt().atZone(zoneId);

                summary = String.format("Tạo lịch: %s vào %s (%s–%s)",
                        title.trim(), sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                        sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));
            }

            case "reschedule_event" -> {
                Event target = findTargetEvent(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy sự kiện cần dời lịch.");
                }
                targetEventId = target.getId();

                LocalDate date = null;
                if (arguments.containsKey("date") && arguments.get("date") != null && !arguments.get("date").toString().isBlank()) {
                    try {
                        date = LocalDate.parse(arguments.get("date").toString().trim());
                    } catch (Exception ignored) {}
                }
                if (date == null) {
                    date = target.getStartsAt().atZone(zoneId).toLocalDate();
                }

                LocalTime newStart = AiDateTimeUtils.parseLocalTime(arguments.get("new_start_time"));
                if (newStart == null) {
                    throw new AiException("MISSING_START_TIME", "Vui lòng cung cấp giờ bắt đầu mới để dời lịch.");
                }

                LocalTime newEnd = AiDateTimeUtils.parseLocalTime(arguments.get("new_end_time"));
                Integer durationMinutes = null;
                if (newEnd == null) {
                    long diff = Duration.between(target.getStartsAt(), target.getEndsAt()).toMinutes();
                    durationMinutes = (int) Math.max(15, diff);
                }

                AiDateTimeUtils.TimeRange timeRange = AiDateTimeUtils.calculateTimeRange(
                        date, newStart, newEnd, durationMinutes, zoneId
                );

                ConflictResult cr = detectConflict(schedule.getId(), timeRange.startsAt(), timeRange.endsAt(), target.getId(), zoneId);
                hasConflict = cr.hasConflict();
                conflictDetails = cr.details();

                canonicalParams.put("event_id", target.getId().toString());
                canonicalParams.put("title", target.getTitle());
                canonicalParams.put("date", timeRange.startDate().toString());
                canonicalParams.put("new_start_time", timeRange.startTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("new_end_time", timeRange.endTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("starts_at", timeRange.startsAt().toString());
                canonicalParams.put("ends_at", timeRange.endsAt().toString());
                canonicalParams.put("timezone", zoneId.getId());

                ZonedDateTime sLocal = timeRange.startsAt().atZone(zoneId);
                ZonedDateTime eLocal = timeRange.endsAt().atZone(zoneId);

                summary = String.format("Dời lịch '%s' sang %s (%s–%s)",
                        target.getTitle(), sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                        sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));
            }

            case "update_schedule" -> {
                Event target = findTargetEvent(user, arguments, clientContext);
                if (target != null) {
                    targetEventId = target.getId();
                    String newTitle = getString(arguments, "title", target.getTitle());
                    LocalDate refDate = target.getStartsAt().atZone(zoneId).toLocalDate();

                    LocalTime startTime = arguments.containsKey("start_time")
                            ? AiDateTimeUtils.parseLocalTime(arguments.get("start_time"))
                            : target.getStartsAt().atZone(zoneId).toLocalTime();

                    LocalTime endTime = arguments.containsKey("end_time")
                            ? AiDateTimeUtils.parseLocalTime(arguments.get("end_time"))
                            : target.getEndsAt().atZone(zoneId).toLocalTime();

                    AiDateTimeUtils.TimeRange timeRange = AiDateTimeUtils.calculateTimeRange(
                            refDate, startTime, endTime, null, zoneId
                    );

                    ConflictResult cr = detectConflict(schedule.getId(), timeRange.startsAt(), timeRange.endsAt(), target.getId(), zoneId);
                    hasConflict = cr.hasConflict();
                    conflictDetails = cr.details();

                    canonicalParams.put("event_id", target.getId().toString());
                    canonicalParams.put("title", newTitle);
                    canonicalParams.put("date", timeRange.startDate().toString());
                    canonicalParams.put("start_time", timeRange.startTime().format(AiDateTimeUtils.TIME_FMT));
                    canonicalParams.put("end_time", timeRange.endTime().format(AiDateTimeUtils.TIME_FMT));
                    canonicalParams.put("starts_at", timeRange.startsAt().toString());
                    canonicalParams.put("ends_at", timeRange.endsAt().toString());
                    canonicalParams.put("timezone", zoneId.getId());
                    if (arguments.containsKey("location")) {
                        canonicalParams.put("location", getString(arguments, "location", null));
                    }
                    if (arguments.containsKey("description")) {
                        canonicalParams.put("description", getString(arguments, "description", null));
                    }

                    ZonedDateTime sLocal = timeRange.startsAt().atZone(zoneId);
                    ZonedDateTime eLocal = timeRange.endsAt().atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");

                    summary = String.format("Cập nhật lịch: '%s' -> '%s' (%s, %s–%s)",
                            target.getTitle(), newTitle, sLocal.format(dateFmt),
                            sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));
                } else {
                    summary = "Cập nhật lịch trình: " + getString(arguments, "title", "sự kiện");
                    canonicalParams.putAll(arguments);
                }
            }

            case "replace_schedule" -> {
                String targetTitle = getString(arguments, "target_title", getString(arguments, "title", null));
                Event target = findTargetEvent(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy lịch học nào phù hợp với '" + (targetTitle != null ? targetTitle : "yêu cầu") + "' để thay thế.");
                }
                targetEventId = target.getId();

                String newTitle = getString(arguments, "new_title", null);
                if (newTitle == null || newTitle.isBlank()) {
                    newTitle = getString(arguments, "title", "Lịch mới");
                }

                // Check if new date/time specified; if not, INHERIT from target
                LocalDate date = null;
                if (arguments.containsKey("date") && arguments.get("date") != null && !arguments.get("date").toString().isBlank()) {
                    try {
                        date = LocalDate.parse(arguments.get("date").toString().trim());
                    } catch (Exception ignored) {}
                }
                if (date == null) {
                    date = target.getStartsAt().atZone(zoneId).toLocalDate();
                }

                boolean customStart = arguments.containsKey("start_time") && arguments.get("start_time") != null && !arguments.get("start_time").toString().isBlank();
                boolean customEnd = arguments.containsKey("end_time") && arguments.get("end_time") != null && !arguments.get("end_time").toString().isBlank();

                LocalTime startTime = customStart
                        ? AiDateTimeUtils.parseLocalTime(arguments.get("start_time"))
                        : target.getStartsAt().atZone(zoneId).toLocalTime();

                Integer durationMinutes = arguments.containsKey("duration_minutes")
                        ? AiDateTimeUtils.parseDurationMinutes(arguments.get("duration_minutes"))
                        : (int) Math.max(15, Duration.between(target.getStartsAt(), target.getEndsAt()).toMinutes());

                LocalTime endTime;
                if (customEnd) {
                    endTime = AiDateTimeUtils.parseLocalTime(arguments.get("end_time"));
                } else if (customStart) {
                    endTime = startTime.plusMinutes(durationMinutes);
                } else {
                    endTime = target.getEndsAt().atZone(zoneId).toLocalTime();
                }

                AiDateTimeUtils.TimeRange timeRange = AiDateTimeUtils.calculateTimeRange(
                        date, startTime, endTime, durationMinutes, zoneId
                );

                ConflictResult cr = detectConflict(schedule.getId(), timeRange.startsAt(), timeRange.endsAt(), target.getId(), zoneId);
                hasConflict = cr.hasConflict();
                conflictDetails = cr.details();

                canonicalParams.put("target_event_id", target.getId().toString());
                canonicalParams.put("target_title", target.getTitle());
                canonicalParams.put("new_title", newTitle.trim());
                canonicalParams.put("date", timeRange.startDate().toString());
                canonicalParams.put("start_time", timeRange.startTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("end_time", timeRange.endTime().format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("duration_minutes", timeRange.durationMinutes());
                canonicalParams.put("starts_at", timeRange.startsAt().toString());
                canonicalParams.put("ends_at", timeRange.endsAt().toString());
                canonicalParams.put("timezone", zoneId.getId());
                canonicalParams.put("location", getString(arguments, "location", target.getLocation()));
                canonicalParams.put("description", getString(arguments, "description", target.getDescription()));

                ZonedDateTime sLocal = timeRange.startsAt().atZone(zoneId);
                ZonedDateTime eLocal = timeRange.endsAt().atZone(zoneId);

                summary = String.format("Thay lịch: Xóa '%s' và thay bằng '%s' vào %s (%s–%s)",
                        target.getTitle(), newTitle.trim(), sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                        sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));
            }

            case "delete_schedule" -> {
                Event target = findTargetEvent(user, arguments, clientContext);
                if (target != null) {
                    targetEventId = target.getId();
                    ZonedDateTime sLocal = target.getStartsAt().atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM HH:mm");
                    summary = String.format("Xóa lịch: '%s' (%s)", target.getTitle(), sLocal.format(dateFmt));
                    canonicalParams.put("event_id", target.getId().toString());
                    canonicalParams.put("title", target.getTitle());
                } else {
                    summary = "Xóa lịch: " + getString(arguments, "title", "sự kiện đã chọn");
                    canonicalParams.putAll(arguments);
                }
            }

            default -> {
                summary = "Thực hiện hành động: " + toolName;
                canonicalParams.putAll(arguments);
            }
        }

        String paramsJson = "{}";
        try {
            paramsJson = objectMapper.writeValueAsString(canonicalParams);
        } catch (Exception e) {
            log.warn("Failed serializing action canonical parameters: {}", e.getMessage());
        }

        AiAction action = new AiAction(
                user,
                conversation,
                toolName,
                summary,
                paramsJson,
                hasConflict,
                conflictDetails,
                targetEventId,
                Instant.now().plusSeconds(900) // 15 mins TTL
        );

        actionRepository.save(action);
        return toDto(action);
    }

    @Transactional
    public AiDtos.ActionConfirmResponse confirmAction(User user, UUID actionId) {
        AiAction action = actionRepository.findByIdAndUserId(actionId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy yêu cầu xác nhận hoặc bạn không có quyền."));

        if (action.isExpired()) {
            throw new AiException("ACTION_EXPIRED", "Yêu cầu này đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu lại.");
        }

        if (!AiAction.STATUS_PROPOSED.equalsIgnoreCase(action.getStatus())) {
            throw new AiException("ACTION_ALREADY_PROCESSED", "Yêu cầu này đã được xử lý (trạng thái: " + action.getStatus() + ").");
        }

        // Atomic lock to EXECUTING
        action.markExecuting();
        actionRepository.saveAndFlush(action);

        Map<String, Object> params = parseParams(action.getParametersJson());

        // Resolve zone from canonical parameters first, fallback to user timezone
        ZoneId zoneId = params.containsKey("timezone") && params.get("timezone") != null
                ? ZoneId.of(params.get("timezone").toString().trim())
                : resolveZone(user.getTimezone(), null);

        Schedule schedule = resolveUserSchedule(user);

        try {
            UUID createdOrModifiedId = null;
            String message;
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("tool", action.getTool());
            data.put("summary", action.getSummary());

            switch (action.getTool()) {
                case "create_schedule" -> {
                    String title = getString(params, "title", "Lịch mới");
                    String description = getString(params, "description", null);
                    String location = getString(params, "location", null);

                    Instant startsAt;
                    Instant endsAt;

                    if (params.containsKey("starts_at") && params.containsKey("ends_at")
                            && params.get("starts_at") != null && params.get("ends_at") != null) {
                        // SINGLE SOURCE OF TRUTH: exact agreed canonical instants
                        startsAt = Instant.parse(params.get("starts_at").toString().trim());
                        endsAt = Instant.parse(params.get("ends_at").toString().trim());
                    } else {
                        // Legacy fallback using AiDateTimeUtils
                        LocalDate refDate = resolveReferenceDate(params, null, zoneId);
                        LocalTime sTime = AiDateTimeUtils.parseLocalTime(params.get("start_time"));
                        LocalTime eTime = AiDateTimeUtils.parseLocalTime(params.get("end_time"));
                        Integer dur = AiDateTimeUtils.parseDurationMinutes(params.get("duration_minutes"));
                        var tr = AiDateTimeUtils.calculateTimeRange(refDate, sTime, eTime, dur, zoneId);
                        startsAt = tr.startsAt();
                        endsAt = tr.endsAt();
                    }

                    if (!startsAt.isBefore(endsAt)) {
                        throw new AiException("INVALID_TIME", "Thời gian bắt đầu phải trước thời gian kết thúc.");
                    }

                    Event newEvent = new Event(
                            schedule,
                            null,
                            title,
                            description,
                            startsAt,
                            endsAt,
                            location,
                            "MEDIUM",
                            "CONFIRMED",
                            null,
                            15,
                            "Tạo bởi SmartSchedule AI",
                            false,
                            false
                    );
                    eventRepository.save(newEvent);

                    // MISMATCH DETECTION GUARD: Guarantee saved event matches proposed time
                    if (!newEvent.getStartsAt().equals(startsAt) || !newEvent.getEndsAt().equals(endsAt)) {
                        log.error("Execution mismatch: proposed {} - {} but saved {} - {}",
                                startsAt, endsAt, newEvent.getStartsAt(), newEvent.getEndsAt());
                        throw new AiException("DATA_MISMATCH", "Thời gian lưu vào hệ thống không khớp với thời gian đề xuất.");
                    }

                    createdOrModifiedId = newEvent.getId();
                    action.setTargetEventId(createdOrModifiedId);

                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);

                    message = String.format("Đã tạo lịch '%s' vào %s (%s–%s) thành công.",
                            title, sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                            sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));

                    data.put("eventId", newEvent.getId());
                    data.put("title", newEvent.getTitle());
                    data.put("startsAt", newEvent.getStartsAt().toString());
                    data.put("endsAt", newEvent.getEndsAt().toString());
                    data.put("date", sLocal.toLocalDate().toString());
                    data.put("startTime", sLocal.format(AiDateTimeUtils.TIME_FMT));
                    data.put("endTime", eLocal.format(AiDateTimeUtils.TIME_FMT));
                    if (location != null) data.put("location", location);
                }

                case "reschedule_event" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    Instant startsAt;
                    Instant endsAt;

                    if (params.containsKey("starts_at") && params.containsKey("ends_at")
                            && params.get("starts_at") != null && params.get("ends_at") != null) {
                        startsAt = Instant.parse(params.get("starts_at").toString().trim());
                        endsAt = Instant.parse(params.get("ends_at").toString().trim());
                    } else {
                        LocalDate refDate = resolveReferenceDate(params, null, zoneId);
                        LocalTime sTime = AiDateTimeUtils.parseLocalTime(params.get("new_start_time"));
                        LocalTime eTime = AiDateTimeUtils.parseLocalTime(params.get("new_end_time"));
                        Integer dur = (int) Math.max(15, Duration.between(event.getStartsAt(), event.getEndsAt()).toMinutes());
                        var tr = AiDateTimeUtils.calculateTimeRange(refDate, sTime, eTime, dur, zoneId);
                        startsAt = tr.startsAt();
                        endsAt = tr.endsAt();
                    }

                    event.update(event.getCategory(), event.getTitle(), event.getDescription(), startsAt, endsAt,
                            event.getLocation(), event.getPriority(), event.getStatus(), event.getRecurrenceRule(),
                            event.getReminderMinutes(), event.getNotes(), event.isFixed(), event.isLocked());

                    eventRepository.save(event);

                    if (!event.getStartsAt().equals(startsAt) || !event.getEndsAt().equals(endsAt)) {
                        throw new AiException("DATA_MISMATCH", "Thời gian lưu vào hệ thống không khớp với thời gian đề xuất.");
                    }

                    createdOrModifiedId = event.getId();
                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);

                    message = String.format("Đã dời lịch '%s' sang %s (%s–%s) thành công.",
                            event.getTitle(), sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                            sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));

                    data.put("eventId", event.getId());
                    data.put("title", event.getTitle());
                    data.put("startsAt", event.getStartsAt().toString());
                    data.put("endsAt", event.getEndsAt().toString());
                    data.put("date", sLocal.toLocalDate().toString());
                    data.put("startTime", sLocal.format(AiDateTimeUtils.TIME_FMT));
                    data.put("endTime", eLocal.format(AiDateTimeUtils.TIME_FMT));
                }

                case "update_schedule" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    String newTitle = getString(params, "title", event.getTitle());
                    String description = getString(params, "description", event.getDescription());
                    String location = getString(params, "location", event.getLocation());

                    Instant startsAt = event.getStartsAt();
                    Instant endsAt = event.getEndsAt();

                    if (params.containsKey("starts_at") && params.get("starts_at") != null) {
                        startsAt = Instant.parse(params.get("starts_at").toString().trim());
                    }
                    if (params.containsKey("ends_at") && params.get("ends_at") != null) {
                        endsAt = Instant.parse(params.get("ends_at").toString().trim());
                    }

                    event.update(event.getCategory(), newTitle, description, startsAt, endsAt, location,
                            event.getPriority(), event.getStatus(), event.getRecurrenceRule(), event.getReminderMinutes(),
                            event.getNotes(), event.isFixed(), event.isLocked());

                    eventRepository.save(event);
                    createdOrModifiedId = event.getId();

                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");

                    message = String.format("Đã cập nhật lịch '%s' (%s, %s–%s) thành công.",
                            newTitle, sLocal.format(dateFmt),
                            sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));

                    data.put("eventId", event.getId());
                    data.put("title", newTitle);
                    data.put("startsAt", startsAt.toString());
                    data.put("endsAt", endsAt.toString());
                }

                case "replace_schedule" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    String oldTitle = event.getTitle();
                    String newTitle = getString(params, "new_title", "Lịch mới");
                    String description = getString(params, "description", event.getDescription());
                    String location = getString(params, "location", event.getLocation());

                    Instant startsAt;
                    Instant endsAt;

                    if (params.containsKey("starts_at") && params.containsKey("ends_at")
                            && params.get("starts_at") != null && params.get("ends_at") != null) {
                        startsAt = Instant.parse(params.get("starts_at").toString().trim());
                        endsAt = Instant.parse(params.get("ends_at").toString().trim());
                    } else {
                        startsAt = event.getStartsAt();
                        endsAt = event.getEndsAt();
                    }

                    // Atomic update / replacement in single transaction
                    event.update(event.getCategory(), newTitle, description, startsAt, endsAt, location,
                            event.getPriority(), event.getStatus(), event.getRecurrenceRule(), event.getReminderMinutes(),
                            event.getNotes(), event.isFixed(), event.isLocked());

                    eventRepository.save(event);
                    createdOrModifiedId = event.getId();

                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);

                    message = String.format("Đã thay lịch '%s' bằng '%s' vào %s (%s–%s) thành công.",
                            oldTitle, newTitle, sLocal.format(AiDateTimeUtils.VI_DATE_FMT),
                            sLocal.format(AiDateTimeUtils.TIME_FMT), eLocal.format(AiDateTimeUtils.TIME_FMT));

                    data.put("operation", "REPLACE_SCHEDULE");
                    data.put("oldTitle", oldTitle);
                    data.put("newTitle", newTitle);
                    data.put("eventId", createdOrModifiedId);
                    data.put("startsAt", startsAt.toString());
                    data.put("endsAt", endsAt.toString());
                    data.put("date", sLocal.toLocalDate().toString());
                    data.put("startTime", sLocal.format(AiDateTimeUtils.TIME_FMT));
                    data.put("endTime", eLocal.format(AiDateTimeUtils.TIME_FMT));
                }

                case "delete_schedule" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    String oldTitle = event.getTitle();
                    createdOrModifiedId = event.getId();
                    eventRepository.delete(event);
                    message = String.format("Đã xóa lịch '%s' thành công.", oldTitle);
                    data.put("eventId", createdOrModifiedId);
                    data.put("title", oldTitle);
                }

                default -> throw new AiException("UNSUPPORTED_ACTION", "Hành động không được hỗ trợ: " + action.getTool());
            }

            action.markSuccess(message);
            actionRepository.save(action);

            return new AiDtos.ActionConfirmResponse(
                    action.getId(),
                    AiAction.STATUS_SUCCESS,
                    message,
                    createdOrModifiedId,
                    data
            );

        } catch (AiException ex) {
            log.error("AI action execution rejected: {}", ex.getMessage());
            action.markFailed(ex.getMessage());
            actionRepository.save(action);
            throw ex;
        } catch (Exception ex) {
            log.error("Failed executing AI action {}: {}", actionId, ex.getMessage(), ex);
            action.markFailed(ex.getMessage());
            actionRepository.save(action);
            throw new AiException("EXECUTION_FAILED", "Không thể thực hiện hành động: " + ex.getMessage());
        }
    }

    @Transactional
    public AiDtos.ActionConfirmResponse cancelAction(User user, UUID actionId) {
        AiAction action = actionRepository.findByIdAndUserId(actionId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy yêu cầu xác nhận hoặc bạn không có quyền."));

        if (!AiAction.STATUS_PROPOSED.equalsIgnoreCase(action.getStatus())) {
            throw new AiException("ACTION_ALREADY_PROCESSED", "Yêu cầu này đã ở trạng thái: " + action.getStatus());
        }

        action.markCancelled();
        actionRepository.save(action);

        return new AiDtos.ActionConfirmResponse(
                action.getId(),
                AiAction.STATUS_CANCELLED,
                "Đã hủy hành động đề xuất.",
                action.getTargetEventId(),
                Map.of("tool", action.getTool(), "summary", action.getSummary())
        );
    }

    @Transactional(readOnly = true)
    public AiDtos.ProposedActionDto getAction(User user, UUID actionId) {
        AiAction action = actionRepository.findByIdAndUserId(actionId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy đề xuất hành động."));
        return toDto(action);
    }

    public AiDtos.ProposedActionDto toDto(AiAction a) {
        Map<String, Object> params = parseParams(a.getParametersJson());
        return new AiDtos.ProposedActionDto(
                a.getId(),
                a.getConversation() != null ? a.getConversation().getId() : null,
                a.getTool(),
                a.getStatus(),
                a.getSummary(),
                params,
                a.isHasConflict(),
                a.getConflictDetails(),
                a.getTargetEventId(),
                a.getExpiresAt(),
                a.getCreatedAt(),
                a.getResultDetails(),
                a.getErrorMessage()
        );
    }

    public ConflictResult detectConflict(UUID scheduleId, Instant startsAt, Instant endsAt, UUID excludeEventId, ZoneId zoneId) {
        if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt)) {
            return new ConflictResult(true, "Khoảng thời gian không hợp lệ (thời gian bắt đầu phải trước thời gian kết thúc).");
        }

        List<Event> overlaps = eventRepository.search(scheduleId, startsAt, endsAt, null, null, null);
        DateTimeFormatter timeFmt = AiDateTimeUtils.TIME_FMT;
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");

        List<String> conflicts = new ArrayList<>();
        for (Event e : overlaps) {
            if (excludeEventId != null && e.getId().equals(excludeEventId)) {
                continue;
            }
            if (e.getStartsAt().isBefore(endsAt) && e.getEndsAt().isAfter(startsAt)) {
                ZonedDateTime s = e.getStartsAt().atZone(zoneId);
                ZonedDateTime en = e.getEndsAt().atZone(zoneId);
                conflicts.add(String.format("Xung đột với '%s' (%s, %s–%s)",
                        e.getTitle(), s.format(dateFmt), s.format(timeFmt), en.format(timeFmt)));
            }
        }

        if (!conflicts.isEmpty()) {
            return new ConflictResult(true, String.join("; ", conflicts));
        }
        return new ConflictResult(false, null);
    }

    public Instant parseInstant(Object raw, LocalDate refDate, ZoneId zoneId) {
        if (raw == null) return null;
        String str = raw.toString().trim();
        if (str.isEmpty()) return null;

        try {
            return Instant.parse(str);
        } catch (Exception ignored) {}

        try {
            return OffsetDateTime.parse(str).toInstant();
        } catch (Exception ignored) {}

        try {
            String norm = str.replace(' ', 'T');
            if (norm.length() == 16) norm += ":00";
            return LocalDateTime.parse(norm).atZone(zoneId).toInstant();
        } catch (Exception ignored) {}

        try {
            LocalTime lt = AiDateTimeUtils.parseLocalTime(str);
            if (lt != null) {
                LocalDate d = (refDate != null) ? refDate : LocalDate.now(zoneId);
                return d.atTime(lt).atZone(zoneId).toInstant();
            }
        } catch (Exception ignored) {}

        return null;
    }

    private LocalDate resolveReferenceDate(Map<String, Object> args, AiDtos.ClientContextDto ctx, ZoneId zoneId) {
        if (args != null && args.containsKey("date") && args.get("date") != null && !args.get("date").toString().isBlank()) {
            try {
                return LocalDate.parse(args.get("date").toString().trim());
            } catch (Exception ignored) {}
        }
        if (ctx != null && ctx.selectedDate() != null && !ctx.selectedDate().isBlank()) {
            try {
                return LocalDate.parse(ctx.selectedDate().trim());
            } catch (Exception ignored) {}
        }
        return LocalDate.now(zoneId);
    }

    private ZoneId resolveZone(String timezone, AiDtos.ClientContextDto ctx) {
        if (ctx != null && ctx.timezone() != null && !ctx.timezone().isBlank()) {
            try {
                return ZoneId.of(ctx.timezone().trim());
            } catch (Exception ignored) {}
        }
        if (timezone != null && !timezone.isBlank() && !"UTC".equalsIgnoreCase(timezone.trim())) {
            try {
                return ZoneId.of(timezone.trim());
            } catch (Exception ignored) {}
        }
        return AiDateTimeUtils.DEFAULT_ZONE;
    }

    private Schedule resolveUserSchedule(User user) {
        return scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> scheduleRepository.save(new Schedule(user, "Lịch cá nhân", "Lịch mặc định tạo tự động", "Asia/Ho_Chi_Minh", "PRIVATE")));
    }

    private Event findTargetEvent(User user, Map<String, Object> args) {
        return findTargetEvent(user, args, null);
    }

    private Event findTargetEvent(User user, Map<String, Object> args, AiDtos.ClientContextDto clientContext) {
        if (args == null) return null;

        // 1. Direct event ID from args
        Object eventIdObj = args.get("target_event_id");
        if (eventIdObj == null) eventIdObj = args.get("event_id");
        if (eventIdObj != null) {
            try {
                UUID eventId = UUID.fromString(eventIdObj.toString().trim());
                Optional<Event> ev = eventRepository.findById(eventId);
                if (ev.isPresent() && ev.get().getSchedule().getOwner().getId().equals(user.getId())) {
                    return ev.get();
                }
            } catch (Exception ignored) {}
        }

        // 2. Direct event ID from client context
        if (clientContext != null && clientContext.selectedEventId() != null && !clientContext.selectedEventId().isBlank()) {
            try {
                UUID selectedId = UUID.fromString(clientContext.selectedEventId().trim());
                Optional<Event> ev = eventRepository.findById(selectedId);
                if (ev.isPresent() && ev.get().getSchedule().getOwner().getId().equals(user.getId())) {
                    return ev.get();
                }
            } catch (Exception ignored) {}
        }

        // 3. Search by title / target_title with subject alias matching
        String query = getString(args, "target_title", getString(args, "title", null));
        if (query != null && !query.isBlank()) {
            List<Event> matches = searchUserEventsByQuery(user, query);
            if (!matches.isEmpty()) {
                // If a date is provided in args or context, prioritize matches on that date
                String targetDate = getString(args, "date", clientContext != null ? clientContext.selectedDate() : null);
                if (targetDate != null && !targetDate.isBlank()) {
                    List<Event> onDate = matches.stream()
                            .filter(e -> e.getStartsAt().atZone(AiDateTimeUtils.DEFAULT_ZONE).toLocalDate().toString().equals(targetDate.trim()))
                            .toList();
                    if (!onDate.isEmpty()) {
                        return onDate.get(0);
                    }
                }
                return matches.get(0);
            }
        }
        return null;
    }

    public List<Event> searchUserEventsByQuery(User user, String query) {
        if (query == null || query.isBlank()) return Collections.emptyList();
        List<Schedule> userSchedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<Event> results = new ArrayList<>();
        Instant from = Instant.now().minusSeconds(86400L * 7);
        Instant to = Instant.now().plusSeconds(86400L * 30);

        for (Schedule s : userSchedules) {
            List<Event> matches = eventRepository.search(s.getId(), from, to, null, null, null);
            for (Event e : matches) {
                if (isSubjectMatch(e.getTitle(), query)) {
                    results.add(e);
                }
            }
        }
        results.sort(Comparator.comparing(Event::getStartsAt));
        return results;
    }

    public static boolean isSubjectMatch(String eventTitle, String query) {
        if (eventTitle == null || query == null) return false;
        String e = eventTitle.toLowerCase().trim();
        String q = query.toLowerCase().trim();
        if (e.equals(q) || e.contains(q) || q.contains(e)) return true;

        List<Set<String>> aliasGroups = List.of(
                Set.of("lý", "ly", "vật lý", "vat ly", "physics", "phy"),
                Set.of("toán", "toan", "toán học", "math", "mathematics", "calculus", "giải tích", "đại số"),
                Set.of("hóa", "hoa", "hóa học", "chemistry", "chem"),
                Set.of("anh", "tiếng anh", "english", "eng"),
                Set.of("văn", "ngữ văn", "literature"),
                Set.of("tin", "tin học", "cntt", "computer science", "lập trình", "coding", "java", "python")
        );

        for (Set<String> group : aliasGroups) {
            boolean matchQuery = group.stream().anyMatch(alias -> q.equals(alias) || q.contains(alias));
            boolean matchEvent = group.stream().anyMatch(alias -> e.equals(alias) || e.contains(alias));
            if (matchQuery && matchEvent) {
                return true;
            }
        }
        return false;
    }

    private Event requireTargetEvent(User user, UUID targetEventId, Map<String, Object> params) {
        if (targetEventId != null) {
            Event ev = eventRepository.findById(targetEventId)
                    .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy sự kiện đích."));
            if (!ev.getSchedule().getOwner().getId().equals(user.getId())) {
                throw new AiException("FORBIDDEN", "Bạn không có quyền chỉnh sửa sự kiện này.");
            }
            return ev;
        }

        Event ev = findTargetEvent(user, params);
        if (ev == null) {
            throw new AiException("NOT_FOUND", "Không thể tìm thấy sự kiện phù hợp để thao tác.");
        }
        return ev;
    }

    private Map<String, Object> parseParams(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) return defaultValue;
        return map.get(key).toString().trim();
    }
}
