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
}
