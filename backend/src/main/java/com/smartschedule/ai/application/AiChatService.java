package com.smartschedule.ai.application;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.AiMessage;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.ai.infrastructure.AiMessageRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

@Service
public class AiChatService {
    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    private final AiContextService contextService;
    private final AiProvider aiProvider;
    private final AiProperties properties;

    // In-memory sliding window rate limiter: User ID -> List of request timestamps (epoch ms)
    private final Map<UUID, List<Long>> rateLimits = new ConcurrentHashMap<>();

    public AiChatService(AiConversationRepository conversationRepository,
                         AiMessageRepository messageRepository,
                         AiContextService contextService,
                         AiProvider aiProvider,
                         AiProperties properties) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.contextService = contextService;
        this.aiProvider = aiProvider;
        this.properties = properties;
    }

    @Transactional
    public AiDtos.ChatResponse chat(User user, AiDtos.ChatRequest request) {
        validateRequest(user, request.message());
        checkRateLimit(user.getId());

        AiConversation conversation = resolveConversation(user, request.conversationId());
        String userPrompt = request.message().trim();

        // Save user message to database
        AiMessage userMessage = new AiMessage(conversation, "user", userPrompt);
        messageRepository.save(userMessage);

        // Build dynamic system instruction with SmartSchedule context
        String systemInstruction = buildSystemPrompt(user);

        // Fetch recent message history (up to 20 messages for context)
        List<AiMessage> pastMessages = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<AiProvider.ChatMessage> chatHistory = new ArrayList<>();
        // Exclude the message we just saved so it is sent as current user message
        for (int i = 0; i < pastMessages.size() - 1; i++) {
            AiMessage m = pastMessages.get(i);
            chatHistory.add(new AiProvider.ChatMessage(m.getRole(), m.getContent()));
        }

        // Call Gemini
        AiProvider.ProviderResponse response = aiProvider.generateResponse(systemInstruction, chatHistory, userPrompt);

        String replyContent = response.content();

        // Handle tool calls if returned
        if (response.toolCalls() != null && !response.toolCalls().isEmpty()) {
            StringBuilder toolResults = new StringBuilder();
            for (AiProvider.ToolCall tool : response.toolCalls()) {
                String toolOutput = contextService.executeTool(tool.name(), user, tool.arguments());
                toolResults.append(toolOutput).append("\n");
            }
            if (replyContent.isBlank()) {
                replyContent = toolResults.toString().trim();
            } else {
                replyContent = replyContent + "\n\n" + toolResults.toString().trim();
            }
        }

        if (replyContent.isBlank()) {
            replyContent = "Tôi đã tiếp nhận thông tin nhưng chưa thể đưa ra câu trả lời chi tiết. Bạn có câu hỏi nào khác về lịch học không?";
        }

        // Save assistant reply to database
        AiMessage modelMessage = new AiMessage(conversation, "model", replyContent, response.tokensUsed());
        messageRepository.save(modelMessage);

        conversation.touch();
        // Automatically title the conversation if it's the first message
        if (pastMessages.size() <= 1 && conversation.getTitle().equals("Cuộc trò chuyện mới")) {
            String newTitle = userPrompt.length() > 36 ? userPrompt.substring(0, 36) + "…" : userPrompt;
            conversation.setTitle(newTitle);
        }
        conversationRepository.save(conversation);

        return new AiDtos.ChatResponse(
                conversation.getId(),
                modelMessage.getId(),
                modelMessage.getRole(),
                modelMessage.getContent(),
                modelMessage.getCreatedAt()
        );
    }

    public void streamChat(User user, AiDtos.ChatRequest request,
                           Consumer<String> onChunk,
                           Consumer<AiDtos.ChatResponse> onComplete,
                           Consumer<Throwable> onError) {
        try {
            validateRequest(user, request.message());
            checkRateLimit(user.getId());

            AiConversation conversation = resolveConversation(user, request.conversationId());
            String userPrompt = request.message().trim();

            // Save user message to database
            AiMessage userMessage = new AiMessage(conversation, "user", userPrompt);
            messageRepository.save(userMessage);

            String systemInstruction = buildSystemPrompt(user);

            List<AiMessage> pastMessages = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversation.getId());
            List<AiProvider.ChatMessage> chatHistory = new ArrayList<>();
            for (int i = 0; i < pastMessages.size() - 1; i++) {
                AiMessage m = pastMessages.get(i);
                chatHistory.add(new AiProvider.ChatMessage(m.getRole(), m.getContent()));
            }

            StringBuilder accumulatedResponse = new StringBuilder();

            aiProvider.streamResponse(
                    systemInstruction,
                    chatHistory,
                    userPrompt,
                    chunk -> {
                        accumulatedResponse.append(chunk);
                        onChunk.accept(chunk);
                    },
                    () -> {
                        String fullContent = accumulatedResponse.toString().trim();
                        if (fullContent.isEmpty()) {
                            fullContent = "Tôi đã ghi nhận nhưng không nhận được nội dung phản hồi từ mô hình.";
                        }

                        AiMessage modelMessage = new AiMessage(conversation, "model", fullContent);
                        messageRepository.save(modelMessage);

                        conversation.touch();
                        if (pastMessages.size() <= 1 && conversation.getTitle().equals("Cuộc trò chuyện mới")) {
                            String newTitle = userPrompt.length() > 36 ? userPrompt.substring(0, 36) + "…" : userPrompt;
                            conversation.setTitle(newTitle);
                        }
                        conversationRepository.save(conversation);

                        onComplete.accept(new AiDtos.ChatResponse(
                                conversation.getId(),
                                modelMessage.getId(),
                                modelMessage.getRole(),
                                modelMessage.getContent(),
                                modelMessage.getCreatedAt()
                        ));
                    },
                    onError
            );

        } catch (Throwable ex) {
            onError.accept(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<AiDtos.ConversationResponse> listConversations(User user) {
        return conversationRepository.findAllByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .map(c -> new AiDtos.ConversationResponse(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt()))
                .toList();
    }

    @Transactional
    public AiDtos.ConversationResponse getOrCreateActiveConversation(User user) {
        AiConversation conversation = conversationRepository.findLatestByUserId(user.getId())
                .orElseGet(() -> conversationRepository.save(new AiConversation(user, "Cuộc trò chuyện mới")));
        return new AiDtos.ConversationResponse(conversation.getId(), conversation.getTitle(), conversation.getCreatedAt(), conversation.getUpdatedAt());
    }

    @Transactional
    public AiDtos.ConversationResponse createNewConversation(User user, String title) {
        AiConversation conversation = conversationRepository.save(new AiConversation(user, title));
        return new AiDtos.ConversationResponse(conversation.getId(), conversation.getTitle(), conversation.getCreatedAt(), conversation.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public List<AiDtos.MessageResponse> getConversationMessages(User user, UUID conversationId) {
        AiConversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy cuộc trò chuyện."));

        return messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversation.getId())
                .stream()
                .map(m -> new AiDtos.MessageResponse(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void deleteConversation(User user, UUID conversationId) {
        AiConversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy cuộc trò chuyện."));
        messageRepository.deleteAllByConversationId(conversation.getId());
        conversationRepository.delete(conversation);
    }

    private void validateRequest(User user, String message) {
        if (user == null) {
            throw new AiException("UNAUTHORIZED", "Vui lòng đăng nhập để sử dụng tính năng SmartSchedule AI.");
        }
        if (message == null || message.isBlank()) {
            throw new AiException("INVALID_MESSAGE", "Tin nhắn không được để trống.");
        }
        if (message.length() > properties.maxMessageLength()) {
            throw new AiException("MESSAGE_TOO_LONG",
                    String.format("Tin nhắn quá dài (tối đa %d ký tự).", properties.maxMessageLength()));
        }
    }

    private synchronized void checkRateLimit(UUID userId) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1 minute sliding window

        List<Long> timestamps = rateLimits.computeIfAbsent(userId, k -> new ArrayList<>());
        timestamps.removeIf(ts -> ts < windowStart);

        if (timestamps.size() >= properties.requestsPerMinute()) {
            throw new AiException("RATE_LIMIT_EXCEEDED",
                    String.format("Bạn đã gửi quá nhiều yêu cầu trong 1 phút (tối đa %d yêu cầu/phút). Vui lòng đợi giây lát.", properties.requestsPerMinute()));
        }

        timestamps.add(now);
    }

    private AiConversation resolveConversation(User user, String conversationIdStr) {
        if (conversationIdStr != null && !conversationIdStr.isBlank()) {
            try {
                UUID conversationId = UUID.fromString(conversationIdStr.trim());
                return conversationRepository.findByIdAndUserId(conversationId, user.getId())
                        .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy cuộc trò chuyện được yêu cầu."));
            } catch (IllegalArgumentException ex) {
                // If invalid UUID format, fallback to creating or finding latest
            }
        }

        return conversationRepository.findLatestByUserId(user.getId())
                .orElseGet(() -> conversationRepository.save(new AiConversation(user, "Cuộc trò chuyện mới")));
    }

    private String buildSystemPrompt(User user) {
        String scheduleContext = contextService.buildContextSummary(user);

        return """
                Bạn là SmartSchedule AI — Academic Planning Assistant, một trợ lý học tập và lập kế hoạch học thuật thông minh, tận tâm và chính xác được tích hợp trực tiếp vào ứng dụng SmartSchedule (dành cho sinh viên, giảng viên và cán bộ tại FPT University Quy Nhơn AI Campus).

                NGUYÊN TẮC CỐT LÕI:
                1. Tính chính xác: Luôn dựa trên thời gian thực và dữ liệu lịch trình thực tế của người dùng được cung cấp dưới đây. TUYỆT ĐỐI KHÔNG bịa đặt tiết học, môn học, phòng học, bài kiểm tra hay deadline mà người dùng không có.
                2. Tính hỗ trợ: Trả lời ngắn gọn, rõ ràng, trực diện, lịch sự và thân thiện bằng tiếng Việt (hoặc tiếng Anh nếu người dùng hỏi bằng tiếng Anh).
                3. Gợi ý thông minh: Khi người dùng hỏi về khoảng thời gian rảnh, hãy chỉ rõ các khung giờ trống và gợi ý hoạt động hợp lý (ví dụ: ôn bài, làm bài tập, nghỉ ngơi, thể thao).
                4. Giới hạn thẩm quyền: Hiện tại bạn có quyền ĐỌC dữ liệu lịch trình (read-only). Bạn không thể tự ý sửa hay xóa dữ liệu của người dùng khi chưa có xác nhận từ hệ thống.

                NGỮ CẢNH DỮ LIỆU LỊCH TRÌNH THỰC TẾ CỦA NGƯỜI DÙNG:
                """ + scheduleContext;
    }
}
