package com.smartschedule.ai;

import com.smartschedule.ai.application.*;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiProviderRouterTest {

    @Mock
    private AiProvider wayjetProvider;

    @Mock
    private AiProvider geminiProvider;

    @Mock
    private AiProvider groqProvider;

    @Mock
    private AiConversationRepository conversationRepository;

    @Mock
    private AiUsageService usageService;

    private AiProperties properties;
    private AiCircuitBreaker circuitBreaker;
    private AiProviderRouter router;
    private User testUser;
    private AiConversation conversation;

    @BeforeEach
    void setUp() {
        properties = new AiProperties(
                "mock-gemini-key", "gemini-3.6-flash", 2000, 1024, 5, 30, "http://localhost:8090",
                "mock-wayjet-key", "https://api.xah.io/v1", "mainnewnol/gpt-5.6-luna",
                "wayjet", "gemini,groq",
                20, 60, 5, 1,
                "mock-groq-key", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile",
                null, null, null
        );

        when(wayjetProvider.getName()).thenReturn("wayjet");
        lenient().when(wayjetProvider.getModel()).thenReturn("mainnewnol/gpt-5.6-luna");
        when(wayjetProvider.hasApiKey()).thenReturn(true);

        when(geminiProvider.getName()).thenReturn("gemini");
        lenient().when(geminiProvider.getModel()).thenReturn("gemini-3.6-flash");
        lenient().when(geminiProvider.hasApiKey()).thenReturn(true);

        when(groqProvider.getName()).thenReturn("groq");
        lenient().when(groqProvider.getModel()).thenReturn("llama-3.3-70b-versatile");
        lenient().when(groqProvider.hasApiKey()).thenReturn(true);

        circuitBreaker = new AiCircuitBreaker(5, Duration.ofSeconds(60));

        router = new AiProviderRouter(
                List.of(wayjetProvider, geminiProvider, groqProvider),
                properties,
                circuitBreaker,
                conversationRepository,
                usageService
        );

        testUser = new User("test@domain.com", "pass", "Test User");
        conversation = new AiConversation(testUser, "Test Conversation");
    }

    @Test
    void testWayjetPrimary_successRoutesToWayjetAndPinsConversation() {
        when(wayjetProvider.generateResponse(any(), any(), eq("Xin chào")))
                .thenReturn(new AiProvider.ProviderResponse("Chào bạn!", List.of(), 50));

        AiProvider.ProviderResponse resp = router.generateResponse(conversation, testUser, "sys", List.of(), "Xin chào");

        assertThat(resp.content()).isEqualTo("Chào bạn!");
        assertThat(conversation.getPinnedProvider()).isEqualTo("wayjet");
        verify(wayjetProvider, times(1)).generateResponse(any(), any(), eq("Xin chào"));
        verify(geminiProvider, never()).generateResponse(any(), any(), any());
        verify(conversationRepository, times(1)).save(conversation);
    }

    @Test
    void testWayjetFails_failoverToGeminiAndPinsToGemini() {
        when(wayjetProvider.generateResponse(any(), any(), any()))
                .thenThrow(new AiException("HTTP_429", "WayJet rate limited"));

        when(geminiProvider.generateResponse(any(), any(), any()))
                .thenReturn(new AiProvider.ProviderResponse("Phản hồi từ fallback", List.of(), 60));

        AiProvider.ProviderResponse resp = router.generateResponse(conversation, testUser, "sys", List.of(), "Test fallback");

        assertThat(resp.content()).isEqualTo("Phản hồi từ fallback");
        assertThat(conversation.getPinnedProvider()).isEqualTo("gemini");
        verify(wayjetProvider, times(1)).generateResponse(any(), any(), any());
        verify(geminiProvider, times(1)).generateResponse(any(), any(), any());
        verify(groqProvider, never()).generateResponse(any(), any(), any());
    }

    @Test
    void testConversationPinning_respectsExistingPinWhenHealthy() {
        conversation.setPinnedProvider("gemini");

        when(geminiProvider.generateResponse(any(), any(), any()))
                .thenReturn(new AiProvider.ProviderResponse("Phản hồi pinned Gemini", List.of(), 40));

        AiProvider.ProviderResponse resp = router.generateResponse(conversation, testUser, "sys", List.of(), "Test pin");

        assertThat(resp.content()).isEqualTo("Phản hồi pinned Gemini");
        verify(geminiProvider, times(1)).generateResponse(any(), any(), any());
        verify(wayjetProvider, never()).generateResponse(any(), any(), any());
    }

    @Test
    void testCircuitBreakerTrips_skipsFailingProvider() {
        for (int i = 0; i < 5; i++) {
            circuitBreaker.recordFailure("wayjet", new RuntimeException("connection timeout"));
        }
        assertThat(circuitBreaker.getState("wayjet")).isEqualTo(AiCircuitBreaker.State.OPEN);

        when(geminiProvider.generateResponse(any(), any(), any()))
                .thenReturn(new AiProvider.ProviderResponse("Bypass wayjet directly to gemini", List.of(), 30));

        AiProvider.ProviderResponse resp = router.generateResponse(conversation, testUser, "sys", List.of(), "Test CB");

        assertThat(resp.content()).isEqualTo("Bypass wayjet directly to gemini");
        verify(wayjetProvider, never()).generateResponse(any(), any(), any());
        verify(geminiProvider, times(1)).generateResponse(any(), any(), any());
    }

    @Test
    void testAllProvidersFail_throwsGenericFriendlyErrorWithZeroSecretLeak() {
        when(wayjetProvider.generateResponse(any(), any(), any()))
                .thenThrow(new AiException("HTTP_500", "wayjet 500 error"));
        when(geminiProvider.generateResponse(any(), any(), any()))
                .thenThrow(new AiException("HTTP_503", "gemini 503 error"));
        when(groqProvider.generateResponse(any(), any(), any()))
                .thenThrow(new AiException("HTTP_429", "groq 429 error"));

        assertThatThrownBy(() -> router.generateResponse(conversation, testUser, "sys", List.of(), "Test"))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("Hệ thống SmartSchedule AI hiện đang bận")
                .matches(e -> !e.getMessage().contains("wayjet") && !e.getMessage().contains("gemini") && !e.getMessage().contains("groq"));
    }
}
