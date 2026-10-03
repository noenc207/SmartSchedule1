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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

@Service
public class AiChatService {
    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    private final AiContextService contextService;
    private final AiActionService actionService;
    private final AiProvider aiProvider;
    private final AiProperties properties;

    // In-memory sliding window rate limiter: User ID -> List of request timestamps (epoch ms)
    private final Map<UUID, List<Long>> rateLimits = new ConcurrentHashMap<>();

    @Autowired
    public AiChatService(AiConversationRepository conversationRepository,
                         AiMessageRepository messageRepository,
                         AiContextService contextService,
                         AiActionService actionService,
                         AiProvider aiProvider,
                         AiProperties properties) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.contextService = contextService;
        this.actionService = actionService;
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

        // Build dynamic system instruction with SmartSchedule context & client view
        String systemInstruction = buildSystemPrompt(user, request.context());

        // Fetch recent message history (up to 20 messages for context)
        List<AiMessage> pastMessages = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<AiProvider.ChatMessage> chatHistory = new ArrayList<>();
        for (int i = 0; i < pastMessages.size() - 1; i++) {
            AiMessage m = pastMessages.get(i);
            chatHistory.add(new AiProvider.ChatMessage(m.getRole(), m.getContent()));
        }

        // Call Gemini
        AiProvider.ProviderResponse response = aiProvider.generateResponse(systemInstruction, chatHistory, userPrompt);

        String replyContent = response.content();
        List<AiDtos.ProposedActionDto> proposedActions = new ArrayList<>();

        // Handle tool calls if returned
        if (response.toolCalls() != null && !response.toolCalls().isEmpty()) {
            StringBuilder toolResults = new StringBuilder();
            for (AiProvider.ToolCall tool : response.toolCalls()) {
                if (isWriteTool(tool.name()) && actionService != null) {
                    try {
                        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                                user, conversation, tool.name(), tool.arguments(), request.context()
                        );
                        proposedActions.add(proposed);
                        String conflictNote = proposed.hasConflict()
                                ? "\n⚠️ " + proposed.conflictDetails()
                                : "\nKhông phát hiện xung đột thời gian.";
                        toolResults.append("Tôi đề xuất: ").append(proposed.summary()).append(conflictNote)
                                .append("\n\nVui lòng kiểm tra và xác nhận trong thẻ hành động bên dưới.\n");
                    } catch (AiException valEx) {
                        toolResults.append("\n").append(valEx.getMessage()).append("\n");
                    }
                } else {
                    String toolOutput = request.context() != null
                            ? contextService.executeTool(tool.name(), user, tool.arguments(), request.context())
                            : contextService.executeTool(tool.name(), user, tool.arguments());
                    toolResults.append(toolOutput).append("\n");
                }
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
                modelMessage.getCreatedAt(),
                proposedActions
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

            String systemInstruction = buildSystemPrompt(user, request.context());

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
                    streamedToolCalls -> {
                        List<AiDtos.ProposedActionDto> proposedActions = new ArrayList<>();

                        if (streamedToolCalls != null && !streamedToolCalls.isEmpty()) {
                            for (AiProvider.ToolCall tool : streamedToolCalls) {
                                if (isWriteTool(tool.name()) && actionService != null) {
                                    try {
                                        AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                                                user, conversation, tool.name(), tool.arguments(), request.context()
                                        );
                                        proposedActions.add(proposed);
                                        String conflictNote = proposed.hasConflict()
                                                ? "\n⚠️ " + proposed.conflictDetails()
                                                : "\nKhông phát hiện xung đột.";
                                        String text = "\n\nTôi đề xuất: " + proposed.summary() + conflictNote +
                                                "\n\nVui lòng kiểm tra và xác nhận trong thẻ bên dưới.";
                                        accumulatedResponse.append(text);
                                        onChunk.accept(text);
                                    } catch (AiException valEx) {
                                        String text = "\n\n" + valEx.getMessage();
                                        accumulatedResponse.append(text);
                                        onChunk.accept(text);
                                    }
                                } else {
                                    String toolOutput = request.context() != null
                                            ? contextService.executeTool(tool.name(), user, tool.arguments(), request.context())
                                            : contextService.executeTool(tool.name(), user, tool.arguments());
                                    String readOutput = "\n\n" + toolOutput;
                                    accumulatedResponse.append(readOutput);
                                    onChunk.accept(readOutput);
                                }
                            }
                        }

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
                                modelMessage.getCreatedAt(),
                                proposedActions
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

    public static boolean isWriteTool(String toolName) {
        return switch (toolName) {
            case "create_schedule", "update_schedule", "delete_schedule", "reschedule_event" -> true;
            default -> false;
        };
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

    private String buildSystemPrompt(User user, AiDtos.ClientContextDto clientContext) {
        String scheduleContext = contextService.buildContextSummary(user, clientContext);

        return """
                Bạn là SmartSchedule AI — Action-Capable Academic Assistant, một trợ lý học tập và lập kế hoạch học thuật thông minh, tận tâm và chính xác được tích hợp trực tiếp vào SmartSchedule (dành cho sinh viên, giảng viên tại FPT University Quy Nhơn AI Campus).

                QUYỀN HẠN & NGUYÊN TẮC QUAN TRỌNG:
                1. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT THÔNG TIN LỊCH TRÌNH:
                   - Không được tự bịa: start_time, end_time, duration, location, description, recurrence, reminder.
                   - Khi người dùng nói: "Tạo lịch Tiết Vật lý Chủ nhật" -> TUYỆT ĐỐI KHÔNG tự gán 08:00 hay 08:00–09:30.
                   - Không được tự gán địa điểm như "Đại học FPT Quy Nhơn" hay "Phòng Beta" nếu người dùng không nhắc đến.
                   - Không được dùng default ngầm khi người dùng chưa đồng ý.

                2. CÁC TRƯỜNG BẮT BUỘC (REQUIRED FIELDS) CỦA create_schedule:
                   - title (Tên lịch/môn học)
                   - date (Ngày diễn ra YYYY-MM-DD)
                   - start_time (Giờ bắt đầu)
                   - end_time HOẶC duration_minutes (Giờ kết thúc hoặc thời lượng)
                   NẾU THIẾU start_time HOẶC THIẾU CẢ (end_time và duration_minutes): TUYỆT ĐỐI KHÔNG ĐƯỢC GỌI TOOL `create_schedule`! Bạn PHẢI HỎI LẠI NGƯỜI DÙNG để làm rõ.

                3. NGUYÊN TẮC HỎI LÀM RÕ THÔNG MINH (SMART CLARIFICATION):
                   - CHỈ HỎI những trường thực sự còn thiếu, KHÔNG hỏi lại những trường người dùng đã cung cấp.
                   - Trường hợp 1: Thiếu cả giờ bắt đầu và thời lượng (Ví dụ: "Tạo lịch Tiết Vật lý Chủ nhật"):
                     -> Hỏi: "Được rồi, bạn muốn học Tiết Vật lý vào Chủ nhật bắt đầu lúc mấy giờ và trong bao nhiêu phút?"
                   - Trường hợp 2: Đã có giờ bắt đầu nhưng thiếu thời lượng/giờ kết thúc (Ví dụ: "Tạo Tiết Vật lý Chủ nhật lúc 8h"):
                     -> Hỏi: "Bạn muốn kết thúc lúc mấy giờ hay học trong bao nhiêu phút?"
                   - Trường hợp 3: Đã có thời lượng nhưng thiếu giờ bắt đầu (Ví dụ: "Tạo Tiết Vật lý Chủ nhật 90 phút"):
                     -> Hỏi: "Bạn muốn bắt đầu học lúc mấy giờ?"
                   - Trường hợp 4: Đã có đủ thông tin (Ví dụ: "Tạo Tiết Vật lý Chủ nhật lúc 8h, 90 phút" hoặc "8h đến 9h30"):
                     -> Tính toán thời gian chính xác (start = 08:00, duration = 90, end = 09:30) và GỌI TOOL `create_schedule`.

                4. CÁC TRƯỜNG TÙY CHỌN (OPTIONAL FIELDS):
                   - location, description: là tùy chọn. Nếu người dùng không nhắc tới, để trống (null), KHÔNG ĐƯỢC hỏi và TUYỆT ĐỐI KHÔNG tự bịa phòng học hay trường học.

                5. Nguyên tắc con người xác nhận (Human-in-the-loop): Hệ thống sẽ KHÔNG tự ý thay đổi dữ liệu ngầm mà sẽ hiển thị Thẻ Xác Nhận (Action Card) kèm thông tin xung đột để người dùng chủ động bấm Xác nhận. Hãy thông báo rõ bạn đã chuẩn bị đề xuất tạo/sửa lịch và mời người dùng bấm nút xác nhận.
                6. Phát hiện xung đột (Conflict Detection): Luôn chú ý các khung giờ đã có lịch trước khi đề xuất giờ mới. Nếu phát hiện xung đột, hãy cảnh báo và gợi ý khung giờ thay thế.
                7. Tối ưu ngày (Optimize my day): Khi người dùng yêu cầu tối ưu lịch trình hôm nay, hãy phân tích lịch học, phát hiện các khoảng trống hoặc nguy cơ quá tải/xung đột, và đưa ra đề xuất điều chỉnh cụ thể.

                NGỮ CẢNH DỮ LIỆU LỊCH TRÌNH THỰC TẾ CỦA NGƯỜI DÙNG:
                """ + scheduleContext;
    }
}
