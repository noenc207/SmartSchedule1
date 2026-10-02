package com.smartschedule.ai;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.application.*;
import com.smartschedule.ai.config.AiProperties;
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
    @Mock private AiProvider aiProvider;

    private AiChatService chatService;
    private User testUser;
    private AiProperties properties;

    @BeforeEach
    void setUp() {
        properties = new AiProperties("mock-gemini-key", "gemini-1.5-flash", 1500, 1024, 20, 30);
        chatService = new AiChatService(conversationRepository, messageRepository, contextService, aiProvider, properties);
        testUser = new User("student@fpt.edu.vn", "hashed", "Nguyen Van A");
    }

    @Test
    void testChat_successPersistsMessagesAndReturnsResponse() {
        AiConversation conversation = new AiConversation(testUser, "Cuộc trò chuyện mới");
        when(conversationRepository.findLatestByUserId(testUser.getId())).thenReturn(Optional.of(conversation));
        when(contextService.buildContextSummary(testUser)).thenReturn("Mock Timetable Context");

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
        when(contextService.buildContextSummary(testUser)).thenReturn("Mock Context");

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
        AiChatService rateLimitedService = new AiChatService(conversationRepository, messageRepository, contextService, aiProvider, strictProperties);

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
}
