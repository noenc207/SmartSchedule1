package com.smartschedule.ai.application;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
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

    public AiContextService(ScheduleRepository scheduleRepository,
                            EventRepository eventRepository,
                            TaskRepository taskRepository) {
        this.scheduleRepository = scheduleRepository;
        this.eventRepository = eventRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public String buildContextSummary(User user) {
        return buildContextSummary(user, null);
    }

    @Transactional(readOnly = true)
    public String buildContextSummary(User user, AiDtos.ClientContextDto clientContext) {
        ZoneId zoneId = resolveZone(user.getTimezone(), clientContext);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy", Locale.forLanguageTag("vi-VN"));

        StringBuilder sb = new StringBuilder();
        sb.append("=== THÔNG TIN NGƯỜI DÙNG & NGỮ CẢNH THỜI GIAN HIỆN TẠI ===\n");
        sb.append("- Người dùng: ").append(user.getDisplayName()).append(" (Email: ").append(user.getEmail()).append(")\n");
        sb.append("- Thời gian hiện tại: ").append(now.format(timeFmt)).append("\n");
        sb.append("- Ngày hiện tại: ").append(now.format(dateFmt)).append("\n");
        sb.append("- Múi giờ: ").append(zoneId.getId()).append("\n");

        if (clientContext != null) {
            sb.append("\n=== NGỮ CẢNH GIAO DIỆN HIỆN TẠI (CLIENT CONTEXT) ===\n");
            if (clientContext.page() != null && !clientContext.page().isBlank()) {
                sb.append("- Màn hình đang mở: ").append(clientContext.page()).append("\n");
            }
            if (clientContext.selectedDate() != null && !clientContext.selectedDate().isBlank()) {
                sb.append("- Ngày đang được xem/chọn trên lịch: ").append(clientContext.selectedDate()).append("\n");
            }
            if (clientContext.selectedEventTitle() != null && !clientContext.selectedEventTitle().isBlank()) {
                sb.append("- Sự kiện đang được chọn/mở: ").append(clientContext.selectedEventTitle());
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

        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String executeTool(String toolName, User user, Map<String, Object> arguments) {
        return switch (toolName) {
            case "get_today_schedule" -> getTodaySchedule(user);
            case "get_upcoming_schedule" -> getUpcomingSchedule(user, arguments);
            case "find_free_time" -> findFreeTime(user, arguments);
            case "check_schedule_conflict" -> checkScheduleConflict(user, arguments);
            case "get_schedule_details" -> getScheduleDetails(user, arguments);
            default -> "Công cụ không được hỗ trợ: " + toolName;
        };
    }

    public String getTodaySchedule(User user) {
        ZoneId zoneId = resolveZone(user.getTimezone(), null);
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
        return getUpcomingSchedule(user, Collections.emptyMap());
    }

    public String getUpcomingSchedule(User user, Map<String, Object> arguments) {
        ZoneId zoneId = resolveZone(user.getTimezone(), null);
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
        return findFreeTime(user, Collections.emptyMap());
    }

    public String findFreeTime(User user, Map<String, Object> arguments) {
        ZoneId zoneId = resolveZone(user.getTimezone(), null);
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
        ZoneId zoneId = resolveZone(user.getTimezone(), null);
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
        if (arguments == null || !arguments.containsKey("event_id_or_title")) {
            return "Vui lòng cung cấp event_id_or_title để tra cứu chi tiết.";
        }
        String query = arguments.get("event_id_or_title").toString().trim();
        ZoneId zoneId = resolveZone(user.getTimezone(), null);

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
        if (timezone != null && !timezone.isBlank()) {
            try {
                return ZoneId.of(timezone.trim());
            } catch (Exception ignored) {}
        }
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }
}
