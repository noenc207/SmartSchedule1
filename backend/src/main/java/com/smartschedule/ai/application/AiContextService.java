package com.smartschedule.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.infrastructure.VisionResultRepository;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AiContextService {
    private final ScheduleRepository scheduleRepository;
    private final EventRepository eventRepository;
    private final TaskRepository taskRepository;
    private final VisionResultRepository visionResultRepository;
    private final ObjectMapper objectMapper;

    public AiContextService(ScheduleRepository scheduleRepository,
                            EventRepository eventRepository,
                            TaskRepository taskRepository) {
        this(scheduleRepository, eventRepository, taskRepository, null, new ObjectMapper());
    }

    @Autowired
    public AiContextService(ScheduleRepository scheduleRepository,
                            EventRepository eventRepository,
                            TaskRepository taskRepository,
                            @Autowired(required = false) VisionResultRepository visionResultRepository,
                            @Autowired(required = false) ObjectMapper objectMapper) {
        this.scheduleRepository = scheduleRepository;
        this.eventRepository = eventRepository;
        this.taskRepository = taskRepository;
        this.visionResultRepository = visionResultRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Transactional(readOnly = true)
    public String buildContextSummary(User user) {
        return buildContextSummary(user, null);
    }

    @Transactional(readOnly = true)
    public String buildContextSummary(User user, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        String lang = (clientContext != null && clientContext.preferredLanguage() != null && !clientContext.preferredLanguage().isBlank())
                ? clientContext.preferredLanguage().trim().toLowerCase()
                : (user.getLocale() != null ? user.getLocale().trim().toLowerCase() : "vi");
        boolean isEnglish = "en".equals(lang) || lang.startsWith("en");

        Locale locale = isEnglish ? Locale.ENGLISH : Locale.forLanguageTag("vi-VN");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = isEnglish
                ? DateTimeFormatter.ofPattern("EEEE, MMMM dd, yyyy", locale)
                : DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy", locale);

        String mode = (clientContext != null && clientContext.activeContextMode() != null && !clientContext.activeContextMode().isBlank())
                ? clientContext.activeContextMode().trim().toUpperCase()
                : "ACADEMIC";

        StringBuilder sb = new StringBuilder();
        sb.append(isEnglish ? "=== CURRENT USER & TEMPORAL CONTEXT ===\n" : "=== THÔNG TIN NGƯỜI DÙNG & NGỮ CẢNH THỜI GIAN HIỆN TẠI ===\n");
        sb.append(isEnglish ? "- User: " : "- Người dùng: ").append(user.getDisplayName()).append(" (Email: ").append(user.getEmail()).append(")\n");
        sb.append(isEnglish ? "- Current Time: " : "- Thời gian hiện tại: ").append(now.format(timeFmt)).append("\n");
        sb.append(isEnglish ? "- Current Date: " : "- Ngày hiện tại: ").append(now.format(dateFmt)).append("\n");
        sb.append(isEnglish ? "- Timezone: " : "- Múi giờ: ").append(zoneId.getId()).append("\n");
        sb.append(isEnglish ? "- Preferred Language: English (EN)\n" : "- Ngôn ngữ ưu tiên: Tiếng Việt (VI)\n");
        sb.append(isEnglish ? "- Active Context Focus: " + mode + "\n" : "- Chế độ ngữ cảnh: " + mode + "\n");

        switch (mode) {
            case "WORK" -> {
                sb.append(isEnglish
                        ? "\n=== ACTIVE CONTEXT FOCUS: WORK & PROJECTS ===\n" +
                          "- Priority: Pending tasks, project deadlines, teamwork deliverables, and meeting commitments.\n" +
                          "- Instruction: When answering general queries, prioritize work tasks and deadline deliverables.\n"
                        : "\n=== CHẾ ĐỘ NGỮ CẢNH: DỰ ÁN & CÔNG VIỆC (WORK FOCUS) ===\n" +
                          "- Ưu tiên: Danh sách nhiệm vụ (tasks), hạn nộp dự án, cuộc họp và tiến độ công việc.\n" +
                          "- Chỉ dẫn: Khi người dùng hỏi chung, ưu tiên phân tích các task pending và hạn chót dự án.\n");
            }
            case "PERSONAL" -> {
                sb.append(isEnglish
                        ? "\n=== ACTIVE CONTEXT FOCUS: PERSONAL & WELLNESS ===\n" +
                          "- Priority: Free time windows, wellness habits, exercise, rest, and study-life balance.\n" +
                          "- Instruction: When answering general queries, highlight breaks, free slots, and healthy balance.\n"
                        : "\n=== CHẾ ĐỘ NGỮ CẢNH: CÁ NHÂN & ĐỜI SỐNG (PERSONAL FOCUS) ===\n" +
                          "- Ưu tiên: Khoảng trống thời gian rảnh, thói quen sinh hoạt, thể thao, nghỉ ngơi phục hồi năng lượng.\n" +
                          "- Chỉ dẫn: Khi người dùng hỏi chung, tập trung vào thời gian rảnh và cân bằng sinh hoạt.\n");
            }
            case "GENERAL" -> {
                sb.append(isEnglish
                        ? "\n=== ACTIVE CONTEXT FOCUS: BALANCED MULTI-CONTEXT ===\n" +
                          "- Priority: Balanced integration of academic classes, project tasks, and personal downtime.\n"
                        : "\n=== CHẾ ĐỘ NGỮ CẢNH: ĐA MỤC TIÊU TỔNG HỢP (BALANCED MULTI-CONTEXT) ===\n" +
                          "- Ưu tiên: Cân bằng toàn diện giữa lịch học, công việc dự án và thời gian cá nhân.\n");
            }
            default -> { // ACADEMIC
                sb.append(isEnglish
                        ? "\n=== ACTIVE CONTEXT FOCUS: ACADEMIC & STUDY ===\n" +
                          "- Priority: Timetable classes, lecture slots, instructors, classrooms, syllabus, and exam schedules.\n" +
                          "- Instruction: When answering general queries or schedule checks, prioritize academic classes and study sessions.\n"
                        : "\n=== CHẾ ĐỘ NGỮ CẢNH: HỌC TẬP (ACADEMIC FOCUS) ===\n" +
                          "- Ưu tiên: Lịch học, tiết học, phòng học, giảng viên, tín chỉ, syllabus và đề thi.\n" +
                          "- Chỉ dẫn: Khi người dùng hỏi chung hoặc kiểm tra lịch, ưu tiên thời khóa biểu và các tiết học.\n");
            }
        }

        if (clientContext != null) {
            sb.append(isEnglish ? "\n=== CLIENT UI CONTEXT ===\n" : "\n=== NGỮ CẢNH GIAO DIỆN HIỆN TẠI (CLIENT CONTEXT) ===\n");
            if (clientContext.page() != null && !clientContext.page().isBlank()) {
                sb.append(isEnglish ? "- Active Screen: " : "- Màn hình đang mở: ").append(clientContext.page()).append("\n");
            }
            if (clientContext.selectedDate() != null && !clientContext.selectedDate().isBlank()) {
                sb.append(isEnglish ? "- Selected Date on Calendar: " : "- Ngày đang được xem/chọn trên lịch: ").append(clientContext.selectedDate()).append("\n");
            }
            if (clientContext.selectedEventTitle() != null && !clientContext.selectedEventTitle().isBlank()) {
                sb.append(isEnglish ? "- Selected Event: " : "- Sự kiện đang được chọn/mở: ").append(clientContext.selectedEventTitle());
                if (clientContext.selectedEventId() != null) {
                    sb.append(" (ID: ").append(clientContext.selectedEventId()).append(")");
                }
                sb.append("\n");
            }
        }
        sb.append("\n");

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        if (schedules.isEmpty()) {
            sb.append("Người dùng hiện chưa có lịch trình nào được lưu.\n");
            return sb.toString();
        }

        ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(zoneId);
        ZonedDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        ZonedDateTime endOfWeek = startOfDay.plusDays(7);

        Instant startOfDayInst = startOfDay.toInstant();
        Instant endOfDayInst = endOfDay.toInstant();
        Instant endOfWeekInst = endOfWeek.toInstant();

        List<Event> todayEvents = new ArrayList<>();
        List<Event> upcomingEvents = new ArrayList<>();
        List<Task> pendingTasks = new ArrayList<>();

        for (Schedule schedule : schedules) {
            List<Event> events = eventRepository.search(
                    schedule.getId(), startOfDayInst, endOfWeekInst, null, null, null
            );
            for (Event e : events) {
                if (e.getStartsAt().isBefore(endOfDayInst) && e.getEndsAt().isAfter(startOfDayInst)) {
                    todayEvents.add(e);
                } else if (e.getStartsAt().isAfter(endOfDayInst)) {
                    upcomingEvents.add(e);
                }
            }
            List<Task> tasks = taskRepository.findAllByScheduleId(schedule.getId());
            for (Task t : tasks) {
                if (!"DONE".equalsIgnoreCase(t.getStatus()) && !"COMPLETED".equalsIgnoreCase(t.getStatus())) {
                    pendingTasks.add(t);
                }
            }
        }

        todayEvents.sort(Comparator.comparing(Event::getStartsAt));
        upcomingEvents.sort(Comparator.comparing(Event::getStartsAt));
        pendingTasks.sort(Comparator.comparing(Task::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())));

        // 1. Today's Events
        sb.append("=== LỊCH TRÌNH HÔM NAY (").append(now.toLocalDate()).append(") ===\n");
        if (todayEvents.isEmpty()) {
            sb.append("Hôm nay bạn không có sự kiện/tiết học cố định nào.\n");
        } else {
            for (Event e : todayEvents) {
                ZonedDateTime startLocal = e.getStartsAt().atZone(zoneId);
                ZonedDateTime endLocal = e.getEndsAt().atZone(zoneId);
                sb.append("• [").append(startLocal.format(timeFmt)).append(" - ").append(endLocal.format(timeFmt)).append("] ")
                        .append(e.getTitle());
                if (e.getLocation() != null && !e.getLocation().isBlank()) {
                    sb.append(" (Phòng/Địa điểm: ").append(e.getLocation()).append(")");
                }
                sb.append("\n");
            }
        }
        sb.append("\n");

        // 2. Free Time Slots Today
        List<String> freeSlots = computeFreeSlots(todayEvents, now, zoneId);
        sb.append("=== KHOẢNG TRỐNG THỜI GIAN HÔM NAY ===\n");
        if (freeSlots.isEmpty()) {
            sb.append("Hôm nay lịch trình khá kín hoặc đã hết thời gian hoạt động ban ngày.\n");
        } else {
            for (String slot : freeSlots) {
                sb.append("• ").append(slot).append("\n");
            }
        }
        sb.append("\n");

        // 3. Upcoming Events (Next 7 Days)
        sb.append("=== SỰ KIỆN SẮP TỚI (7 NGÀY TỚI) ===\n");
        if (upcomingEvents.isEmpty()) {
            sb.append("Không có sự kiện nào trong 7 ngày tới.\n");
        } else {
            int count = 0;
            for (Event e : upcomingEvents) {
                if (count++ >= 8) break;
                ZonedDateTime startLocal = e.getStartsAt().atZone(zoneId);
                DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEE dd/MM HH:mm", Locale.forLanguageTag("vi-VN"));
                sb.append("• ").append(startLocal.format(dayFmt)).append(": ").append(e.getTitle()).append("\n");
            }
        }
        sb.append("\n");

        // 4. Pending Tasks & Deadlines
        sb.append("=== NHIỆM VỤ & DEADLINE ĐANG CHỜ ===\n");
        if (pendingTasks.isEmpty()) {
            sb.append("Bạn không có nhiệm vụ nào còn dang dở.\n");
        } else {
            int count = 0;
            for (Task t : pendingTasks) {
                if (count++ >= 6) break;
                sb.append("• ").append(t.getTitle());
                if (t.getDeadline() != null) {
                    ZonedDateTime dueLocal = t.getDeadline().atZone(zoneId);
                    sb.append(" (Hạn chót: ").append(dueLocal.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append(")");
                }
                if (t.getPriority() != null) {
                    sb.append(" [Ưu tiên: ").append(t.getPriority()).append("]");
                }
                sb.append("\n");
            }
        }

        // 5. Recent Vision Results (Zero Raw Image to Gemini - Only Structured Data)
        if (visionResultRepository != null) {
            try {
                List<com.smartschedule.ai.domain.VisionResult> visionList = visionResultRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
                if (!visionList.isEmpty()) {
                    com.smartschedule.ai.domain.VisionResult latest = visionList.get(0);
                    if (Duration.between(latest.getCreatedAt(), Instant.now()).toMinutes() < 120) {
                        sb.append("\n=== KẾT QUẢ PHÂN TÍCH THỊ GIÁC GẦN ĐÂY (STRUCTURED VISION DATA) ===\n");
                        sb.append("- Result ID: ").append(latest.getId()).append("\n");
                        sb.append("- Loại tài liệu: ").append(latest.getDocumentType())
                          .append(" | Provider: ").append(latest.getProvider())
                          .append(" (Độ tin cậy: ").append(String.format(Locale.US, "%.0f%%", latest.getConfidence() * 100)).append(")\n");
                        sb.append("- Tóm tắt: ").append(latest.getSummary()).append("\n");

                        try {
                            Map<String, Object> payload = objectMapper.readValue(latest.getPayloadJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                            if (payload.containsKey("events")) {
                                List<Map<String, Object>> evs = (List<Map<String, Object>>) payload.get("events");
                                if (evs != null && !evs.isEmpty()) {
                                    sb.append("- Danh sách lịch học trích xuất được từ ảnh:\n");
                                    for (Map<String, Object> ev : evs) {
                                        sb.append("  • ").append(ev.get("title"))
                                          .append(" | ").append(ev.getOrDefault("day_of_week", "Hàng tuần"))
                                          .append(" (").append(ev.get("start_time")).append("–").append(ev.get("end_time")).append(")")
                                          .append(ev.get("location") != null ? " tại " + ev.get("location") : "")
                                          .append("\n");
                                    }
                                }
                            }
                            if (payload.containsKey("deadlines")) {
                                List<Map<String, Object>> dls = (List<Map<String, Object>>) payload.get("deadlines");
                                if (dls != null && !dls.isEmpty()) {
                                    sb.append("- Danh sách hạn chót / deadline từ ảnh:\n");
                                    for (Map<String, Object> dl : dls) {
                                        sb.append("  • [HẠN NỘP] ").append(dl.get("title")).append(" (Hạn chót: ").append(dl.get("due_date")).append(")\n");
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                        sb.append("LƯU Ý: Đây là dữ liệu JSON đã số hóa cục bộ. RAW IMAGE KHÔNG ĐƯỢC GỬI CHO GEMINI.\n");
                    }
                }
            } catch (Exception ignored) {}
        }

        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String executeTool(String toolName, User user, Map<String, Object> arguments) {
        return executeTool(toolName, user, arguments, null);
    }

    @Transactional(readOnly = true)
    public String executeTool(String toolName, User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        return switch (toolName) {
            case "get_today_schedule" -> getTodaySchedule(user, clientContext);
            case "get_week_schedule" -> getWeekSchedule(user, arguments, clientContext);
            case "get_upcoming_schedule" -> getUpcomingSchedule(user, arguments, clientContext);
            case "find_free_time" -> findFreeTime(user, arguments, clientContext);
            case "check_schedule_conflict" -> checkScheduleConflict(user, arguments, clientContext);
            case "get_schedule_details" -> getScheduleDetails(user, arguments, clientContext);
            case "search_schedule" -> searchSchedule(user, arguments, clientContext);
            case "get_tasks" -> getTasks(user, arguments);
            case "get_deadlines" -> getDeadlines(user, arguments, clientContext);
            case "get_user_preferences" -> getUserPreferences(user);
            case "get_analytics_summary" -> getAnalyticsSummary(user, clientContext);
            case "analyze_document" -> analyzeDocument(arguments);
            default -> "Công cụ không được hỗ trợ: " + toolName;
        };
    }

    public String getTodaySchedule(User user) {
        return getTodaySchedule(user, null);
    }

    public String getTodaySchedule(User user, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(zoneId);
        ZonedDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<Event> todayEvents = new ArrayList<>();
        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(), startOfDay.toInstant(), endOfDay.toInstant(), null, null, null);
            todayEvents.addAll(events);
        }
        todayEvents.sort(Comparator.comparing(Event::getStartsAt));

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        if (todayEvents.isEmpty()) {
            return "Hôm nay bạn không có lịch học hay sự kiện nào.";
        }

        StringBuilder sb = new StringBuilder("Lịch hôm nay (" + now.toLocalDate() + "):\n");
        for (Event e : todayEvents) {
            ZonedDateTime start = e.getStartsAt().atZone(zoneId);
            ZonedDateTime end = e.getEndsAt().atZone(zoneId);
            sb.append("- ").append(start.format(timeFmt)).append(" - ").append(end.format(timeFmt)).append(": ").append(e.getTitle());
            if (e.getLocation() != null && !e.getLocation().isBlank()) {
                sb.append(" (").append(e.getLocation()).append(")");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    public String getUpcomingSchedule(User user) {
        return getUpcomingSchedule(user, Collections.emptyMap(), null);
    }

    public String getUpcomingSchedule(User user, Map<String, Object> arguments) {
        return getUpcomingSchedule(user, arguments, null);
    }

    public String getUpcomingSchedule(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        int days = 7;
        if (arguments != null && arguments.containsKey("days")) {
            try {
                days = Integer.parseInt(arguments.get("days").toString().trim());
            } catch (Exception ignored) {}
        }
        days = Math.max(1, Math.min(30, days));
        ZonedDateTime endOfPeriod = now.plusDays(days);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<Event> upcomingEvents = new ArrayList<>();
        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(), now.toInstant(), endOfPeriod.toInstant(), null, null, null);
            upcomingEvents.addAll(events);
        }
        upcomingEvents.sort(Comparator.comparing(Event::getStartsAt));

        if (upcomingEvents.isEmpty()) {
            return String.format("Bạn không có sự kiện nào sắp diễn ra trong %d ngày tới.", days);
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm", Locale.forLanguageTag("vi-VN"));
        StringBuilder sb = new StringBuilder(String.format("Lịch trình %d ngày tới:\n", days));
        for (Event e : upcomingEvents) {
            ZonedDateTime start = e.getStartsAt().atZone(zoneId);
            sb.append("- ").append(start.format(fmt)).append(": ").append(e.getTitle()).append("\n");
        }
        return sb.toString();
    }

    public String findFreeTime(User user) {
        return findFreeTime(user, Collections.emptyMap(), null);
    }

    public String findFreeTime(User user, Map<String, Object> arguments) {
        return findFreeTime(user, arguments, null);
    }

    public String findFreeTime(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        LocalDate targetDate = now.toLocalDate();
        if (arguments != null && arguments.containsKey("date")) {
            try {
                targetDate = LocalDate.parse(arguments.get("date").toString().trim());
            } catch (Exception ignored) {}
        }

        ZonedDateTime startOfDay = targetDate.atStartOfDay(zoneId);
        ZonedDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<Event> dayEvents = new ArrayList<>();
        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(), startOfDay.toInstant(), endOfDay.toInstant(), null, null, null);
            dayEvents.addAll(events);
        }
        dayEvents.sort(Comparator.comparing(Event::getStartsAt));

        List<String> freeSlots = computeFreeSlotsForDate(dayEvents, targetDate, now, zoneId);
        if (freeSlots.isEmpty()) {
            return String.format("Dựa trên lịch hiện tại, bạn không còn khoảng trống đáng kể nào vào ngày %s.", targetDate);
        }
        return String.format("Khoảng trống thời gian ngày %s:\n%s", targetDate, String.join("\n", freeSlots));
    }

    public String checkScheduleConflict(User user, Map<String, Object> arguments) {
        return checkScheduleConflict(user, arguments, null);
    }

    public String checkScheduleConflict(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        Instant startsAt = parseInstant(arguments.get("start_time"), zoneId);
        Instant endsAt = parseInstant(arguments.get("end_time"), zoneId);

        if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt)) {
            return "Khoảng thời gian kiểm tra không hợp lệ. Vui lòng cung cấp start_time và end_time hợp lệ.";
        }

        UUID excludeEventId = null;
        if (arguments.containsKey("exclude_event_id")) {
            try {
                excludeEventId = UUID.fromString(arguments.get("exclude_event_id").toString().trim());
            } catch (Exception ignored) {}
        }

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<String> conflicts = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");

        for (Schedule s : schedules) {
            List<Event> overlaps = eventRepository.search(s.getId(), startsAt, endsAt, null, null, null);
            for (Event e : overlaps) {
                if (excludeEventId != null && e.getId().equals(excludeEventId)) continue;
                if (e.getStartsAt().isBefore(endsAt) && e.getEndsAt().isAfter(startsAt)) {
                    ZonedDateTime st = e.getStartsAt().atZone(zoneId);
                    ZonedDateTime en = e.getEndsAt().atZone(zoneId);
                    conflicts.add(String.format("'%s' (%s %s–%s)", e.getTitle(), st.format(dateFmt), st.format(timeFmt), en.format(timeFmt)));
                }
            }
        }

        if (conflicts.isEmpty()) {
            return "Không phát hiện xung đột nào trong khoảng thời gian này. Thời gian hoàn toàn trống!";
        }
        return "⚠️ Phát hiện xung đột với các lịch trình sau: " + String.join(", ", conflicts);
    }

    public String getScheduleDetails(User user, Map<String, Object> arguments) {
        return getScheduleDetails(user, arguments, null);
    }

    public String getScheduleDetails(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        if (arguments == null || !arguments.containsKey("event_id_or_title")) {
            return "Vui lòng cung cấp event_id_or_title để tra cứu chi tiết.";
        }
        String query = arguments.get("event_id_or_title").toString().trim();
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        DateTimeFormatter dtFmt = DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy HH:mm", Locale.forLanguageTag("vi-VN"));

        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(),
                    Instant.now().minusSeconds(86400L * 30),
                    Instant.now().plusSeconds(86400L * 60),
                    null, null, null);
            for (Event e : events) {
                boolean matchId = false;
                try {
                    matchId = e.getId().equals(UUID.fromString(query));
                } catch (Exception ignored) {}

                if (matchId || e.getTitle().equalsIgnoreCase(query) || e.getTitle().toLowerCase().contains(query.toLowerCase())) {
                    ZonedDateTime st = e.getStartsAt().atZone(zoneId);
                    ZonedDateTime en = e.getEndsAt().atZone(zoneId);
                    return String.format("""
                            Chi tiết sự kiện:
                            - Tiêu đề: %s
                            - Bắt đầu: %s
                            - Kết thúc: %s
                            - Địa điểm: %s
                            - Mô tả: %s
                            - Ưu tiên: %s
                            - Trạng thái: %s
                            """,
                            e.getTitle(),
                            st.format(dtFmt),
                            en.format(dtFmt),
                            e.getLocation() != null ? e.getLocation() : "Chưa có",
                            e.getDescription() != null ? e.getDescription() : "Không có mô tả",
                            e.getPriority(),
                            e.getStatus()
                    );
                }
            }
        }

        return "Không tìm thấy sự kiện nào khớp với: " + query;
    }

    private List<String> computeFreeSlots(List<Event> events, ZonedDateTime now, ZoneId zoneId) {
        return computeFreeSlotsForDate(events, now.toLocalDate(), now, zoneId);
    }

    private List<String> computeFreeSlotsForDate(List<Event> events, LocalDate date, ZonedDateTime now, ZoneId zoneId) {
        List<String> result = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        ZonedDateTime dayStart = date.atTime(8, 0).atZone(zoneId);
        ZonedDateTime dayEnd = date.atTime(22, 0).atZone(zoneId);

        if (date.equals(now.toLocalDate()) && now.isAfter(dayStart)) {
            dayStart = now.plusMinutes(15).withSecond(0).withNano(0);
        }

        if (!dayStart.isBefore(dayEnd)) {
            return result;
        }

        ZonedDateTime pointer = dayStart;
        for (Event e : events) {
            ZonedDateTime eventStart = e.getStartsAt().atZone(zoneId);
            ZonedDateTime eventEnd = e.getEndsAt().atZone(zoneId);

            if (eventEnd.isBefore(pointer)) continue;

            if (eventStart.isAfter(pointer)) {
                Duration gap = Duration.between(pointer, eventStart);
                if (gap.toMinutes() >= 30) {
                    result.add(String.format("%s - %s (Khoảng trống %d phút)",
                            pointer.format(timeFmt), eventStart.format(timeFmt), gap.toMinutes()));
                }
            }
            if (eventEnd.isAfter(pointer)) {
                pointer = eventEnd;
            }
        }

        if (pointer.isBefore(dayEnd)) {
            Duration gap = Duration.between(pointer, dayEnd);
            if (gap.toMinutes() >= 30) {
                result.add(String.format("%s - %s (Khoảng trống %d phút)",
                        pointer.format(timeFmt), dayEnd.format(timeFmt), gap.toMinutes()));
            }
        }

        return result;
    }

    private Instant parseInstant(Object raw, ZoneId zoneId) {
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
        return null;
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

    public String getWeekSchedule(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        int days = 7;
        if (arguments != null && arguments.containsKey("days")) {
            try { days = Integer.parseInt(arguments.get("days").toString().trim()); } catch (Exception ignored) {}
        }
        return getUpcomingSchedule(user, Map.of("days", days), clientContext);
    }

    public String searchSchedule(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        String query = arguments != null && arguments.containsKey("query") ? arguments.get("query").toString().trim() : "";
        if (query.isBlank()) return "Vui lòng cung cấp từ khóa tìm kiếm.";
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        Instant from = Instant.now().minusSeconds(86400L * 14);
        Instant to = Instant.now().plusSeconds(86400L * 60);
        List<Event> matches = new ArrayList<>();
        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(), from, to, null, null, null);
            for (Event e : events) {
                if (AiActionService.isSubjectMatch(e.getTitle(), query) || e.getTitle().toLowerCase().contains(query.toLowerCase())) {
                    matches.add(e);
                }
            }
        }
        if (matches.isEmpty()) {
            return "Không tìm thấy sự kiện nào khớp với từ khóa: '" + query + "'.";
        }
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE dd/MM HH:mm", Locale.forLanguageTag("vi-VN"));
        StringBuilder sb = new StringBuilder("Kết quả tìm kiếm cho '" + query + "':\n");
        for (Event e : matches) {
            ZonedDateTime start = e.getStartsAt().atZone(zoneId);
            sb.append("- ").append(start.format(dateFmt)).append(": ").append(e.getTitle());
            if (e.getLocation() != null && !e.getLocation().isBlank()) sb.append(" (").append(e.getLocation()).append(")");
            sb.append("\n");
        }
        return sb.toString();
    }

    public String getTasks(User user, Map<String, Object> arguments) {
        List<Task> tasks = taskRepository.findAllByOwnerId(user.getId());
        String filter = arguments != null && arguments.containsKey("status") ? arguments.get("status").toString().toUpperCase() : "TODO";
        List<Task> filtered = tasks.stream()
                .filter(t -> "ALL".equals(filter) || ("TODO".equals(filter) && !"COMPLETED".equalsIgnoreCase(t.getStatus())) || filter.equalsIgnoreCase(t.getStatus()))
                .sorted(Comparator.comparing(Task::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        if (filtered.isEmpty()) {
            return "Bạn hiện không có công việc nào trong danh sách (" + filter + ").";
        }
        StringBuilder sb = new StringBuilder("Danh sách công việc (" + filter + "):\n");
        for (Task t : filtered) {
            sb.append("- [").append(t.getStatus()).append("] ").append(t.getTitle());
            if (t.getEstimatedMinutes() > 0) sb.append(" (").append(t.getEstimatedMinutes()).append(" phút)");
            if (t.getPriority() != null) sb.append(" [Ưu tiên: ").append(t.getPriority()).append("]");
            if (t.getDeadline() != null) sb.append(" - Hạn chót: ").append(t.getDeadline().toString().substring(0, 16).replace("T", " "));
            sb.append("\n");
        }
        return sb.toString();
    }

    public String getDeadlines(User user, Map<String, Object> arguments, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        List<Task> tasks = taskRepository.findAllByOwnerId(user.getId());
        Instant now = Instant.now();
        int days = 14;
        if (arguments != null && arguments.containsKey("days")) {
            try { days = Integer.parseInt(arguments.get("days").toString().trim()); } catch (Exception ignored) {}
        }
        Instant limit = now.plusSeconds(86400L * days);
        List<Task> deadlines = tasks.stream()
                .filter(t -> t.getDeadline() != null && !"COMPLETED".equalsIgnoreCase(t.getStatus()))
                .filter(t -> !t.getDeadline().isBefore(now.minusSeconds(86400)) && t.getDeadline().isBefore(limit))
                .sorted(Comparator.comparing(Task::getDeadline))
                .toList();
        if (deadlines.isEmpty()) {
            return String.format("Bạn không có hạn chót (deadline) nào cần nộp trong %d ngày tới. Thời gian rất an toàn!", days);
        }
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm");
        StringBuilder sb = new StringBuilder(String.format("⚠️ Các deadline quan trọng trong %d ngày tới:\n", days));
        for (Task t : deadlines) {
            ZonedDateTime dl = t.getDeadline().atZone(zoneId);
            long hoursLeft = Duration.between(now, t.getDeadline()).toHours();
            String urgency = hoursLeft < 24 ? "🚨 GẤP (<24h)" : hoursLeft < 72 ? "⚡ Sắp tới" : "⏳ Bình thường";
            sb.append("- ").append(urgency).append(" ").append(t.getTitle())
                    .append(" (Hạn: ").append(dl.format(fmt)).append(")");
            sb.append("\n");
        }
        return sb.toString();
    }

    public String getUserPreferences(User user) {
        return String.format("Thông tin tài khoản & Cài đặt:\n- Tên hiển thị: %s\n- Email: %s\n- Múi giờ: %s\n- Ngôn ngữ: %s\n- Hạng tài khoản: %s",
                user.getDisplayName(), user.getEmail(), user.getTimezone(), user.getLocale(), user.getTier());
    }

    public String getAnalyticsSummary(User user, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime startOfWeek = now.with(java.time.DayOfWeek.MONDAY).toLocalDate().atStartOfDay(zoneId);
        ZonedDateTime endOfWeek = startOfWeek.plusDays(7).minusNanos(1);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        long totalStudyMinutes = 0;
        int eventCount = 0;
        for (Schedule s : schedules) {
            List<Event> weekEvents = eventRepository.search(s.getId(), startOfWeek.toInstant(), endOfWeek.toInstant(), null, null, null);
            for (Event e : weekEvents) {
                totalStudyMinutes += Duration.between(e.getStartsAt(), e.getEndsAt()).toMinutes();
                eventCount++;
            }
        }

        List<Task> tasks = taskRepository.findAllByOwnerId(user.getId());
        long completedTasks = tasks.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus())).count();
        long pendingTasks = tasks.stream().filter(t -> !"COMPLETED".equalsIgnoreCase(t.getStatus())).count();

        return String.format("""
                📊 THỐNG KÊ HỌC TẬP TUẦN NÀY (%s đến %s):
                - Tổng số tiết học/phiên ôn tập: %d sự kiện
                - Tổng thời gian học tập: %.1f giờ (%d phút)
                - Công việc đã hoàn thành: %d task
                - Công việc đang chờ xử lý: %d task
                - Đánh giá phân bổ thời gian: %s
                """,
                startOfWeek.toLocalDate().toString(), endOfWeek.toLocalDate().toString(),
                eventCount, (totalStudyMinutes / 60.0), totalStudyMinutes,
                completedTasks, pendingTasks,
                totalStudyMinutes > 1800 ? "Lịch học khá dày, hãy chú ý nghỉ ngơi hợp lý." : "Thời gian học tập phân bổ vừa phải, có nhiều khoảng trống để tự học thêm.");
    }

    public String analyzeDocument(Map<String, Object> arguments) {
        String text = arguments != null && arguments.containsKey("document_text") ? arguments.get("document_text").toString() : "";
        if (text.isBlank()) return "Vui lòng cung cấp nội dung tài liệu để phân tích.";

        String[] lines = text.split("\n");
        List<String> keyItems = new ArrayList<>();
        for (String line : lines) {
            String l = line.toLowerCase();
            if (l.contains("deadline") || l.contains("hạn nộp") || l.contains("kiểm tra") || l.contains("thi")
                    || l.contains("assignment") || l.contains("project") || l.contains("bài tập") || l.contains("chương")) {
                keyItems.add(line.trim());
            }
        }
        if (keyItems.isEmpty()) {
            return "Đã đọc tài liệu (" + lines.length + " dòng). Không phát hiện mốc thời gian hay deadline rõ ràng nào.";
        }
        return "📄 Đã phân tích tài liệu, phát hiện các mốc quan trọng sau:\n" + String.join("\n", keyItems);
    }
}
