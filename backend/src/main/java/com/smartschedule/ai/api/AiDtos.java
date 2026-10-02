package com.smartschedule.ai.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AiDtos {
    public record ClientContextDto(
            String page,
            String selectedDate,
            String selectedEventId,
            String selectedEventTitle,
            String timezone
    ) {}

    public record ChatRequest(
            String conversationId,
            @NotBlank(message = "Tin nhắn không được để trống.")
            @Size(max = 2000, message = "Tin nhắn không được vượt quá 2000 ký tự.")
            String message,
            Boolean stream,
            ClientContextDto context
    ) {
        public ChatRequest(String conversationId, String message, Boolean stream) {
            this(conversationId, message, stream, null);
        }
    }

    public record ProposedActionDto(
            UUID id,
            UUID conversationId,
            String tool,
            String status,
            String summary,
            Map<String, Object> parameters,
            boolean hasConflict,
            String conflictDetails,
            UUID targetEventId,
            Instant expiresAt,
            Instant createdAt,
            String resultDetails,
            String errorMessage
    ) {}

    public record ChatResponse(
            UUID conversationId,
            UUID messageId,
            String role,
            String content,
            Instant createdAt,
            List<ProposedActionDto> proposedActions
    ) {
        public ChatResponse(UUID conversationId, UUID messageId, String role, String content, Instant createdAt) {
            this(conversationId, messageId, role, content, createdAt, List.of());
        }
    }

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
            Instant createdAt,
            List<ProposedActionDto> proposedActions
    ) {
        public MessageResponse(UUID id, String role, String content, Instant createdAt) {
            this(id, role, content, createdAt, List.of());
        }
    }

    public record StreamChunk(
            String chunk,
            boolean done,
            UUID messageId,
            List<ProposedActionDto> proposedActions
    ) {
        public StreamChunk(String chunk, boolean done, UUID messageId) {
            this(chunk, done, messageId, List.of());
        }
    }

    public record ActionConfirmResponse(
            UUID actionId,
            String status,
            String message,
            UUID targetEventId,
            Map<String, Object> data
    ) {}
}
