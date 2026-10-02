package com.smartschedule.ai.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class AiDtos {
    public record ChatRequest(
            String conversationId,
            @NotBlank(message = "Tin nhắn không được để trống.")
            @Size(max = 2000, message = "Tin nhắn không được vượt quá 2000 ký tự.")
            String message,
            Boolean stream
    ) {}

    public record ChatResponse(
            UUID conversationId,
            UUID messageId,
            String role,
            String content,
            Instant createdAt
    ) {}

    public record ConversationResponse(
            UUID id,
            String title,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record MessageResponse(
            UUID id,
            String role,
            String content,
            Instant createdAt
    ) {}

    public record StreamChunk(
            String chunk,
            boolean done,
            UUID messageId
    ) {}
}
