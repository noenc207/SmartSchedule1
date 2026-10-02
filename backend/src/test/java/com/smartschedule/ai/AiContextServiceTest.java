package com.smartschedule.ai;

import com.smartschedule.ai.application.AiContextService;
import com.smartschedule.category.domain.Category;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiContextServiceTest {
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private EventRepository eventRepository;
    @Mock private TaskRepository taskRepository;

    private AiContextService contextService;
    private User testUser;
    private Schedule testSchedule;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        contextService = new AiContextService(scheduleRepository, eventRepository, taskRepository);
        testUser = new User("ai.student@fpt.edu.vn", "hashed", "Sinh Viên FPT");
        testUser.updateProfile("Sinh Viên FPT", "Asia/Ho_Chi_Minh", "vi", null);
        testSchedule = new Schedule(testUser, "Lịch Học K18", "Mô tả lịch học", "Asia/Ho_Chi_Minh", "PERSONAL");
        testCategory = new Category(testUser, "Academic", "#3b82f6", "Academic courses");
    }

    @Test
    void testBuildContextSummary_containsUserInfoAndTimetable() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);
        Instant eventStart = today.atTime(8, 0).atZone(zone).toInstant();
        Instant eventEnd = today.atTime(10, 0).atZone(zone).toInstant();

        Event testEvent = new Event(
                testSchedule, testCategory, "Lập Trình Web (PRN211)", "Học lý thuyết và lab",
                eventStart, eventEnd, "Phòng Alpha 301", "HIGH", "CONFIRMED", null, 15, "Mang laptop", true, false
        );

        when(eventRepository.search(eq(testSchedule.getId()), any(), any(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(testEvent));

        Task testTask = new Task(testSchedule, testUser, testCategory, "Bài tập lớn PRN211", "Hoàn thành backend",
                120, 120, "HIGH", eventEnd.plusSeconds(86400), "TODO", LocalTime.of(14, 0), LocalTime.of(16, 0), 30, 120);

        when(taskRepository.findAllByScheduleId(testSchedule.getId()))
                .thenReturn(List.of(testTask));

        String summary = contextService.buildContextSummary(testUser);

        assertThat(summary).contains("Sinh Viên FPT");
        assertThat(summary).contains("Lập Trình Web (PRN211)");
        assertThat(summary).contains("Phòng Alpha 301");
        assertThat(summary).contains("Bài tập lớn PRN211");
        assertThat(summary).contains("KHOẢNG TRỐNG THỜI GIAN HÔM NAY");
    }

    @Test
    void testExecuteTool_getTodaySchedule() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);
        Instant eventStart = today.atTime(13, 30).atZone(zone).toInstant();
        Instant eventEnd = today.atTime(15, 0).atZone(zone).toInstant();

        Event testEvent = new Event(
                testSchedule, testCategory, "Toán Rời Rạc (MAD101)", "Tiết 4-5",
                eventStart, eventEnd, "Phòng Beta 202", "NORMAL", "CONFIRMED", null, null, null, false, false
        );

        when(eventRepository.search(eq(testSchedule.getId()), any(), any(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(testEvent));

        String toolResult = contextService.executeTool("get_today_schedule", testUser, Map.of());

        assertThat(toolResult).contains("Toán Rời Rạc (MAD101)");
        assertThat(toolResult).contains("13:30 - 15:00");
        assertThat(toolResult).contains("Phòng Beta 202");
    }

    @Test
    void testExecuteTool_findFreeTime() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);
        Instant eventStart = today.atTime(8, 0).atZone(zone).toInstant();
        Instant eventEnd = today.atTime(10, 0).atZone(zone).toInstant();

        Event testEvent = new Event(
                testSchedule, testCategory, "Kỹ Năng Mềm", "Workshop",
                eventStart, eventEnd, "Hội trường A", "NORMAL", "CONFIRMED", null, null, null, false, false
        );

        when(eventRepository.search(eq(testSchedule.getId()), any(), any(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(testEvent));

        String freeTimeResult = contextService.executeTool("find_free_time", testUser, Map.of());

        assertThat(freeTimeResult).contains("Dựa trên lịch hiện tại");
    }
}
