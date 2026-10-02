package com.smartschedule.ai.application;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface AiProvider {
    record ChatMessage(String role, String content) {}

    record ToolCall(String name, Map<String, Object> arguments) {}

    record ProviderResponse(String content, List<ToolCall> toolCalls, Integer tokensUsed) {}

    ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage);

    void streamResponse(String systemInstruction, List<ChatMessage> history, String userMessage,
                        Consumer<String> onChunk, Runnable onComplete, Consumer<Throwable> onError);
}
