package com.smartschedule.ai.application;

import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.user.domain.User;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface AiProvider {
    record ChatMessage(String role, String content) {}

    record ToolCall(String name, Map<String, Object> arguments) {}

    record ProviderResponse(String content, List<ToolCall> toolCalls, Integer tokensUsed) {}

    enum HealthStatus {
        AVAILABLE,
        DEGRADED,
        UNAVAILABLE
    }

    record ProviderHealth(HealthStatus status, String message, long latencyMs) {}

    default String getName() {
        return "unknown";
    }

    default String getModel() {
        return "default";
    }

    default boolean hasApiKey() {
        return true;
    }

    default boolean supportsTools() {
        return true;
    }

    default boolean supportsStructuredOutput() {
        return true;
    }

    default ProviderHealth healthCheck() {
        return new ProviderHealth(HealthStatus.AVAILABLE, "OK", 0);
    }

    ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage);

    void streamResponse(String systemInstruction, List<ChatMessage> history, String userMessage,
                        Consumer<String> onChunk,
                        Consumer<List<ToolCall>> onCompleteWithTools,
                        Consumer<Throwable> onError);
}
