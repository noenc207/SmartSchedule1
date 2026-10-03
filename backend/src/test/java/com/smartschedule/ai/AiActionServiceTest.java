package com.smartschedule.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.application.AiActionService;
import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.domain.AiAction;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.infrastructure.AiActionRepository;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiActionServiceTest {
    @Mock private AiActionRepository actionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private ScheduleRepository scheduleRepository;

    private AiActionService actionService;
    private ObjectMapper objectMapper;
    private User testUser;
    private User attackerUser;
    private Schedule testSchedule;
    private AiConversation conversation;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        actionService = new AiActionService(actionRepository, eventRepository, scheduleRepository, objectMapper);

        testUser = new User("student@fpt.edu.vn", "hashed", "Nguyen Van A");
        attackerUser = new User("attacker@fpt.edu.vn", "hashed", "Bad Actor");
        testSchedule = new Schedule(testUser, "Lịch học", "Lịch học FPT", "Asia/Ho_Chi_Minh", "PRIVATE");
        conversation = new AiConversation(testUser, "Cuộc trò chuyện mới");
    }

    @Test
    void testProposeCreateSchedule_noConflict() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));
        when(eventRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> args = Map.of(
                "title", "Physics",
                "start_time", "2026-10-03T08:00:00",
                "end_time", "2026-10-03T10:00:00",
                "location", "Room 204"
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-03", null, null, "Asia/Ho_Chi_Minh");

        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                testUser, conversation, "create_schedule", args, context
        );

        assertThat(proposed).isNotNull();
        assertThat(proposed.tool()).isEqualTo("create_schedule");
        assertThat(proposed.status()).isEqualTo(AiAction.STATUS_PROPOSED);
        assertThat(proposed.hasConflict()).isFalse();
        assertThat(proposed.summary()).contains("Physics");

        verify(actionRepository, times(1)).save(any(AiAction.class));
    }

    @Test
    void testProposeCreateSchedule_withConflict() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        Instant conflictStart = Instant.parse("2026-10-03T01:30:00Z"); // 08:30 in GMT+7
        Instant conflictEnd = Instant.parse("2026-10-03T02:30:00Z");   // 09:30 in GMT+7
        Event existingEvent = new Event(testSchedule, null, "Existing Math Class", "", conflictStart, conflictEnd,
                "Room 101", "HIGH", "CONFIRMED", null, 15, "", false, false);

        when(eventRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(existingEvent));

        Map<String, Object> args = Map.of(
                "title", "Physics",
                "start_time", "2026-10-03T08:00:00",
                "end_time", "2026-10-03T10:00:00"
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-03", null, null, "Asia/Ho_Chi_Minh");

        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                testUser, conversation, "create_schedule", args, context
        );

        assertThat(proposed.hasConflict()).isTrue();
        assertThat(proposed.conflictDetails()).contains("Existing Math Class");
    }

    @Test
    void testConfirmAction_successExecutesMutation() {
        UUID actionId = UUID.randomUUID();
        String paramsJson = "{\"title\":\"Physics\",\"start_time\":\"2026-10-03T08:00:00\",\"end_time\":\"2026-10-03T10:00:00\",\"location\":\"Room 204\"}";

        AiAction action = new AiAction(testUser, conversation, "create_schedule", "Tạo lịch: Physics",
                paramsJson, false, null, null, Instant.now().plusSeconds(900));

        when(actionRepository.findByIdAndUserId(actionId, testUser.getId()))
                .thenReturn(Optional.of(action));
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        AiDtos.ActionConfirmResponse confirmResp = actionService.confirmAction(testUser, actionId);

        assertThat(confirmResp.status()).isEqualTo(AiAction.STATUS_SUCCESS);
        assertThat(confirmResp.message()).contains("Physics");
        assertThat(action.getStatus()).isEqualTo(AiAction.STATUS_SUCCESS);
        assertThat(action.getExecutedAt()).isNotNull();

        verify(eventRepository, times(1)).save(any(Event.class));
        verify(actionRepository, atLeastOnce()).save(action);
    }

    @Test
    void testConfirmAction_preventsDoubleExecution() {
        UUID actionId = UUID.randomUUID();
        AiAction action = new AiAction(testUser, conversation, "create_schedule", "Summary",
                "{}", false, null, null, Instant.now().plusSeconds(900));
        action.markSuccess("Done");

        when(actionRepository.findByIdAndUserId(actionId, testUser.getId()))
                .thenReturn(Optional.of(action));

        assertThatThrownBy(() -> actionService.confirmAction(testUser, actionId))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("Yêu cầu này đã được xử lý");

        verify(eventRepository, never()).save(any());
    }

    @Test
    void testConfirmAction_preventsExpiredAction() {
        UUID actionId = UUID.randomUUID();
        // Expired in past
        AiAction action = new AiAction(testUser, conversation, "create_schedule", "Summary",
                "{}", false, null, null, Instant.now().minusSeconds(10));

        when(actionRepository.findByIdAndUserId(actionId, testUser.getId()))
                .thenReturn(Optional.of(action));

        assertThatThrownBy(() -> actionService.confirmAction(testUser, actionId))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("Yêu cầu này đã hết hạn");

        verify(eventRepository, never()).save(any());
    }

    @Test
    void testConfirmAction_unauthorizedUserCannotConfirm() {
        UUID actionId = UUID.randomUUID();

        // Attacker tries to confirm action belonging to testUser
        when(actionRepository.findByIdAndUserId(actionId, attackerUser.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> actionService.confirmAction(attackerUser, actionId))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu xác nhận hoặc bạn không có quyền");

        verify(eventRepository, never()).save(any());
    }

    @Test
    void testCancelAction_marksStatusCancelled() {
        UUID actionId = UUID.randomUUID();
        AiAction action = new AiAction(testUser, conversation, "create_schedule", "Summary",
                "{}", false, null, null, Instant.now().plusSeconds(900));

        when(actionRepository.findByIdAndUserId(actionId, testUser.getId()))
                .thenReturn(Optional.of(action));

        AiDtos.ActionConfirmResponse resp = actionService.cancelAction(testUser, actionId);

        assertThat(resp.status()).isEqualTo(AiAction.STATUS_CANCELLED);
        assertThat(action.getStatus()).isEqualTo(AiAction.STATUS_CANCELLED);
        verify(actionRepository, times(1)).save(action);
    }

    @Test
    void testProposeCreateSchedule_strictValidation_missingStartTime_throwsException() {
        Map<String, Object> args = Map.of(
                "title", "Tiết Vật lý",
                "date", "2026-10-04",
                "duration_minutes", 90
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-04", null, null, "Asia/Ho_Chi_Minh");

        assertThatThrownBy(() -> actionService.proposeAction(testUser, conversation, "create_schedule", args, context))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("giờ bắt đầu");
    }

    @Test
    void testProposeCreateSchedule_strictValidation_missingDurationAndEndTime_throwsException() {
        Map<String, Object> args = Map.of(
                "title", "Tiết Vật lý",
                "date", "2026-10-04",
                "start_time", "08:00"
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-04", null, null, "Asia/Ho_Chi_Minh");

        assertThatThrownBy(() -> actionService.proposeAction(testUser, conversation, "create_schedule", args, context))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("thời lượng hoặc giờ kết thúc");
    }

    @Test
    void testProposeAndConfirm_canonicalTimezonePreserved_neverShiftsTo15pm() {
        // REGRESSION TEST SPECIFIC TO CURRENT BUG:
        // Input: "Tạo lịch Tiết Vật lý Chủ nhật lúc 8h, 90 phút."
        // Expected:
        // Proposal: 04/10, 08:00–09:30
        // Database: startsAt = 2026-10-04T01:00:00Z (08:00 in Asia/Ho_Chi_Minh)
        // Calendar view: 08:00–09:30
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));
        when(eventRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> args = Map.of(
                "title", "Tiết Vật lý",
                "date", "2026-10-04",
                "start_time", "08:00",
                "duration_minutes", 90
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-04", null, null, "Asia/Ho_Chi_Minh");

        // 1. Proposal Phase
        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                testUser, conversation, "create_schedule", args, context
        );

        assertThat(proposed.summary()).contains("08:00–09:30");
        assertThat(proposed.parameters().get("start_time")).isEqualTo("08:00");
        assertThat(proposed.parameters().get("end_time")).isEqualTo("09:30");
        assertThat(proposed.parameters().get("starts_at")).isEqualTo("2026-10-04T01:00:00Z");
        assertThat(proposed.parameters().get("ends_at")).isEqualTo("2026-10-04T02:30:00Z");

        // 2. Confirmation Phase
        UUID actionId = proposed.id();
        AiAction savedAction = new AiAction(testUser, conversation, "create_schedule", proposed.summary(),
                new ObjectMapper().valueToTree(proposed.parameters()).toString(), false, null, null, Instant.now().plusSeconds(900));

        when(actionRepository.findByIdAndUserId(actionId, testUser.getId()))
                .thenReturn(Optional.of(savedAction));

        org.mockito.ArgumentCaptor<Event> eventCaptor = org.mockito.ArgumentCaptor.forClass(Event.class);

        AiDtos.ActionConfirmResponse confirmResp = actionService.confirmAction(testUser, actionId);

        assertThat(confirmResp.status()).isEqualTo(AiAction.STATUS_SUCCESS);
        assertThat(confirmResp.message()).contains("08:00–09:30");

        verify(eventRepository).save(eventCaptor.capture());
        Event savedEvent = eventCaptor.getValue();

        // Database receives exact UTC Instant: 01:00:00Z
        assertThat(savedEvent.getStartsAt()).isEqualTo(Instant.parse("2026-10-04T01:00:00Z"));
        assertThat(savedEvent.getEndsAt()).isEqualTo(Instant.parse("2026-10-04T02:30:00Z"));

        // Rendered in user timezone Asia/Ho_Chi_Minh: MUST BE 08:00, NOT 15:00!
        java.time.ZonedDateTime localStart = savedEvent.getStartsAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        java.time.ZonedDateTime localEnd = savedEvent.getEndsAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

        assertThat(localStart.getHour()).isEqualTo(8);
        assertThat(localStart.getMinute()).isEqualTo(0);
        assertThat(localEnd.getHour()).isEqualTo(9);
        assertThat(localEnd.getMinute()).isEqualTo(30);
    }

    @Test
    void testSubjectAliasMatching() {
        assertThat(AiActionService.isSubjectMatch("Tiết Vật lý", "lý")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Physics 101", "lý")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Tiết Lý", "vật lý")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Đại số tuyến tính", "toán")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Calculus II", "toan")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Hóa đại cương", "hoa")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Nhập môn Lập trình Java", "coding")).isTrue();
        assertThat(AiActionService.isSubjectMatch("Văn học hiện đại", "toán")).isFalse();
    }

    @Test
    void testProposeReplaceSchedule_subjectAliasAndInheritance() {
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(testSchedule));

        Instant physicsStart = Instant.parse("2026-10-04T01:00:00Z"); // 08:00 Asia/Ho_Chi_Minh
        Instant physicsEnd = Instant.parse("2026-10-04T02:30:00Z");   // 09:30 Asia/Ho_Chi_Minh
        Event physicsEvent = new Event(testSchedule, null, "Tiết Vật lý", "Lý thuyết cơ học", physicsStart, physicsEnd,
                "Phòng Alpha 201", "HIGH", "CONFIRMED", null, 15, "", false, false);

        when(eventRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(physicsEvent));

        // User says: "xoá lịch lý đi thay giúp tôi thành toán"
        Map<String, Object> args = Map.of(
                "target_title", "lý",
                "new_title", "Toán"
        );

        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto("calendar", "2026-10-04", null, null, "Asia/Ho_Chi_Minh");

        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                testUser, conversation, "replace_schedule", args, context
        );

        assertThat(proposed).isNotNull();
        assertThat(proposed.tool()).isEqualTo("replace_schedule");
        assertThat(proposed.summary()).contains("Tiết Vật lý");
        assertThat(proposed.summary()).contains("Toán");
        assertThat(proposed.summary()).contains("08:00–09:30");
        assertThat(proposed.parameters().get("target_title")).isEqualTo("Tiết Vật lý");
        assertThat(proposed.parameters().get("new_title")).isEqualTo("Toán");
        assertThat(proposed.parameters().get("start_time")).isEqualTo("08:00");
        assertThat(proposed.parameters().get("end_time")).isEqualTo("09:30");
        assertThat(proposed.parameters().get("location")).isEqualTo("Phòng Alpha 201");
        assertThat(proposed.hasConflict()).isFalse();
    }

    @Test
    void testConfirmReplaceSchedule_atomicExecution() {
        Instant physicsStart = Instant.parse("2026-10-04T01:00:00Z");
        Instant physicsEnd = Instant.parse("2026-10-04T02:30:00Z");
        Event physicsEvent = new Event(testSchedule, null, "Tiết Vật lý", "Lý thuyết cơ học", physicsStart, physicsEnd,
                "Phòng Alpha 201", "HIGH", "CONFIRMED", null, 15, "", false, false);

        UUID targetId = physicsEvent.getId();
        when(eventRepository.findById(targetId)).thenReturn(Optional.of(physicsEvent));

        Map<String, Object> params = Map.of(
                "target_event_id", targetId.toString(),
                "target_title", "Tiết Vật lý",
                "new_title", "Toán",
                "date", "2026-10-04",
                "start_time", "08:00",
                "end_time", "09:30",
                "starts_at", "2026-10-04T01:00:00Z",
                "ends_at", "2026-10-04T02:30:00Z",
                "timezone", "Asia/Ho_Chi_Minh"
        );

        AiAction action = new AiAction(testUser, conversation, "replace_schedule",
                "Thay lịch: Xóa 'Tiết Vật lý' và thay bằng 'Toán'",
                new ObjectMapper().valueToTree(params).toString(), false, null, targetId, Instant.now().plusSeconds(900));

        when(actionRepository.findByIdAndUserId(action.getId(), testUser.getId()))
                .thenReturn(Optional.of(action));

        AiDtos.ActionConfirmResponse confirmResp = actionService.confirmAction(testUser, action.getId());

        assertThat(confirmResp.status()).isEqualTo(AiAction.STATUS_SUCCESS);
        assertThat(confirmResp.message()).contains("Tiết Vật lý");
        assertThat(confirmResp.message()).contains("Toán");
        assertThat(confirmResp.data().get("operation")).isEqualTo("REPLACE_SCHEDULE");
        assertThat(confirmResp.data().get("newTitle")).isEqualTo("Toán");

        verify(eventRepository).save(physicsEvent);
        assertThat(physicsEvent.getTitle()).isEqualTo("Toán");
        assertThat(physicsEvent.getStartsAt()).isEqualTo(physicsStart);
        assertThat(physicsEvent.getEndsAt()).isEqualTo(physicsEnd);
    }
}
