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

        LocalDate refDate = resolveReferenceDate(arguments, clientContext, zoneId);

        String summary = "";
        boolean hasConflict = false;
        String conflictDetails = null;
        UUID targetEventId = null;

        switch (toolName) {
            case "create_schedule" -> {
                String title = getString(arguments, "title", "Lịch mới");
                Instant startsAt = parseInstant(arguments.get("start_time"), refDate, zoneId);
                Instant endsAt = parseInstant(arguments.get("end_time"), refDate, zoneId);

                if (startsAt == null) {
                    startsAt = refDate.atTime(8, 0).atZone(zoneId).toInstant();
                }
                if (endsAt == null) {
                    int durationMinutes = getInt(arguments, "duration_minutes", 60);
                    endsAt = startsAt.plusSeconds(durationMinutes * 60L);
                }

                if (!startsAt.isBefore(endsAt)) {
                    endsAt = startsAt.plusSeconds(3600);
                }

                ConflictResult cr = detectConflict(schedule.getId(), startsAt, endsAt, null, zoneId);
                hasConflict = cr.hasConflict();
                conflictDetails = cr.details();

                ZonedDateTime sLocal = startsAt.atZone(zoneId);
                ZonedDateTime eLocal = endsAt.atZone(zoneId);
                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, dd/MM", Locale.forLanguageTag("vi-VN"));
                DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

                summary = String.format("Tạo lịch: %s vào %s (%s–%s)",
                        title, sLocal.format(dateFmt), sLocal.format(timeFmt), eLocal.format(timeFmt));
            }

            case "update_schedule" -> {
                Event target = findTargetEvent(user, arguments);
                if (target != null) {
                    targetEventId = target.getId();
                    String newTitle = getString(arguments, "title", target.getTitle());
                    Instant startsAt = parseInstant(arguments.get("start_time"), refDate, zoneId);
                    Instant endsAt = parseInstant(arguments.get("end_time"), refDate, zoneId);

                    if (startsAt == null) startsAt = target.getStartsAt();
                    if (endsAt == null) endsAt = target.getEndsAt();

                    if (!startsAt.isBefore(endsAt)) {
                        endsAt = startsAt.plusSeconds(3600);
                    }

                    ConflictResult cr = detectConflict(schedule.getId(), startsAt, endsAt, target.getId(), zoneId);
                    hasConflict = cr.hasConflict();
                    conflictDetails = cr.details();

                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");
                    DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

                    summary = String.format("Cập nhật lịch: '%s' -> '%s' (%s, %s–%s)",
                            target.getTitle(), newTitle, sLocal.format(dateFmt), sLocal.format(timeFmt), eLocal.format(timeFmt));
                } else {
                    summary = "Cập nhật lịch trình: " + getString(arguments, "title", "sự kiện");
                }
            }

            case "delete_schedule" -> {
                Event target = findTargetEvent(user, arguments);
                if (target != null) {
                    targetEventId = target.getId();
                    ZonedDateTime sLocal = target.getStartsAt().atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM HH:mm");
                    summary = String.format("Xóa lịch: '%s' (%s)", target.getTitle(), sLocal.format(dateFmt));
                } else {
                    summary = "Xóa lịch: " + getString(arguments, "title", "sự kiện đã chọn");
                }
            }

            case "reschedule_event" -> {
                Event target = findTargetEvent(user, arguments);
                if (target != null) {
                    targetEventId = target.getId();
                    Instant startsAt = parseInstant(arguments.get("new_start_time"), refDate, zoneId);
                    Instant endsAt = parseInstant(arguments.get("new_end_time"), refDate, zoneId);

                    if (startsAt == null) {
                        startsAt = target.getStartsAt();
                    }
                    if (endsAt == null) {
                        long durationSeconds = Duration.between(target.getStartsAt(), target.getEndsAt()).getSeconds();
                        endsAt = startsAt.plusSeconds(Math.max(1800, durationSeconds));
                    }

                    ConflictResult cr = detectConflict(schedule.getId(), startsAt, endsAt, target.getId(), zoneId);
                    hasConflict = cr.hasConflict();
                    conflictDetails = cr.details();

                    ZonedDateTime sLocal = startsAt.atZone(zoneId);
                    ZonedDateTime eLocal = endsAt.atZone(zoneId);
                    DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, dd/MM", Locale.forLanguageTag("vi-VN"));
                    DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

                    summary = String.format("Dời lịch '%s' sang %s (%s–%s)",
                            target.getTitle(), sLocal.format(dateFmt), sLocal.format(timeFmt), eLocal.format(timeFmt));
                } else {
                    summary = "Dời lịch sự kiện đã chọn";
                }
            }

            default -> summary = "Thực hiện hành động: " + toolName;
        }

        String paramsJson = "{}";
        try {
            paramsJson = objectMapper.writeValueAsString(arguments);
        } catch (Exception e) {
            log.warn("Failed serializing action arguments: {}", e.getMessage());
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

        ZoneId zoneId = resolveZone(user.getTimezone(), null);
        Schedule schedule = resolveUserSchedule(user);
        Map<String, Object> params = parseParams(action.getParametersJson());

        try {
            UUID createdOrModifiedId = null;
            String message;

            switch (action.getTool()) {
                case "create_schedule" -> {
                    String title = getString(params, "title", "Lịch mới");
                    String description = getString(params, "description", "");
                    String location = getString(params, "location", "");
                    LocalDate refDate = resolveReferenceDate(params, null, zoneId);

                    Instant startsAt = parseInstant(params.get("start_time"), refDate, zoneId);
                    Instant endsAt = parseInstant(params.get("end_time"), refDate, zoneId);

                    if (startsAt == null) startsAt = refDate.atTime(8, 0).atZone(zoneId).toInstant();
                    if (endsAt == null) {
                        int dur = getInt(params, "duration_minutes", 60);
                        endsAt = startsAt.plusSeconds(dur * 60L);
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
                    createdOrModifiedId = newEvent.getId();
                    action.setTargetEventId(createdOrModifiedId);
                    message = String.format("Đã tạo lịch '%s' thành công.", title);
                }

                case "update_schedule" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    String newTitle = getString(params, "title", event.getTitle());
                    String description = getString(params, "description", event.getDescription());
                    String location = getString(params, "location", event.getLocation());
                    LocalDate refDate = resolveReferenceDate(params, null, zoneId);

                    Instant startsAt = parseInstant(params.get("start_time"), refDate, zoneId);
                    Instant endsAt = parseInstant(params.get("end_time"), refDate, zoneId);

                    if (startsAt == null) startsAt = event.getStartsAt();
                    if (endsAt == null) endsAt = event.getEndsAt();

                    event.update(event.getCategory(), newTitle, description, startsAt, endsAt, location,
                            event.getPriority(), event.getStatus(), event.getRecurrenceRule(), event.getReminderMinutes(),
                            event.getNotes(), event.isFixed(), event.isLocked());

                    eventRepository.save(event);
                    createdOrModifiedId = event.getId();
                    message = String.format("Đã cập nhật lịch '%s' thành công.", newTitle);
                }

                case "delete_schedule" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    String oldTitle = event.getTitle();
                    createdOrModifiedId = event.getId();
                    eventRepository.delete(event);
                    message = String.format("Đã xóa lịch '%s' thành công.", oldTitle);
                }

                case "reschedule_event" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    LocalDate refDate = resolveReferenceDate(params, null, zoneId);
                    Instant startsAt = parseInstant(params.get("new_start_time"), refDate, zoneId);
                    Instant endsAt = parseInstant(params.get("new_end_time"), refDate, zoneId);

                    if (startsAt == null) startsAt = event.getStartsAt();
                    if (endsAt == null) {
                        long durationSeconds = Duration.between(event.getStartsAt(), event.getEndsAt()).getSeconds();
                        endsAt = startsAt.plusSeconds(Math.max(1800, durationSeconds));
                    }

                    event.update(event.getCategory(), event.getTitle(), event.getDescription(), startsAt, endsAt,
                            event.getLocation(), event.getPriority(), event.getStatus(), event.getRecurrenceRule(),
                            event.getReminderMinutes(), event.getNotes(), event.isFixed(), event.isLocked());

                    eventRepository.save(event);
                    createdOrModifiedId = event.getId();
                    message = String.format("Đã dời lịch '%s' thành công.", event.getTitle());
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
                    Map.of("tool", action.getTool(), "summary", action.getSummary())
            );

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
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
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
            String timePart = str;
            if (timePart.contains(" ")) {
                String[] parts = timePart.split(" ");
                timePart = parts[parts.length - 1];
            }
            if (timePart.length() >= 4 && timePart.contains(":")) {
                LocalTime lt = LocalTime.parse(timePart.length() == 5 ? timePart : timePart.substring(0, 5));
                LocalDate d = (refDate != null) ? refDate : LocalDate.now(zoneId);
                return d.atTime(lt).atZone(zoneId).toInstant();
            }
        } catch (Exception ignored) {}

        return null;
    }

    private LocalDate resolveReferenceDate(Map<String, Object> args, AiDtos.ClientContextDto ctx, ZoneId zoneId) {
        if (args != null && args.containsKey("date")) {
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
        if (timezone != null && !timezone.isBlank()) {
            try {
                return ZoneId.of(timezone.trim());
            } catch (Exception ignored) {}
        }
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }

    private Schedule resolveUserSchedule(User user) {
        return scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> scheduleRepository.save(new Schedule(user, "Lịch cá nhân", "Lịch mặc định tạo tự động", "Asia/Ho_Chi_Minh", "PRIVATE")));
    }

    private Event findTargetEvent(User user, Map<String, Object> args) {
        if (args == null) return null;
        Object eventIdObj = args.get("event_id");
        if (eventIdObj != null) {
            try {
                UUID eventId = UUID.fromString(eventIdObj.toString().trim());
                Optional<Event> ev = eventRepository.findById(eventId);
                if (ev.isPresent() && ev.get().getSchedule().getOwner().getId().equals(user.getId())) {
                    return ev.get();
                }
            } catch (Exception ignored) {}
        }

        String title = getString(args, "title", null);
        if (title != null && !title.isBlank()) {
            List<Schedule> userSchedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
            for (Schedule s : userSchedules) {
                List<Event> matches = eventRepository.search(s.getId(),
                        Instant.now().minusSeconds(86400L * 7),
                        Instant.now().plusSeconds(86400L * 30),
                        null, null, null);
                for (Event e : matches) {
                    if (e.getTitle().equalsIgnoreCase(title.trim()) || e.getTitle().toLowerCase().contains(title.toLowerCase().trim())) {
                        return e;
                    }
                }
            }
        }
        return null;
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

    private int getInt(Map<String, Object> map, String key, int defaultValue) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) return defaultValue;
        try {
            return Integer.parseInt(map.get(key).toString().trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
