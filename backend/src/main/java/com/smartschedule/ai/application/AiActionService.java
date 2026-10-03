package com.smartschedule.ai.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.domain.AiAction;
import com.smartschedule.ai.domain.AiActionPlan;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.RiskLevel;
import com.smartschedule.ai.infrastructure.AiActionPlanRepository;
import com.smartschedule.ai.infrastructure.AiActionRepository;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AiActionService {
    private static final Logger log = LoggerFactory.getLogger(AiActionService.class);

    public static final Map<String, String> ROUTE_WHITELIST = Map.ofEntries(
            Map.entry("dashboard", "/dashboard"),
            Map.entry("calendar", "/calendar"),
            Map.entry("scheduling", "/scheduling"),
            Map.entry("rescheduling", "/rescheduling"),
            Map.entry("collaboration", "/collaboration"),
            Map.entry("tasks", "/tasks"),
            Map.entry("deadlines", "/tasks"),
            Map.entry("analytics", "/analytics"),
            Map.entry("schedules", "/schedules"),
            Map.entry("settings", "/settings"),
            Map.entry("profile", "/settings"),
            Map.entry("notifications", "/notifications")
    );

    private final AiActionRepository actionRepository;
    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final AiActionPlanRepository actionPlanRepository;
    private final AiRiskEngine riskEngine;
    private final ObjectMapper objectMapper;
    private final com.smartschedule.ai.infrastructure.VisionResultRepository visionResultRepository;

    public record ConflictResult(boolean hasConflict, String details) {}

    @Autowired
    public AiActionService(AiActionRepository actionRepository,
                           EventRepository eventRepository,
                           ScheduleRepository scheduleRepository,
                           TaskRepository taskRepository,
                           UserRepository userRepository,
                           AiActionPlanRepository actionPlanRepository,
                           AiRiskEngine riskEngine,
                           ObjectMapper objectMapper,
                           @Autowired(required = false) com.smartschedule.ai.infrastructure.VisionResultRepository visionResultRepository) {
        this.actionRepository = actionRepository;
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.actionPlanRepository = actionPlanRepository;
        this.riskEngine = riskEngine;
        this.objectMapper = objectMapper;
        this.visionResultRepository = visionResultRepository;
    }

    public AiActionService(AiActionRepository actionRepository,
                           EventRepository eventRepository,
                           ScheduleRepository scheduleRepository,
                           TaskRepository taskRepository,
                           UserRepository userRepository,
                           AiActionPlanRepository actionPlanRepository,
                           AiRiskEngine riskEngine,
                           ObjectMapper objectMapper) {
        this(actionRepository, eventRepository, scheduleRepository, taskRepository, userRepository, actionPlanRepository, riskEngine, objectMapper, null);
    }

    public AiActionService(AiActionRepository actionRepository,
                           EventRepository eventRepository,
                           ScheduleRepository scheduleRepository,
                           ObjectMapper objectMapper) {
        this(actionRepository, eventRepository, scheduleRepository, null, null, null, new AiRiskEngine(), objectMapper, null);
    }

    @Transactional
    public AiDtos.ProposedActionDto proposeAction(User user,
                                                  AiConversation conversation,
                                                  String toolName,
                                                  Map<String, Object> arguments,
                                                  AiDtos.ClientContextDto clientContext) {
        if (riskEngine != null) {
            riskEngine.enforcePolicy(toolName, arguments);
        }
        RiskLevel riskLevel = riskEngine != null ? riskEngine.getRiskLevel(toolName) : RiskLevel.IMPORTANT_WRITE;

        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        Schedule schedule = resolveUserSchedule(user);

        String summary = "";
        boolean hasConflict = false;
        String conflictDetails = null;
        UUID targetEventId = null;
        UUID planId = null;
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

            case "complete_task" -> {
                Task target = findTargetTask(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy công việc phù hợp để hoàn thành.");
                }
                canonicalParams.put("task_id", target.getId().toString());
                canonicalParams.put("title", target.getTitle());
                canonicalParams.put("previous_status", target.getStatus());
                canonicalParams.put("new_status", "COMPLETED");
                summary = String.format("Hoàn thành công việc: '%s'", target.getTitle());
            }

            case "create_task" -> {
                String title = getString(arguments, "title", null);
                if (title == null || title.isBlank()) {
                    throw new AiException("MISSING_TITLE", "Vui lòng cung cấp tiêu đề công việc.");
                }
                int estimatedMinutes = 60;
                if (arguments.containsKey("estimated_minutes") && arguments.get("estimated_minutes") != null) {
                    try {
                        estimatedMinutes = Integer.parseInt(arguments.get("estimated_minutes").toString().trim());
                    } catch (Exception ignored) {}
                }
                String priority = getString(arguments, "priority", "MEDIUM").toUpperCase();
                String deadline = getString(arguments, "deadline", null);
                String description = getString(arguments, "description", null);

                canonicalParams.put("title", title.trim());
                canonicalParams.put("estimated_minutes", estimatedMinutes);
                canonicalParams.put("priority", priority);
                if (deadline != null && !deadline.isBlank()) {
                    canonicalParams.put("deadline", deadline.trim());
                }
                if (description != null && !description.isBlank()) {
                    canonicalParams.put("description", description.trim());
                }
                summary = String.format("Tạo công việc: '%s' (Ước tính %d phút, Mức ưu tiên: %s)",
                        title.trim(), estimatedMinutes, priority);
            }

            case "update_task" -> {
                Task target = findTargetTask(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy công việc cần cập nhật.");
                }
                canonicalParams.put("task_id", target.getId().toString());
                canonicalParams.put("title", target.getTitle());
                if (arguments.containsKey("new_title")) {
                    canonicalParams.put("new_title", getString(arguments, "new_title", target.getTitle()));
                }
                if (arguments.containsKey("priority")) {
                    canonicalParams.put("priority", getString(arguments, "priority", target.getPriority()));
                }
                if (arguments.containsKey("deadline")) {
                    canonicalParams.put("deadline", getString(arguments, "deadline", null));
                }
                if (arguments.containsKey("status")) {
                    canonicalParams.put("status", getString(arguments, "status", target.getStatus()));
                }
                summary = String.format("Cập nhật công việc: '%s'", target.getTitle());
            }

            case "delete_task" -> {
                Task target = findTargetTask(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy công việc cần xóa.");
                }
                canonicalParams.put("task_id", target.getId().toString());
                canonicalParams.put("title", target.getTitle());
                summary = String.format("Xóa công việc: '%s'", target.getTitle());
            }

            case "create_deadline" -> {
                String title = getString(arguments, "title", null);
                String deadline = getString(arguments, "deadline", null);
                if (title == null || title.isBlank() || deadline == null || deadline.isBlank()) {
                    throw new AiException("MISSING_REQUIRED_FIELDS", "Vui lòng cung cấp đầy đủ tên bài tập/deadline và thời hạn.");
                }
                String priority = getString(arguments, "priority", "HIGH").toUpperCase();
                String description = getString(arguments, "description", null);

                canonicalParams.put("title", title.trim());
                canonicalParams.put("deadline", deadline.trim());
                canonicalParams.put("priority", priority);
                if (description != null && !description.isBlank()) {
                    canonicalParams.put("description", description.trim());
                }
                summary = String.format("Tạo hạn chót (Deadline): '%s' (Hạn: %s, Mức: %s)",
                        title.trim(), deadline.trim(), priority);
            }

            case "update_reminder" -> {
                Event target = findTargetEvent(user, arguments, clientContext);
                if (target == null) {
                    throw new AiException("NOT_FOUND", "Không tìm thấy sự kiện cần chỉnh thời gian nhắc nhở.");
                }
                targetEventId = target.getId();
                int minutes = 15;
                if (arguments.containsKey("reminder_minutes") && arguments.get("reminder_minutes") != null) {
                    try {
                        minutes = Integer.parseInt(arguments.get("reminder_minutes").toString().trim());
                    } catch (Exception ignored) {}
                }
                canonicalParams.put("event_id", target.getId().toString());
                canonicalParams.put("title", target.getTitle());
                canonicalParams.put("reminder_minutes", minutes);
                summary = String.format("Cài đặt nhắc nhở trước %d phút cho sự kiện '%s'", minutes, target.getTitle());
            }

            case "navigate_to" -> {
                String targetScreen = getString(arguments, "target_screen", "dashboard");
                String route = resolveRoute(targetScreen);
                canonicalParams.put("target_screen", targetScreen);
                canonicalParams.put("route", route);
                summary = String.format("Mở màn hình: %s (%s)", targetScreen, route);
            }

            case "update_user_preferences" -> {
                if (arguments.containsKey("timezone")) {
                    canonicalParams.put("timezone", getString(arguments, "timezone", null));
                }
                if (arguments.containsKey("display_name")) {
                    canonicalParams.put("display_name", getString(arguments, "display_name", null));
                }
                summary = "Cập nhật tùy chọn cá nhân";
            }

            case "create_study_plan" -> {
                String subject = getString(arguments, "subject", null);
                if (subject == null || subject.trim().isEmpty()) {
                    throw new AiException("MISSING_SUBJECT", "Vui lòng cung cấp môn học hoặc kỳ thi cần lập kế hoạch.");
                }
                if (!arguments.containsKey("total_days") || arguments.get("total_days") == null) {
                    throw new AiException("MISSING_TOTAL_DAYS", "Vui lòng cung cấp số ngày trong lộ trình học tập (ví dụ: 7 ngày, 10 ngày).");
                }
                int totalDays;
                try {
                    totalDays = Integer.parseInt(arguments.get("total_days").toString().trim());
                    if (totalDays <= 0 || totalDays > 60) {
                        throw new AiException("INVALID_TOTAL_DAYS", "Số ngày học tập phải từ 1 đến 60 ngày.");
                    }
                } catch (NumberFormatException e) {
                    throw new AiException("INVALID_TOTAL_DAYS", "Số ngày học tập không hợp lệ: " + arguments.get("total_days"));
                }

                if (!arguments.containsKey("daily_minutes") || arguments.get("daily_minutes") == null) {
                    throw new AiException("MISSING_DURATION", "Vui lòng cung cấp thời gian tự học mỗi ngày tính bằng phút (ví dụ: 60 phút, 90 phút).");
                }
                int dailyMinutes;
                try {
                    dailyMinutes = Integer.parseInt(arguments.get("daily_minutes").toString().trim());
                    if (dailyMinutes < 15 || dailyMinutes > 360) {
                        throw new AiException("INVALID_DURATION", "Thời gian học mỗi ngày phải từ 15 đến 360 phút.");
                    }
                } catch (NumberFormatException e) {
                    throw new AiException("INVALID_DURATION", "Thời gian tự học mỗi ngày không hợp lệ: " + arguments.get("daily_minutes"));
                }
                String preferred = getString(arguments, "preferred_time", "evening").toLowerCase();
                LocalTime sTime = preferred.contains("morning") ? LocalTime.of(8, 0)
                        : preferred.contains("afternoon") ? LocalTime.of(14, 0) : LocalTime.of(19, 30);
                LocalTime eTime = sTime.plusMinutes(dailyMinutes);

                AiActionPlan plan = new AiActionPlan(user, conversation,
                        "Kế hoạch học tập: " + subject,
                        String.format("Lộ trình %d ngày ôn %s (%d phút/ngày lúc %s)", totalDays, subject, dailyMinutes, sTime),
                        totalDays);
                if (actionPlanRepository != null) {
                    actionPlanRepository.save(plan);
                    planId = plan.getId();
                }

                summary = String.format("Kế hoạch học tập: Ôn %s trong %d ngày (%s–%s hàng ngày)",
                        subject, totalDays, sTime.format(AiDateTimeUtils.TIME_FMT), eTime.format(AiDateTimeUtils.TIME_FMT));
                canonicalParams.put("plan_id", planId != null ? planId.toString() : null);
                canonicalParams.put("subject", subject);
                canonicalParams.put("total_days", totalDays);
                canonicalParams.put("daily_minutes", dailyMinutes);

                // Create sub-actions for each day
                if (actionPlanRepository != null && planId != null) {
                    LocalDate startDay = LocalDate.now(zoneId).plusDays(1);
                    for (int i = 0; i < totalDays; i++) {
                        LocalDate d = startDay.plusDays(i);
                        Instant sInst = d.atTime(sTime).atZone(zoneId).toInstant();
                        Instant eInst = d.atTime(eTime).atZone(zoneId).toInstant();
                        Map<String, Object> subParams = new LinkedHashMap<>();
                        String sessionTitle = String.format("Buổi %d: Ôn %s", i + 1, subject);
                        subParams.put("title", sessionTitle);
                        subParams.put("date", d.toString());
                        subParams.put("start_time", sTime.format(AiDateTimeUtils.TIME_FMT));
                        subParams.put("end_time", eTime.format(AiDateTimeUtils.TIME_FMT));
                        subParams.put("duration_minutes", dailyMinutes);
                        subParams.put("starts_at", sInst.toString());
                        subParams.put("ends_at", eInst.toString());
                        subParams.put("timezone", zoneId.getId());

                        String subSummary = String.format("Tạo lịch: %s vào %s (%s–%s)",
                                sessionTitle, d.format(AiDateTimeUtils.VI_DATE_FMT),
                                sTime.format(AiDateTimeUtils.TIME_FMT), eTime.format(AiDateTimeUtils.TIME_FMT));

                        String subParamsJson = "{}";
                        try { subParamsJson = objectMapper.writeValueAsString(subParams); } catch (Exception ignored) {}

                        AiAction subAction = new AiAction(
                                user, conversation, "create_schedule", subSummary, subParamsJson,
                                false, null, null, Instant.now().plusSeconds(900)
                        );
                        subAction.setRiskLevel("IMPORTANT_WRITE");
                        subAction.setPlanId(planId);
                        subAction.setStepOrder(i + 1);
                        actionRepository.save(subAction);
                    }
                }
            }

            case "optimize_day" -> {
                LocalDate date = resolveReferenceDate(arguments, clientContext, zoneId);
                boolean keepFixed = !arguments.containsKey("keep_fixed") || Boolean.parseBoolean(arguments.get("keep_fixed").toString());
                summary = String.format("Tối ưu hóa lịch trình ngày %s (Bảo toàn lịch cố định: %s)",
                        date.format(AiDateTimeUtils.VI_DATE_FMT), keepFixed ? "Có" : "Không");
                canonicalParams.put("date", date.toString());
                canonicalParams.put("keep_fixed", keepFixed);
            }

            case "optimize_week" -> {
                boolean keepClasses = !arguments.containsKey("keep_classes") || Boolean.parseBoolean(arguments.get("keep_classes").toString());
                String focus = getString(arguments, "focus_area", "Toàn bộ môn học");
                summary = String.format("Tối ưu hóa thời khóa biểu tuần này (Trọng tâm: %s, Giữ nguyên lớp chính khóa: %s)",
                        focus, keepClasses ? "Có" : "Không");
                canonicalParams.put("keep_classes", keepClasses);
                canonicalParams.put("focus_area", focus);
            }

            case "batch_action" -> {
                String title = getString(arguments, "title", "Kế hoạch thực thi hàng loạt");
                String planSummary = getString(arguments, "summary", "Thực hiện chuỗi hành động");
                Object rawActions = arguments.get("actions");
                List<Map<String, Object>> actList = rawActions instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();

                AiActionPlan plan = new AiActionPlan(user, conversation, title, planSummary, actList.size());
                if (actionPlanRepository != null) {
                    actionPlanRepository.save(plan);
                    planId = plan.getId();
                }

                summary = String.format("Kế hoạch: %s (%d hành động)", title, actList.size());
                canonicalParams.put("title", title);
                canonicalParams.put("summary", planSummary);
                canonicalParams.put("plan_id", planId != null ? planId.toString() : null);

                // Create individual sub actions
                if (actionPlanRepository != null && planId != null) {
                    int order = 1;
                    for (Map<String, Object> sub : actList) {
                        String subTool = getString(sub, "tool", getString(sub, "name", "create_schedule"));
                        Map<String, Object> subArgs = new LinkedHashMap<>();
                        Object subArgsRaw = sub.get("arguments");
                        if (subArgsRaw instanceof Map<?, ?> m) {
                            for (Map.Entry<?, ?> e : m.entrySet()) {
                                if (e.getKey() != null) subArgs.put(e.getKey().toString(), e.getValue());
                            }
                        } else if (sub.get("arguments_json") instanceof String jsonStr && !jsonStr.isBlank()) {
                            try {
                                Map<String, Object> parsed = objectMapper.readValue(jsonStr, Map.class);
                                subArgs.putAll(parsed);
                            } catch (Exception ignored) {}
                        } else {
                            for (Map.Entry<String, Object> entry : sub.entrySet()) {
                                if (!"tool".equalsIgnoreCase(entry.getKey()) &&
                                        !"name".equalsIgnoreCase(entry.getKey()) &&
                                        !"summary".equalsIgnoreCase(entry.getKey()) &&
                                        !"arguments_json".equalsIgnoreCase(entry.getKey())) {
                                    subArgs.put(entry.getKey(), entry.getValue());
                                }
                            }
                        }
                        try {
                            String subJson = objectMapper.writeValueAsString(subArgs);
                            String subSum = getString(sub, "summary", "Bước " + order + ": " + subTool);
                            AiAction subAct = new AiAction(user, conversation, subTool, subSum, subJson, false, null, null, Instant.now().plusSeconds(900));
                            subAct.setRiskLevel(riskEngine != null ? riskEngine.getRiskLevel(subTool).name() : "IMPORTANT_WRITE");
                            subAct.setPlanId(planId);
                            subAct.setStepOrder(order++);
                            actionRepository.save(subAct);
                        } catch (Exception ignored) {}
                    }
                }
            }

            case "import_vision_schedule" -> {
                com.smartschedule.ai.domain.VisionResult visionResult = null;
                if (arguments.containsKey("vision_result_id") && arguments.get("vision_result_id") != null) {
                    try {
                        UUID vId = UUID.fromString(arguments.get("vision_result_id").toString());
                        visionResult = visionResultRepository != null
                                ? visionResultRepository.findByIdAndUserId(vId, user.getId()).orElse(null)
                                : null;
                    } catch (Exception ignored) {}
                }
                if (visionResult == null && visionResultRepository != null) {
                    List<com.smartschedule.ai.domain.VisionResult> latest = visionResultRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
                    if (!latest.isEmpty()) {
                        visionResult = latest.get(0);
                    }
                }
                if (visionResult == null) {
                    throw new AiException("NO_VISION_DATA", "Không tìm thấy dữ liệu phân tích hình ảnh thời khóa biểu nào.");
                }

                List<Map<String, Object>> eventsList = new ArrayList<>();
                try {
                    Map<String, Object> payload = objectMapper.readValue(visionResult.getPayloadJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                    if (payload.containsKey("events")) {
                        eventsList = objectMapper.convertValue(payload.get("events"), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                    }
                } catch (Exception e) {
                    log.warn("Failed parsing vision payload: {}", e.getMessage());
                }

                if (eventsList.isEmpty()) {
                    throw new AiException("NO_EVENTS_FOUND", "Không tìm thấy sự kiện nào trong dữ liệu phân tích thị giác.");
                }

                String planTitle = "Nhập thời khóa biểu từ ảnh (" + visionResult.getDocumentType() + ")";
                String planSummary = String.format("Nhập %d môn học/sự kiện đã nhận diện thành công vào lịch học", eventsList.size());

                AiActionPlan plan = new AiActionPlan(user, conversation, planTitle, planSummary, eventsList.size());
                if (actionPlanRepository != null) {
                    actionPlanRepository.save(plan);
                    planId = plan.getId();
                }

                summary = String.format("Kế hoạch: %s (%d môn học)", planTitle, eventsList.size());
                canonicalParams.put("title", planTitle);
                canonicalParams.put("summary", planSummary);
                canonicalParams.put("plan_id", planId != null ? planId.toString() : null);
                canonicalParams.put("vision_result_id", visionResult.getId().toString());

                if (actionPlanRepository != null && planId != null) {
                    int order = 1;
                    LocalDate monday = LocalDate.now(zoneId).with(java.time.DayOfWeek.MONDAY);
                    for (Map<String, Object> ev : eventsList) {
                        String evTitle = getString(ev, "title", "Tiết học");
                        String dayOfWeek = getString(ev, "day_of_week", "Thứ Hai");
                        int dayOffset = switch (dayOfWeek != null ? dayOfWeek.toLowerCase() : "") {
                            case "thứ ba", "t3", "tuesday" -> 1;
                            case "thứ tư", "t4", "wednesday" -> 2;
                            case "thứ năm", "t5", "thursday" -> 3;
                            case "thứ sáu", "t6", "friday" -> 4;
                            case "thứ bảy", "t7", "saturday" -> 5;
                            case "chủ nhật", "cn", "sunday" -> 6;
                            default -> 0; // Monday
                        };
                        LocalDate evDate = monday.plusDays(dayOffset);
                        String sTime = getString(ev, "start_time", "08:00");
                        String eTime = getString(ev, "end_time", "09:30");
                        String location = getString(ev, "location", null);
                        String desc = getString(ev, "description", "Nhập tự động từ ảnh thời khóa biểu");

                        LocalTime parsedStart = AiDateTimeUtils.parseLocalTime(sTime);
                        if (parsedStart == null) parsedStart = LocalTime.of(8, 0);
                        LocalTime parsedEnd = AiDateTimeUtils.parseLocalTime(eTime);
                        if (parsedEnd == null) parsedEnd = parsedStart.plusMinutes(90);
                        Instant sInst = evDate.atTime(parsedStart).atZone(zoneId).toInstant();
                        Instant eInst = evDate.atTime(parsedEnd).atZone(zoneId).toInstant();

                        Map<String, Object> subParams = new LinkedHashMap<>();
                        subParams.put("title", evTitle);
                        subParams.put("date", evDate.toString());
                        subParams.put("start_time", sTime);
                        subParams.put("end_time", eTime);
                        subParams.put("duration_minutes", (int) Duration.between(parsedStart, parsedEnd).toMinutes());
                        subParams.put("starts_at", sInst.toString());
                        subParams.put("ends_at", eInst.toString());
                        subParams.put("timezone", zoneId.getId());
                        if (location != null) subParams.put("location", location);
                        if (desc != null) subParams.put("description", desc);

                        String subSum = String.format("Tạo lịch: %s vào %s (%s–%s)",
                                evTitle, evDate.format(AiDateTimeUtils.VI_DATE_FMT), sTime, eTime);

                        try {
                            String subJson = objectMapper.writeValueAsString(subParams);
                            AiAction subAct = new AiAction(user, conversation, "create_schedule", subSum, subJson, false, null, null, Instant.now().plusSeconds(900));
                            subAct.setRiskLevel("IMPORTANT_WRITE");
                            subAct.setPlanId(planId);
                            subAct.setStepOrder(order++);
                            actionRepository.save(subAct);
                        } catch (Exception ignored) {}
                    }
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
        action.setRiskLevel(riskLevel.name());
        action.setPlanId(planId);
        action.setStepOrder(1);

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

                case "complete_task" -> {
                    Task task = requireTargetTask(user, params);
                    createdOrModifiedId = task.getId();
                    task.update(task.getCategory(), task.getTitle(), task.getDescription(),
                            task.getEstimatedMinutes(), 0, task.getPriority(), task.getDeadline(),
                            "COMPLETED", task.getPreferredStart(), task.getPreferredEnd(),
                            task.getMinimumSessionMinutes(), task.getMaximumSessionMinutes());
                    if (taskRepository != null) {
                        taskRepository.save(task);
                    }
                    message = String.format("Đã hoàn thành công việc '%s' thành công.", task.getTitle());
                    data.put("taskId", task.getId());
                    data.put("title", task.getTitle());
                    data.put("status", "COMPLETED");
                }

                case "create_task" -> {
                    String title = getString(params, "title", "Công việc mới");
                    int estimated = 60;
                    if (params.containsKey("estimated_minutes") && params.get("estimated_minutes") != null) {
                        try { estimated = Integer.parseInt(params.get("estimated_minutes").toString().trim()); } catch (Exception ignored) {}
                    }
                    String priority = getString(params, "priority", "MEDIUM");
                    String description = getString(params, "description", null);
                    Instant deadlineInst = null;
                    if (params.containsKey("deadline") && params.get("deadline") != null) {
                        try { deadlineInst = Instant.parse(params.get("deadline").toString().trim()); } catch (Exception ignored) {}
                    }

                    Task newTask = new Task(schedule, user, null, title, description,
                            estimated, estimated, priority, deadlineInst, "TODO", null, null, 15, estimated);
                    if (taskRepository != null) {
                        taskRepository.save(newTask);
                        createdOrModifiedId = newTask.getId();
                    }
                    message = String.format("Đã tạo công việc '%s' thành công.", title);
                    data.put("taskId", createdOrModifiedId);
                    data.put("title", title);
                    data.put("status", "TODO");
                    data.put("estimatedMinutes", estimated);
                }

                case "update_task" -> {
                    Task task = requireTargetTask(user, params);
                    String newTitle = getString(params, "new_title", task.getTitle());
                    String priority = getString(params, "priority", task.getPriority());
                    String status = getString(params, "status", task.getStatus());
                    Instant deadline = task.getDeadline();
                    if (params.containsKey("deadline") && params.get("deadline") != null) {
                        try { deadline = Instant.parse(params.get("deadline").toString().trim()); } catch (Exception ignored) {}
                    }

                    task.update(task.getCategory(), newTitle, task.getDescription(),
                            task.getEstimatedMinutes(), task.getRemainingMinutes(), priority,
                            deadline, status, task.getPreferredStart(), task.getPreferredEnd(),
                            task.getMinimumSessionMinutes(), task.getMaximumSessionMinutes());
                    if (taskRepository != null) {
                        taskRepository.save(task);
                    }
                    createdOrModifiedId = task.getId();

                    message = String.format("Đã cập nhật công việc '%s' thành công.", newTitle);
                    data.put("taskId", task.getId());
                    data.put("title", newTitle);
                    data.put("status", status);
                }

                case "delete_task" -> {
                    Task task = requireTargetTask(user, params);
                    createdOrModifiedId = task.getId();
                    String oldTitle = task.getTitle();
                    if (taskRepository != null) {
                        taskRepository.delete(task);
                    }
                    message = String.format("Đã xóa công việc '%s' thành công.", oldTitle);
                    data.put("taskId", createdOrModifiedId);
                    data.put("title", oldTitle);
                }

                case "create_deadline" -> {
                    String title = getString(params, "title", "Hạn nộp");
                    String priority = getString(params, "priority", "HIGH");
                    String description = getString(params, "description", null);
                    Instant deadlineInst = null;
                    if (params.containsKey("deadline") && params.get("deadline") != null) {
                        try {
                            String dlStr = params.get("deadline").toString().trim();
                            if (dlStr.length() == 16) dlStr += ":00";
                            if (dlStr.contains("T") && !dlStr.endsWith("Z")) {
                                deadlineInst = LocalDateTime.parse(dlStr).atZone(zoneId).toInstant();
                            } else {
                                deadlineInst = Instant.parse(dlStr);
                            }
                        } catch (Exception ignored) {}
                    }
                    if (deadlineInst == null) {
                        deadlineInst = Instant.now().plusSeconds(86400L * 3);
                    }

                    Task deadlineTask = new Task(schedule, user, null, title, description,
                            60, 60, priority, deadlineInst, "TODO", null, null, 15, 60);
                    if (taskRepository != null) {
                        taskRepository.save(deadlineTask);
                        createdOrModifiedId = deadlineTask.getId();
                    }
                    ZonedDateTime dlLocal = deadlineInst.atZone(zoneId);
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm");
                    message = String.format("Đã tạo hạn chót '%s' (Hạn: %s) thành công.", title, dlLocal.format(fmt));
                    data.put("taskId", createdOrModifiedId);
                    data.put("title", title);
                    data.put("deadline", deadlineInst.toString());
                }

                case "update_reminder" -> {
                    Event event = requireTargetEvent(user, action.getTargetEventId(), params);
                    int reminderMinutes = 15;
                    if (params.containsKey("reminder_minutes") && params.get("reminder_minutes") != null) {
                        try { reminderMinutes = Integer.parseInt(params.get("reminder_minutes").toString().trim()); } catch (Exception ignored) {}
                    }
                    event.update(event.getCategory(), event.getTitle(), event.getDescription(),
                            event.getStartsAt(), event.getEndsAt(), event.getLocation(),
                            event.getPriority(), event.getStatus(), event.getRecurrenceRule(),
                            reminderMinutes, event.getNotes(), event.isFixed(), event.isLocked());
                    eventRepository.save(event);
                    createdOrModifiedId = event.getId();

                    message = String.format("Đã cập nhật nhắc nhở trước %d phút cho '%s' thành công.", reminderMinutes, event.getTitle());
                    data.put("eventId", event.getId());
                    data.put("title", event.getTitle());
                    data.put("reminderMinutes", reminderMinutes);
                }

                case "navigate_to" -> {
                    String route = getString(params, "route", "/dashboard");
                    String targetScreen = getString(params, "target_screen", "dashboard");
                    message = String.format("Đã chuyển hướng đến %s (%s).", targetScreen, route);
                    data.put("route", route);
                    data.put("targetScreen", targetScreen);
                }

                case "update_user_preferences" -> {
                    if (userRepository != null) {
                        if (params.containsKey("timezone") && params.get("timezone") != null) {
                            user.setTimezone(params.get("timezone").toString().trim());
                        }
                        if (params.containsKey("display_name") && params.get("display_name") != null) {
                            user.setDisplayName(params.get("display_name").toString().trim());
                        }
                        userRepository.save(user);
                    }
                    message = "Đã cập nhật tùy chọn người dùng thành công.";
                    data.put("timezone", user.getTimezone());
                    data.put("displayName", user.getDisplayName());
                }

                case "create_study_plan", "batch_action", "import_vision_schedule" -> {
                    if (action.getPlanId() != null) {
                        AiDtos.PlanConfirmResponse planRes = confirmPlan(user, action.getPlanId());
                        message = planRes.message();
                        data.put("planId", action.getPlanId());
                        data.put("results", planRes.results());
                    } else {
                        message = "Đã thực thi thành công kế hoạch.";
                    }
                }

                case "optimize_day", "optimize_week" -> {
                    message = "Đã áp dụng các tối ưu hóa thời khóa biểu.";
                    data.putAll(params);
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
    public AiDtos.PlanConfirmResponse confirmPlan(User user, UUID planId) {
        if (actionPlanRepository == null) {
            throw new AiException("UNSUPPORTED_OPERATION", "Quản lý kế hoạch hành động chưa được kích hoạt.");
        }
        AiActionPlan plan = actionPlanRepository.findByIdAndUserId(planId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy kế hoạch hành động hoặc bạn không có quyền."));

        if (AiActionPlan.STATUS_SUCCESS.equalsIgnoreCase(plan.getStatus())) {
            throw new AiException("ALREADY_EXECUTED", "Kế hoạch này đã được thực thi thành công trước đó.");
        }
        if (AiActionPlan.STATUS_CANCELLED.equalsIgnoreCase(plan.getStatus())) {
            throw new AiException("ALREADY_CANCELLED", "Kế hoạch này đã bị hủy bỏ.");
        }

        plan.markExecuting();
        actionPlanRepository.saveAndFlush(plan);

        List<AiAction> subActions = actionRepository.findAllByPlanIdOrderByStepOrderAsc(planId);
        List<AiDtos.ActionConfirmResponse> results = new ArrayList<>();

        try {
            for (AiAction sub : subActions) {
                // If it's a child action that is still PROPOSED, execute it
                if (AiAction.STATUS_PROPOSED.equalsIgnoreCase(sub.getStatus())) {
                    AiDtos.ActionConfirmResponse res = confirmAction(user, sub.getId());
                    results.add(res);
                }
            }
            plan.markSuccess();
            actionPlanRepository.save(plan);
            return new AiDtos.PlanConfirmResponse(
                    plan.getId(),
                    AiActionPlan.STATUS_SUCCESS,
                    String.format("Đã thực thi toàn bộ kế hoạch '%s' (%d hành động) thành công.", plan.getTitle(), results.size()),
                    results
            );
        } catch (Exception ex) {
            log.error("Batch plan execution failed for plan {}: {}", planId, ex.getMessage(), ex);
            plan.markFailed();
            actionPlanRepository.save(plan);
            throw new AiException("PLAN_EXECUTION_FAILED", "Kế hoạch thực thi thất bại tại một bước (" + ex.getMessage() + "). Tất cả các bước đã được rollback an toàn.");
        }
    }

    @Transactional
    public AiDtos.PlanConfirmResponse cancelPlan(User user, UUID planId) {
        if (actionPlanRepository == null) {
            throw new AiException("UNSUPPORTED_OPERATION", "Quản lý kế hoạch hành động chưa được kích hoạt.");
        }
        AiActionPlan plan = actionPlanRepository.findByIdAndUserId(planId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy kế hoạch hành động hoặc bạn không có quyền."));

        plan.markCancelled();
        actionPlanRepository.save(plan);

        List<AiAction> subActions = actionRepository.findAllByPlanIdOrderByStepOrderAsc(planId);
        for (AiAction sub : subActions) {
            if (AiAction.STATUS_PROPOSED.equalsIgnoreCase(sub.getStatus())) {
                sub.markCancelled();
                actionRepository.save(sub);
            }
        }
        return new AiDtos.PlanConfirmResponse(plan.getId(), AiActionPlan.STATUS_CANCELLED, "Đã hủy kế hoạch hành động.", List.of());
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
        List<AiDtos.ProposedActionDto> subActions = List.of();
        if (a.getPlanId() != null && "batch_action".equals(a.getTool()) && actionPlanRepository != null) {
            List<AiAction> children = actionRepository.findAllByPlanIdOrderByStepOrderAsc(a.getPlanId());
            subActions = children.stream()
                    .filter(c -> !c.getId().equals(a.getId()))
                    .map(this::toDtoWithoutSubActions)
                    .toList();
        }
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
                a.getErrorMessage(),
                a.getRiskLevel() != null ? a.getRiskLevel() : "IMPORTANT_WRITE",
                a.getPlanId(),
                a.getStepOrder() != null ? a.getStepOrder() : 1,
                subActions
        );
    }

    private AiDtos.ProposedActionDto toDtoWithoutSubActions(AiAction a) {
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
                a.getErrorMessage(),
                a.getRiskLevel() != null ? a.getRiskLevel() : "IMPORTANT_WRITE",
                a.getPlanId(),
                a.getStepOrder() != null ? a.getStepOrder() : 1,
                List.of()
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

    private Task findTargetTask(User user, Map<String, Object> args, AiDtos.ClientContextDto clientContext) {
        if (taskRepository == null || args == null) return null;

        Object taskIdObj = args.get("task_id");
        if (taskIdObj == null) taskIdObj = args.get("task_id_or_title");
        if (taskIdObj != null) {
            try {
                UUID id = UUID.fromString(taskIdObj.toString().trim());
                Optional<Task> t = taskRepository.findByIdAndOwnerId(id, user.getId());
                if (t.isPresent()) return t.get();
            } catch (Exception ignored) {}
        }

        if (clientContext != null && clientContext.selectedTaskId() != null && !clientContext.selectedTaskId().isBlank()) {
            try {
                UUID id = UUID.fromString(clientContext.selectedTaskId().trim());
                Optional<Task> t = taskRepository.findByIdAndOwnerId(id, user.getId());
                if (t.isPresent()) return t.get();
            } catch (Exception ignored) {}
        }

        String query = getString(args, "task_id_or_title", getString(args, "title", null));
        if (query != null && !query.isBlank()) {
            List<Task> userTasks = taskRepository.findAllByOwnerId(user.getId());
            String q = query.toLowerCase().trim();
            for (Task t : userTasks) {
                String title = t.getTitle().toLowerCase().trim();
                if (title.equals(q) || title.contains(q) || q.contains(title)) {
                    return t;
                }
            }
        }
        return null;
    }

    private Task requireTargetTask(User user, Map<String, Object> params) {
        Task task = findTargetTask(user, params, null);
        if (task == null) {
            throw new AiException("NOT_FOUND", "Không tìm thấy công việc phù hợp.");
        }
        return task;
    }

    public static String resolveRoute(String screen) {
        if (screen == null || screen.isBlank()) return "/dashboard";
        String s = screen.toLowerCase().trim().replace("/", "").replace("-", "");
        for (Map.Entry<String, String> entry : ROUTE_WHITELIST.entrySet()) {
            if (s.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "/dashboard";
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
