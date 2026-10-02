package com.smartschedule.ai.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.application.AiChatService;
import com.smartschedule.ai.application.AiException;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.user.domain.User;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

@RestController
@RequestMapping({"/api/v1/ai", "/api/ai"})
public class AiController {
    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final AiChatService chatService;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    public AiController(AiChatService chatService, CurrentUserService currentUserService, ObjectMapper objectMapper) {
        this.chatService = chatService;
        this.currentUserService = currentUserService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/chat", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiDtos.ChatResponse> chat(@Valid @RequestBody AiDtos.ChatRequest request) {
        User user = currentUserService.requireUser();
        AiDtos.ChatResponse response = chatService.chat(user, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@Valid @RequestBody AiDtos.ChatRequest request) {
        User user = currentUserService.requireUser();
        // 60-second SSE timeout
        SseEmitter emitter = new SseEmitter(60_000L);

        Executors.newVirtualThreadPerTaskExecutor().submit(() -> {
            chatService.streamChat(
                    user,
                    request,
                    chunk -> {
                        try {
                            String data = objectMapper.writeValueAsString(Map.of("chunk", chunk, "done", false));
                            emitter.send(SseEmitter.event().data(data));
                        } catch (IOException ex) {
                            log.debug("SSE send failed: {}", ex.getMessage());
                            emitter.completeWithError(ex);
                        }
                    },
                    response -> {
                        try {
                            String data = objectMapper.writeValueAsString(Map.of(
                                    "done", true,
                                    "conversationId", response.conversationId(),
                                    "messageId", response.messageId(),
                                    "content", response.content(),
                                    "role", response.role()
                            ));
                            emitter.send(SseEmitter.event().data(data));
                            emitter.complete();
                        } catch (IOException ex) {
                            emitter.completeWithError(ex);
                        }
                    },
                    error -> {
                        try {
                            String errorMsg = error instanceof AiException aiEx ? aiEx.getMessage() : "Lỗi khi xử lý AI: " + error.getMessage();
                            String data = objectMapper.writeValueAsString(Map.of("error", errorMsg, "done", true));
                            emitter.send(SseEmitter.event().data(data));
                            emitter.complete();
                        } catch (Exception ignored) {
                            emitter.completeWithError(error);
                        }
                    }
            );
        });

        return emitter;
    }

    @GetMapping("/conversations")
    public List<AiDtos.ConversationResponse> listConversations() {
        User user = currentUserService.requireUser();
        return chatService.listConversations(user);
    }

    @GetMapping("/conversations/active")
    public AiDtos.ConversationResponse getActiveConversation() {
        User user = currentUserService.requireUser();
        return chatService.getOrCreateActiveConversation(user);
    }

    @PostMapping("/conversations")
    public AiDtos.ConversationResponse createConversation(@RequestBody(required = false) Map<String, String> body) {
        User user = currentUserService.requireUser();
        String title = (body != null && body.containsKey("title")) ? body.get("title") : "Cuộc trò chuyện mới";
        return chatService.createNewConversation(user, title);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<AiDtos.MessageResponse> getMessages(@PathVariable UUID conversationId) {
        User user = currentUserService.requireUser();
        return chatService.getConversationMessages(user, conversationId);
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID conversationId) {
        User user = currentUserService.requireUser();
        chatService.deleteConversation(user, conversationId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(AiException.class)
    public ResponseEntity<Map<String, String>> handleAiException(AiException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case "UNAUTHORIZED" -> HttpStatus.UNAUTHORIZED;
            case "NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "RATE_LIMIT_EXCEEDED", "QUOTA_EXCEEDED" -> HttpStatus.TOO_MANY_REQUESTS;
            case "INVALID_MESSAGE", "MESSAGE_TOO_LONG" -> HttpStatus.BAD_REQUEST;
            case "MISSING_API_KEY", "INVALID_KEY" -> HttpStatus.BAD_GATEWAY;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return ResponseEntity.status(status).body(Map.of(
                "code", ex.getCode(),
                "message", ex.getMessage()
        ));
    }
}
