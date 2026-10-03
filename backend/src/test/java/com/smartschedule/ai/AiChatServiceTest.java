package com.smartschedule.ai;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.application.*;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiAction;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.AiMessage;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.ai.infrastructure.AiMessageRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {
    @Mock private AiConversationRepository conversationRepository;
    @Mock private AiMessageRepository messageRepository;
    @Mock private AiContextService contextService;
    @Mock private AiActionService actionService;
    @Mock private AiProvider aiProvider;

    private AiChatService chatService;
    private User testUser;
    private AiProperties properties;

    @BeforeEach
    void setUp() {
        properties = new AiProperties("mock-gemini-key", "gemini-1.5-flash", 1500, 1024, 20, 30);
        chatService = new AiChatService(conversationRepository, messageRepository, contextService, actionService, aiProvider, properties);
        testUser = new User("student@fpt.edu.vn", "hashed", "Nguyen Van A");
    }

    @Test
    void testChat_successPersistsMessagesAndReturnsResponse() {
        AiConversation conversation = new AiConversation(testUser, "Cuộc trò chuyện mới");
        when(conversationRepository.findLatestByUserId(testUser.getId())).thenReturn(Optional.of(conversation));
        when(contextService.buildContextSummary(eq(testUser), any())).thenReturn("Mock Timetable Context");

        when(aiProvider.generateResponse(anyString(), anyList(), eq("Hôm nay tôi rảnh lúc nào?")))
                .thenReturn(new AiProvider.ProviderResponse("Hôm nay bạn rảnh từ 17:00 đến 19:00.", List.of(), 150));

        AiDtos.ChatRequest request = new AiDtos.ChatRequest(null, "Hôm nay tôi rảnh lúc nào?", false);
        AiDtos.ChatResponse response = chatService.chat(testUser, request);

        assertThat(response.content()).isEqualTo("Hôm nay bạn rảnh từ 17:00 đến 19:00.");
        assertThat(response.role()).isEqualTo("model");

        // Verify that both user message and model message were saved
        verify(messageRepository, times(2)).save(any(AiMessage.class));
        verify(conversationRepository).save(conversation);
    }

    @Test
    void testChat_handlesToolExecutionGracefully() {
        AiConversation conversation = new AiConversation(testUser, "Cuộc trò chuyện mới");
        when(conversationRepository.findLatestByUserId(testUser.getId())).thenReturn(Optional.of(conversation));
        when(contextService.buildContextSummary(eq(testUser), any())).thenReturn("Mock Context");

        AiProvider.ToolCall toolCall = new AiProvider.ToolCall("find_free_time", java.util.Map.of());
        when(aiProvider.generateResponse(anyString(), anyList(), eq("Tìm giờ rảnh")))
                .thenReturn(new AiProvider.ProviderResponse("", List.of(toolCall), 80));

        when(contextService.executeTool("find_free_time", testUser, java.util.Map.of()))
                .thenReturn("Dựa trên lịch hiện tại, bạn có các khoảng trống: 14:00 - 16:00.");

        AiDtos.ChatRequest request = new AiDtos.ChatRequest(null, "Tìm giờ rảnh", false);
        AiDtos.ChatResponse response = chatService.chat(testUser, request);

        assertThat(response.content()).contains("14:00 - 16:00");
    }

    @Test
    void testChat_rejectsEmptyOrExcessiveMessage() {
        assertThatThrownBy(() -> chatService.chat(testUser, new AiDtos.ChatRequest(null, "", false)))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("không được để trống");

        String giantMessage = "a".repeat(2000);
        assertThatThrownBy(() -> chatService.chat(testUser, new AiDtos.ChatRequest(null, giantMessage, false)))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("quá dài");
    }

    @Test
    void testChat_rateLimitingEnforced() {
        AiProperties strictProperties = new AiProperties("mock-key", "gemini-1.5-flash", 1500, 1024, 2, 30);
        AiChatService rateLimitedService = new AiChatService(conversationRepository, messageRepository, contextService, actionService, aiProvider, strictProperties);

        AiConversation conversation = new AiConversation(testUser, "Test");
        when(conversationRepository.findLatestByUserId(testUser.getId())).thenReturn(Optional.of(conversation));
        when(aiProvider.generateResponse(anyString(), anyList(), anyString()))
                .thenReturn(new AiProvider.ProviderResponse("OK", List.of(), 50));

        // 1st request -> ok
        rateLimitedService.chat(testUser, new AiDtos.ChatRequest(null, "Msg 1", false));
        // 2nd request -> ok
        rateLimitedService.chat(testUser, new AiDtos.ChatRequest(null, "Msg 2", false));

        // 3rd request -> should throw rate limit exception!
        assertThatThrownBy(() -> rateLimitedService.chat(testUser, new AiDtos.ChatRequest(null, "Msg 3", false)))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("quá nhiều yêu cầu trong 1 phút");
    }

    @Test
    void testChat_mutationIntentWithReadToolTriggersTurn2() {
        AiConversation conversation = new AiConversation(testUser, "Cuộc trò chuyện mới");
        when(conversationRepository.findLatestByUserId(testUser.getId())).thenReturn(Optional.of(conversation));
        when(contextService.buildContextSummary(eq(testUser), any())).thenReturn("Mock Context");

        String userPrompt = "xoá lịch lý đi thay giúp tôi thành toán";

        // Turn 1: Gemini returns read tool get_upcoming_schedule
        AiProvider.ToolCall readToolCall = new AiProvider.ToolCall("get_upcoming_schedule", java.util.Map.of());
        when(aiProvider.generateResponse(anyString(), anyList(), eq(userPrompt)))
                .thenReturn(new AiProvider.ProviderResponse("", List.of(readToolCall), 80));

        when(contextService.executeTool(eq("get_upcoming_schedule"), eq(testUser), any()))
                .thenReturn("Lịch trình 7 ngày tới:\n04/10 08:00: Tiết Vật lý");

        // Turn 2: Gemini receives read tool output and returns write tool replace_schedule
        AiProvider.ToolCall writeToolCall = new AiProvider.ToolCall("replace_schedule", java.util.Map.of(
                "target_title", "lý",
                "new_title", "toán"
        ));
        when(aiProvider.generateResponse(anyString(), anyList(), contains("thực hiện thao tác người dùng yêu cầu")))
                .thenReturn(new AiProvider.ProviderResponse("", List.of(writeToolCall), 120));

        AiDtos.ProposedActionDto proposed = new AiDtos.ProposedActionDto(
                UUID.randomUUID(), conversation.getId(), "replace_schedule",
                AiAction.STATUS_PROPOSED, "Thay lịch: Xóa 'Tiết Vật lý' và thay bằng 'toán'",
                java.util.Map.of("target_title", "Tiết Vật lý", "new_title", "toán"),
                false, null, null, java.time.Instant.now().plusSeconds(900), java.time.Instant.now(), null, null
        );
        when(actionService.proposeAction(eq(testUser), eq(conversation), eq("replace_schedule"), any(), any()))
                .thenReturn(proposed);

        AiDtos.ChatRequest request = new AiDtos.ChatRequest(null, userPrompt, false);
        AiDtos.ChatResponse response = chatService.chat(testUser, request);

        assertThat(response.proposedActions()).hasSize(1);
        assertThat(response.proposedActions().get(0).tool()).isEqualTo("replace_schedule");
        assertThat(response.content()).contains("Thay lịch: Xóa 'Tiết Vật lý' và thay bằng 'toán'");
        assertThat(response.content()).doesNotContain("Lịch trình 7 ngày tới:");
    }

    @Test
    void testHasMutationIntent_distinguishesReadQueriesFromMutations() {
        // Read queries should NOT be mutation intents
        assertThat(chatService.hasMutationIntent("check xem ngày hôm nay tôi có tiết học nào ko")).isFalse();
        assertThat(chatService.hasMutationIntent("hôm nay tôi có tiết gì không?")).isFalse();
        assertThat(chatService.hasMutationIntent("xem lịch học hôm nay")).isFalse();
        assertThat(chatService.hasMutationIntent("kiểm tra deadline tuần này")).isFalse();
        assertThat(chatService.hasMutationIntent("What classes do I have today?")).isFalse();
        assertThat(chatService.hasMutationIntent("Find free time slots")).isFalse();

        // Write mutations should BE mutation intents
        assertThat(chatService.hasMutationIntent("xoá lịch lý đi thay giúp tôi thành toán")).isTrue();
        assertThat(chatService.hasMutationIntent("tạo lịch học giải tích lúc 8h sáng mai")).isTrue();
        assertThat(chatService.hasMutationIntent("sửa giờ học môn toán")).isTrue();
        assertThat(chatService.hasMutationIntent("hoàn thành bài tập lab 2")).isTrue();
        assertThat(chatService.hasMutationIntent("tối ưu ngày hôm nay")).isTrue();
        assertThat(chatService.hasMutationIntent("lập kế hoạch ôn thi môn AI")).isTrue();
    }
}
