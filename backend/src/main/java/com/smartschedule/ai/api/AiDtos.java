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
            String timezone,
            String selectedTaskId,
            String lastTargetId,
            String activeContextMode,
            String preferredLanguage
    ) {
        public ClientContextDto(String page, String selectedDate, String selectedEventId, String selectedEventTitle, String timezone) {
            this(page, selectedDate, selectedEventId, selectedEventTitle, timezone, null, null, null, null);
        }

        public ClientContextDto(String page, String selectedDate, String selectedEventId, String selectedEventTitle,
                                String timezone, String selectedTaskId, String lastTargetId) {
            this(page, selectedDate, selectedEventId, selectedEventTitle, timezone, selectedTaskId, lastTargetId, null, null);
        }
    }

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
            String errorMessage,
            String riskLevel,
            UUID planId,
            Integer stepOrder,
            List<ProposedActionDto> subActions
    ) {
        public ProposedActionDto(UUID id, UUID conversationId, String tool, String status, String summary,
                                 Map<String, Object> parameters, boolean hasConflict, String conflictDetails,
                                 UUID targetEventId, Instant expiresAt, Instant createdAt, String resultDetails,
                                 String errorMessage) {
            this(id, conversationId, tool, status, summary, parameters, hasConflict, conflictDetails, targetEventId,
                    expiresAt, createdAt, resultDetails, errorMessage, "IMPORTANT_WRITE", null, 1, List.of());
        }
    }

    public record ActionPlanDto(
            UUID planId,
            UUID conversationId,
            String title,
            String summary,
            String status,
            int actionCount,
            List<ProposedActionDto> actions,
            Instant createdAt
    ) {}

    public record ChatResponse(
            UUID conversationId,
            UUID messageId,
            String role,
            String content,
            Instant createdAt,
            List<ProposedActionDto> proposedActions,
            ActionPlanDto proposedPlan
    ) {
        public ChatResponse(UUID conversationId, UUID messageId, String role, String content, Instant createdAt, List<ProposedActionDto> proposedActions) {
            this(conversationId, messageId, role, content, createdAt, proposedActions, null);
        }

        public ChatResponse(UUID conversationId, UUID messageId, String role, String content, Instant createdAt) {
            this(conversationId, messageId, role, content, createdAt, List.of(), null);
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
            List<ProposedActionDto> proposedActions,
            ActionPlanDto proposedPlan
    ) {
        public MessageResponse(UUID id, String role, String content, Instant createdAt, List<ProposedActionDto> proposedActions) {
            this(id, role, content, createdAt, proposedActions, null);
        }

        public MessageResponse(UUID id, String role, String content, Instant createdAt) {
            this(id, role, content, createdAt, List.of(), null);
        }
    }

    public record StreamChunk(
            String chunk,
            boolean done,
            UUID messageId,
            List<ProposedActionDto> proposedActions,
            ActionPlanDto proposedPlan
    ) {
        public StreamChunk(String chunk, boolean done, UUID messageId, List<ProposedActionDto> proposedActions) {
            this(chunk, done, messageId, proposedActions, null);
        }

        public StreamChunk(String chunk, boolean done, UUID messageId) {
            this(chunk, done, messageId, List.of(), null);
        }
    }

    public record ActionConfirmResponse(
            UUID actionId,
            String status,
            String message,
            UUID targetEventId,
            Map<String, Object> data
    ) {}

    public record PlanConfirmResponse(
            UUID planId,
            String status,
            String message,
            List<ActionConfirmResponse> results
    ) {}
}
