package com.smartschedule.ai.application;

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
        ZoneId zoneId = resolveZone(user.getTimezone());
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy", Locale.forLanguageTag("vi-VN"));

        StringBuilder sb = new StringBuilder();
        sb.append("=== THÔNG TIN NGƯỜI DÙNG & NGỮ CẢNH THỜI GIAN HIỆN TẠI ===\n");
        sb.append("- Người dùng: ").append(user.getDisplayName()).append(" (Email: ").append(user.getEmail()).append(")\n");
        sb.append("- Thời gian hiện tại: ").append(now.format(timeFmt)).append("\n");
        sb.append("- Ngày hiện tại: ").append(now.format(dateFmt)).append("\n");
        sb.append("- Múi giờ: ").append(zoneId.getId()).append("\n\n");

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
                if (count++ >= 8) break; // Limit to 8 items to prevent prompt bloat
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
            case "get_upcoming_schedule" -> getUpcomingSchedule(user);
            case "find_free_time" -> findFreeTime(user);
            default -> "Công cụ không được hỗ trợ: " + toolName;
        };
    }

    public String getTodaySchedule(User user) {
        ZoneId zoneId = resolveZone(user.getTimezone());
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
        ZoneId zoneId = resolveZone(user.getTimezone());
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime endOfPeriod = now.plusDays(7);

        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        List<Event> upcomingEvents = new ArrayList<>();
        for (Schedule s : schedules) {
            List<Event> events = eventRepository.search(s.getId(), now.toInstant(), endOfPeriod.toInstant(), null, null, null);
            upcomingEvents.addAll(events);
        }
        upcomingEvents.sort(Comparator.comparing(Event::getStartsAt));

        if (upcomingEvents.isEmpty()) {
            return "Bạn không có sự kiện nào sắp diễn ra trong 7 ngày tới.";
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm", Locale.forLanguageTag("vi-VN"));
        StringBuilder sb = new StringBuilder("Lịch trình 7 ngày tới:\n");
        for (Event e : upcomingEvents) {
            ZonedDateTime start = e.getStartsAt().atZone(zoneId);
            sb.append("- ").append(start.format(fmt)).append(": ").append(e.getTitle()).append("\n");
        }
        return sb.toString();
    }

    public String findFreeTime(User user) {
        ZoneId zoneId = resolveZone(user.getTimezone());
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

        List<String> freeSlots = computeFreeSlots(todayEvents, now, zoneId);
        if (freeSlots.isEmpty()) {
            return "Dựa trên lịch hiện tại, bạn không còn khoảng trống đáng kể nào trong hôm nay.";
        }
        return "Dựa trên lịch hiện tại, bạn có các khoảng trống:\n" + String.join("\n", freeSlots);
    }

    private List<String> computeFreeSlots(List<Event> events, ZonedDateTime now, ZoneId zoneId) {
        List<String> result = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        // Consider active daytime hours from 08:00 to 22:00
        LocalDate today = now.toLocalDate();
        ZonedDateTime dayStart = today.atTime(8, 0).atZone(zoneId);
        ZonedDateTime dayEnd = today.atTime(22, 0).atZone(zoneId);

        // Start search from current time or dayStart, whichever is later
        ZonedDateTime searchPointer = now.isAfter(dayStart) ? now : dayStart;
        if (searchPointer.isAfter(dayEnd)) {
            return result;
        }

        for (Event event : events) {
            ZonedDateTime eventStart = event.getStartsAt().atZone(zoneId);
            ZonedDateTime eventEnd = event.getEndsAt().atZone(zoneId);

            if (eventEnd.isBefore(searchPointer)) {
                continue;
            }

            if (eventStart.isAfter(searchPointer)) {
                Duration gap = Duration.between(searchPointer, eventStart);
                if (gap.toMinutes() >= 30) {
                    result.add(formatSlot(searchPointer, eventStart, gap, timeFmt));
                }
            }

            if (eventEnd.isAfter(searchPointer)) {
                searchPointer = eventEnd;
            }
        }

        if (searchPointer.isBefore(dayEnd)) {
            Duration gap = Duration.between(searchPointer, dayEnd);
            if (gap.toMinutes() >= 30) {
                result.add(formatSlot(searchPointer, dayEnd, gap, timeFmt));
            }
        }

        return result;
    }

    private String formatSlot(ZonedDateTime start, ZonedDateTime end, Duration duration, DateTimeFormatter timeFmt) {
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        String durationStr = hours > 0
                ? (minutes > 0 ? hours + "h" + minutes + "p" : hours + " giờ")
                : minutes + " phút";
        return start.format(timeFmt) + " – " + end.format(timeFmt) + " (" + durationStr + " rảnh)";
    }

    private ZoneId resolveZone(String timezoneStr) {
        if (timezoneStr != null && !timezoneStr.isBlank()) {
            try {
                return ZoneId.of(timezoneStr.trim());
            } catch (Exception ignored) {}
        }
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }
}
