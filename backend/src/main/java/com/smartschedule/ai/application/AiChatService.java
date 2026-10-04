package com.smartschedule.ai.application;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.AiIntent;
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
    private final AiToolRegistry toolRegistry;
    private final AiAgentRouter agentRouter;
    private final AiUnderstandingService understandingService;
    private final AiWrongToolGuard wrongToolGuard;
    private final AiResponseRelevanceValidator relevanceValidator;

    // In-memory sliding window rate limiter: User ID -> List of request timestamps (epoch ms)
    private final Map<UUID, List<Long>> rateLimits = new ConcurrentHashMap<>();

    @Autowired
    public AiChatService(AiConversationRepository conversationRepository,
                         AiMessageRepository messageRepository,
                         AiContextService contextService,
                         AiActionService actionService,
                         AiProvider aiProvider,
                         AiProperties properties,
                         AiToolRegistry toolRegistry,
                         AiAgentRouter agentRouter,
                         @Autowired(required = false) AiUnderstandingService understandingService,
                         @Autowired(required = false) AiWrongToolGuard wrongToolGuard,
                         @Autowired(required = false) AiResponseRelevanceValidator relevanceValidator) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.contextService = contextService;
        this.actionService = actionService;
        this.aiProvider = aiProvider;
        this.properties = properties;
        this.toolRegistry = toolRegistry != null ? toolRegistry : new AiToolRegistry();
        this.agentRouter = agentRouter != null ? agentRouter : new AiAgentRouter();

        this.understandingService = (understandingService != null) ? understandingService : new AiUnderstandingService(
                new AiQueryRepairService(),
                new AiAliasService(),
                new AiReferenceResolverService(null, null, new AiAliasService()),
                new AiPendingIntentService(),
                new AiConfidenceEngine(),
                this.agentRouter
        );
        this.wrongToolGuard = (wrongToolGuard != null) ? wrongToolGuard : new AiWrongToolGuard();
        this.relevanceValidator = (relevanceValidator != null) ? relevanceValidator : new AiResponseRelevanceValidator();
    }

    public AiChatService(AiConversationRepository conversationRepository,
                         AiMessageRepository messageRepository,
                         AiContextService contextService,
                         AiActionService actionService,
                         AiProvider aiProvider,
                         AiProperties properties,
                         AiToolRegistry toolRegistry,
                         AiAgentRouter agentRouter) {
        this(conversationRepository, messageRepository, contextService, actionService, aiProvider, properties, toolRegistry, agentRouter, null, null, null);
    }

    public AiChatService(AiConversationRepository conversationRepository,
                         AiMessageRepository messageRepository,
                         AiContextService contextService,
                         AiActionService actionService,
                         AiProvider aiProvider,
                         AiProperties properties) {
        this(conversationRepository, messageRepository, contextService, actionService, aiProvider, properties, new AiToolRegistry(), new AiAgentRouter(), null, null, null);
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

        AiUnderstandingService.UnderstandingResult understanding =
                understandingService.analyze(user, userPrompt, conversation.getId(), request.context());

        // 1. Cancellation request
        if (understanding.isCancel()) {
            String cancelReply = "Đã hủy yêu cầu theo ý bạn.";
            AiMessage modelMessage = new AiMessage(conversation, "model", cancelReply);
            messageRepository.save(modelMessage);
            conversation.touch();
            conversationRepository.save(conversation);
            return new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), cancelReply, modelMessage.getCreatedAt(), List.of());
        }

        // 2. Help query
        if (understanding.isHelp()) {
            String helpReply = "SmartSchedule AI hỗ trợ bạn quản lý lịch học và công việc nhanh chóng:\n"
                    + "• Đổi/Xóa môn: \"xóa lịch lý\", \"thay lý bằng toán\", \"dời toán sang tối\"\n"
                    + "• Tạo lịch: \"tạo lịch Toán Chủ nhật lúc 08:00 trong 90 phút\"\n"
                    + "• Đồng bộ: \"đồng bộ Google Calendar\", \"đọc link Google Sheets này\"\n"
                    + "• Quản lý việc: \"thêm task nộp lab\", \"xong bài tập rồi\"\n"
                    + "• Giờ rảnh: \"cuối tuần tôi còn 2 tiếng trống không?\"\n"
                    + "Bạn muốn thực hiện thao tác nào ngay bây giờ?";
            AiMessage modelMessage = new AiMessage(conversation, "model", helpReply);
            messageRepository.save(modelMessage);
            conversation.touch();
            conversationRepository.save(conversation);
            return new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), helpReply, modelMessage.getCreatedAt(), List.of());
        }

        // 3. Needs clarification (missing required fields or ambiguous target)
        if (understanding.needsClarification() && understanding.clarificationQuestion() != null) {
            String clarifyReply = understanding.clarificationQuestion();
            AiMessage modelMessage = new AiMessage(conversation, "model", clarifyReply);
            messageRepository.save(modelMessage);
            conversation.touch();
            conversationRepository.save(conversation);
            return new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), clarifyReply, modelMessage.getCreatedAt(), List.of());
        }

        // 4. High-confidence deterministic mutation shortcut
        if (understanding.isCommand() && actionService != null) {
            String intent = understanding.intent();
            Map<String, Object> entities = understanding.entities();
            AiDtos.ProposedActionDto proposed = null;

            if ("REPLACE_SCHEDULE".equals(intent) && entities.containsKey("target_title") && entities.containsKey("new_title")) {
                try {
                    proposed = actionService.proposeAction(user, conversation, "replace_schedule", entities, request.context());
                } catch (Exception ex) {
                    log.debug("Deterministic replace proposal skipped: {}", ex.getMessage());
                }
            } else if ("DELETE_SCHEDULE".equals(intent) && (entities.containsKey("target_event_id") || entities.containsKey("target_title"))) {
                try {
                    proposed = actionService.proposeAction(user, conversation, "delete_schedule", entities, request.context());
                } catch (Exception ex) {
                    log.debug("Deterministic delete proposal skipped: {}", ex.getMessage());
                }
            } else if ("SYNC_GOOGLE_CALENDAR".equals(intent)) {
                try {
                    proposed = actionService.proposeAction(user, conversation, "sync_google_calendar", Map.of(), request.context());
                } catch (Exception ex) {
                    log.debug("Deterministic sync proposal skipped: {}", ex.getMessage());
                }
            }

            if (proposed != null) {
                String reply = "Tôi đề xuất: " + proposed.summary() +
                        (proposed.hasConflict() ? "\n⚠️ " + proposed.conflictDetails() : "\nKhông phát hiện xung đột.") +
                        "\n\nVui lòng kiểm tra và xác nhận trong thẻ bên dưới.";
                AiMessage modelMessage = new AiMessage(conversation, "model", reply);
                messageRepository.save(modelMessage);
                conversation.touch();
                conversationRepository.save(conversation);
                return new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), reply, modelMessage.getCreatedAt(), List.of(proposed));
            }
        }

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
            boolean hasWriteTool = false;
            for (AiProvider.ToolCall tool : response.toolCalls()) {
                AiWrongToolGuard.ToolValidation guardVal = wrongToolGuard.validate(understanding.intent(), tool.name(), tool.arguments());
                if (!guardVal.isValid()) {
                    log.warn("WrongToolGuard intercepted tool call: {} for intent: {}. Reason: {}", tool.name(), understanding.intent(), guardVal.reason());
                    if (guardVal.suggestedTool() != null && isWriteTool(guardVal.suggestedTool()) && actionService != null) {
                        try {
                            AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                                    user, conversation, guardVal.suggestedTool(),
                                    understanding.entities().isEmpty() ? tool.arguments() : understanding.entities(),
                                    request.context()
                            );
                            proposedActions.add(proposed);
                            hasWriteTool = true;
                            String conflictNote = proposed.hasConflict()
                                    ? "\n⚠️ " + proposed.conflictDetails()
                                    : "\nKhông phát hiện xung đột thời gian.";
                            toolResults.append("Tôi đề xuất: ").append(proposed.summary()).append(conflictNote)
                                    .append("\n\nVui lòng kiểm tra và xác nhận trong thẻ hành động bên dưới.\n");
                            continue;
                        } catch (AiException valEx) {
                            toolResults.append("\n").append(valEx.getMessage()).append("\n");
                            continue;
                        }
                    }
                    continue;
                }

                if (isWriteTool(tool.name()) && actionService != null) {
                    hasWriteTool = true;
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

            if (!hasWriteTool && hasMutationIntent(userPrompt)) {
                // Multi-step ReAct Turn 2: Feed the read tool results back to Gemini so it can generate the write tool call or clarification
                List<AiProvider.ChatMessage> turn2History = new ArrayList<>(chatHistory);
                turn2History.add(new AiProvider.ChatMessage("user", userPrompt));
                turn2History.add(new AiProvider.ChatMessage("model", "Dữ liệu hiện tại của hệ thống:\n" + toolResults.toString().trim()));
                String followUpPrompt = "Dựa trên dữ liệu trên, hãy thực hiện thao tác người dùng yêu cầu: \"" + userPrompt + "\". "
                        + "Nếu đây là yêu cầu thay đổi (lịch, task, deadline, nhắc nhở, điều hướng, kế hoạch), hãy gọi write tool tương ứng ngay lập tức. "
                        + "Nếu thiếu thông tin bắt buộc, hãy hỏi làm rõ ngắn gọn.";

                AiProvider.ProviderResponse turn2Response = aiProvider.generateResponse(systemInstruction, turn2History, followUpPrompt);
                if (turn2Response.toolCalls() != null && !turn2Response.toolCalls().isEmpty()) {
                    for (AiProvider.ToolCall tool : turn2Response.toolCalls()) {
                        if (isWriteTool(tool.name()) && actionService != null) {
                            try {
                                AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                                        user, conversation, tool.name(), tool.arguments(), request.context()
                                );
                                proposedActions.add(proposed);
                                String conflictNote = proposed.hasConflict()
                                        ? "\n⚠️ " + proposed.conflictDetails()
                                        : "\nKhông phát hiện xung đột thời gian.";
                                replyContent = "Tôi đề xuất: " + proposed.summary() + conflictNote +
                                        "\n\nVui lòng kiểm tra và xác nhận trong thẻ hành động bên dưới.";
                            } catch (AiException valEx) {
                                replyContent = valEx.getMessage();
                            }
                        }
                    }
                }
                if (proposedActions.isEmpty()) {
                    if (turn2Response.content() != null && !turn2Response.content().isBlank()) {
                        replyContent = turn2Response.content().trim();
                    } else if (!toolResults.isEmpty()) {
                        replyContent = toolResults.toString().trim();
                    }
                }
            } else {
                if (replyContent.isBlank()) {
                    replyContent = toolResults.toString().trim();
                } else {
                    replyContent = replyContent + "\n\n" + toolResults.toString().trim();
                }
            }
        }

        if (replyContent.isBlank()) {
            replyContent = "Tôi đã tiếp nhận thông tin nhưng chưa thể đưa ra câu trả lời chi tiết. Bạn có câu hỏi nào khác không?";
        }

        // Validate response relevance and guard against no-op acknowledgements
        AiResponseRelevanceValidator.RelevanceAssessment relevance = relevanceValidator.validate(
                understanding.intent(),
                understanding.isCommand(),
                replyContent,
                !proposedActions.isEmpty()
        );
        if (!relevance.isRelevant() && relevance.suggestedFallback() != null) {
            replyContent = relevance.suggestedFallback();
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

            AiUnderstandingService.UnderstandingResult understanding =
                    understandingService.analyze(user, userPrompt, conversation.getId(), request.context());

            // 1. Cancellation request
            if (understanding.isCancel()) {
                String cancelReply = "Đã hủy yêu cầu theo ý bạn.";
                AiMessage modelMessage = new AiMessage(conversation, "model", cancelReply);
                messageRepository.save(modelMessage);
                conversation.touch();
                conversationRepository.save(conversation);
                onChunk.accept(cancelReply);
                onComplete.accept(new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), cancelReply, modelMessage.getCreatedAt(), List.of()));
                return;
            }

            // 2. Help query
            if (understanding.isHelp()) {
                String helpReply = "SmartSchedule AI hỗ trợ bạn quản lý lịch học và công việc nhanh chóng:\n"
                        + "• Đổi/Xóa môn: \"xóa lịch lý\", \"thay lý bằng toán\", \"dời toán sang tối\"\n"
                        + "• Tạo lịch: \"tạo lịch Toán Chủ nhật lúc 08:00 trong 90 phút\"\n"
                        + "• Đồng bộ: \"đồng bộ Google Calendar\", \"đọc link Google Sheets này\"\n"
                        + "• Quản lý việc: \"thêm task nộp lab\", \"xong bài tập rồi\"\n"
                        + "• Giờ rảnh: \"cuối tuần tôi còn 2 tiếng trống không?\"\n"
                        + "Bạn muốn thực hiện thao tác nào ngay bây giờ?";
                AiMessage modelMessage = new AiMessage(conversation, "model", helpReply);
                messageRepository.save(modelMessage);
                conversation.touch();
                conversationRepository.save(conversation);
                onChunk.accept(helpReply);
                onComplete.accept(new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), helpReply, modelMessage.getCreatedAt(), List.of()));
                return;
            }

            // 3. Needs clarification (missing required fields or ambiguous target)
            if (understanding.needsClarification() && understanding.clarificationQuestion() != null) {
                String clarifyReply = understanding.clarificationQuestion();
                AiMessage modelMessage = new AiMessage(conversation, "model", clarifyReply);
                messageRepository.save(modelMessage);
                conversation.touch();
                conversationRepository.save(conversation);
                onChunk.accept(clarifyReply);
                onComplete.accept(new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), clarifyReply, modelMessage.getCreatedAt(), List.of()));
                return;
            }

            // 4. High-confidence deterministic mutation shortcut
            if (understanding.isCommand() && actionService != null) {
                String intent = understanding.intent();
                Map<String, Object> entities = understanding.entities();
                AiDtos.ProposedActionDto proposed = null;

                if ("REPLACE_SCHEDULE".equals(intent) && entities.containsKey("target_title") && entities.containsKey("new_title")) {
                    try {
                        proposed = actionService.proposeAction(user, conversation, "replace_schedule", entities, request.context());
                    } catch (Exception ex) {
                        log.debug("Deterministic replace proposal skipped: {}", ex.getMessage());
                    }
                } else if ("DELETE_SCHEDULE".equals(intent) && (entities.containsKey("target_event_id") || entities.containsKey("target_title"))) {
                    try {
                        proposed = actionService.proposeAction(user, conversation, "delete_schedule", entities, request.context());
                    } catch (Exception ex) {
                        log.debug("Deterministic delete proposal skipped: {}", ex.getMessage());
                    }
                } else if ("SYNC_GOOGLE_CALENDAR".equals(intent)) {
                    try {
                        proposed = actionService.proposeAction(user, conversation, "sync_google_calendar", Map.of(), request.context());
                    } catch (Exception ex) {
                        log.debug("Deterministic sync proposal skipped: {}", ex.getMessage());
                    }
                }

                if (proposed != null) {
                    String reply = "Tôi đề xuất: " + proposed.summary() +
                            (proposed.hasConflict() ? "\n⚠️ " + proposed.conflictDetails() : "\nKhông phát hiện xung đột.") +
                            "\n\nVui lòng kiểm tra và xác nhận trong thẻ bên dưới.";
                    AiMessage modelMessage = new AiMessage(conversation, "model", reply);
                    messageRepository.save(modelMessage);
                    conversation.touch();
                    conversationRepository.save(conversation);
                    onChunk.accept(reply);
                    onComplete.accept(new AiDtos.ChatResponse(conversation.getId(), modelMessage.getId(), modelMessage.getRole(), reply, modelMessage.getCreatedAt(), List.of(proposed)));
                    return;
                }
            }

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
                        StringBuilder toolResults = new StringBuilder();

                        if (streamedToolCalls != null && !streamedToolCalls.isEmpty()) {
                            boolean hasWriteTool = false;
                            for (AiProvider.ToolCall tool : streamedToolCalls) {
                                AiWrongToolGuard.ToolValidation guardVal = wrongToolGuard.validate(understanding.intent(), tool.name(), tool.arguments());
                                if (!guardVal.isValid()) {
                                    log.warn("WrongToolGuard intercepted tool call in streamChat: {} for intent: {}. Reason: {}", tool.name(), understanding.intent(), guardVal.reason());
                                    if (guardVal.suggestedTool() != null && isWriteTool(guardVal.suggestedTool()) && actionService != null) {
                                        try {
                                            AiDtos.ProposedActionDto proposed = actionService.proposeAction(
                                                    user, conversation, guardVal.suggestedTool(),
                                                    understanding.entities().isEmpty() ? tool.arguments() : understanding.entities(),
                                                    request.context()
                                            );
                                            proposedActions.add(proposed);
                                            hasWriteTool = true;
                                            String conflictNote = proposed.hasConflict()
                                                    ? "\n⚠️ " + proposed.conflictDetails()
                                                    : "\nKhông phát hiện xung đột.";
                                            String text = "\n\nTôi đề xuất: " + proposed.summary() + conflictNote +
                                                    "\n\nVui lòng kiểm tra và xác nhận trong thẻ bên dưới.";
                                            accumulatedResponse.append(text);
                                            onChunk.accept(text);
                                            continue;
                                        } catch (AiException valEx) {
                                            String text = "\n\n" + valEx.getMessage();
                                            accumulatedResponse.append(text);
                                            onChunk.accept(text);
                                            continue;
                                        }
                                    }
                                    continue;
                                }

                                if (isWriteTool(tool.name()) && actionService != null) {
                                    hasWriteTool = true;
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
                                    toolResults.append(toolOutput).append("\n");
                                }
                            }

                            if (!hasWriteTool && hasMutationIntent(userPrompt)) {
                                // Turn 2 for streamChat
                                List<AiProvider.ChatMessage> turn2History = new ArrayList<>(chatHistory);
                                turn2History.add(new AiProvider.ChatMessage("user", userPrompt));
                                turn2History.add(new AiProvider.ChatMessage("model", "Dữ liệu hiện tại của hệ thống:\n" + toolResults.toString().trim()));
                                String followUpPrompt = "Dựa trên dữ liệu trên, hãy thực hiện thao tác người dùng yêu cầu: \"" + userPrompt + "\". "
                                        + "Nếu đây là yêu cầu thay đổi (lịch, task, deadline, nhắc nhở, điều hướng, kế hoạch), hãy gọi write tool tương ứng ngay lập tức. "
                                        + "Nếu thiếu thông tin bắt buộc, hãy hỏi làm rõ ngắn gọn.";

                                AiProvider.ProviderResponse turn2Response = aiProvider.generateResponse(systemInstruction, turn2History, followUpPrompt);
                                if (turn2Response.toolCalls() != null && !turn2Response.toolCalls().isEmpty()) {
                                    for (AiProvider.ToolCall tool : turn2Response.toolCalls()) {
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
                                                accumulatedResponse.setLength(0);
                                                accumulatedResponse.append(text.trim());
                                                onChunk.accept(text);
                                            } catch (AiException valEx) {
                                                String text = "\n\n" + valEx.getMessage();
                                                accumulatedResponse.append(text);
                                                onChunk.accept(text);
                                            }
                                        }
                                    }
                                }
                                if (proposedActions.isEmpty()) {
                                    if (turn2Response.content() != null && !turn2Response.content().isBlank()) {
                                        accumulatedResponse.setLength(0);
                                        accumulatedResponse.append(turn2Response.content().trim());
                                        onChunk.accept(turn2Response.content().trim());
                                    } else if (!toolResults.isEmpty()) {
                                        String readOutput = toolResults.toString().trim();
                                        accumulatedResponse.setLength(0);
                                        accumulatedResponse.append(readOutput);
                                        onChunk.accept(readOutput);
                                    }
                                }
                            } else if (!hasWriteTool) {
                                String readOutput = toolResults.toString().trim();
                                if (!readOutput.isBlank()) {
                                    if (accumulatedResponse.length() > 0) {
                                        accumulatedResponse.append("\n\n");
                                    }
                                    accumulatedResponse.append(readOutput);
                                    onChunk.accept("\n\n" + readOutput);
                                }
                            }
                        }

                        String fullContent = accumulatedResponse.toString().trim();
                        if (fullContent.isEmpty()) {
                            if (!toolResults.isEmpty()) {
                                fullContent = toolResults.toString().trim();
                            } else {
                                fullContent = "Tôi đã ghi nhận câu hỏi của bạn. Bạn có thể cung cấp thêm chi tiết để tôi hỗ trợ nhé!";
                            }
                        }

                        // Validate response relevance and guard against no-op acknowledgements
                        AiResponseRelevanceValidator.RelevanceAssessment relevance = relevanceValidator.validate(
                                understanding.intent(),
                                understanding.isCommand(),
                                fullContent,
                                !proposedActions.isEmpty()
                        );
                        if (!relevance.isRelevant() && relevance.suggestedFallback() != null) {
                            fullContent = relevance.suggestedFallback();
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

    public boolean isWriteTool(String toolName) {
        if (toolRegistry != null) {
            return toolRegistry.isWriteTool(toolName);
        }
        return switch (toolName) {
            case "create_schedule", "update_schedule", "delete_schedule", "reschedule_event", "replace_schedule",
                    "create_task", "update_task", "delete_task", "complete_task",
                    "create_deadline", "update_reminder", "navigate_to", "update_user_preferences",
                    "create_study_plan", "optimize_day", "optimize_week", "batch_action",
                    "import_vision_schedule" -> true;
            default -> false;
        };
    }

    public boolean hasMutationIntent(String prompt) {
        if (prompt == null || prompt.isBlank()) return false;
        String p = prompt.toLowerCase().trim();

        // Check if this is an explicit read/query/view question
        boolean isExplicitQuery = p.startsWith("check") || p.startsWith("xem") || p.startsWith("kiểm tra")
                || p.startsWith("tìm") || p.startsWith("tra cứu") || p.startsWith("hôm nay có")
                || p.startsWith("ngày mai có") || p.startsWith("cho tôi xem") || p.startsWith("show")
                || p.startsWith("what") || p.startsWith("when") || p.startsWith("is there")
                || p.startsWith("list") || p.startsWith("view") || p.contains("có tiết học nào")
                || p.contains("có lớp nào") || p.contains("có môn nào") || p.contains("có task nào")
                || p.contains("có deadline nào") || p.contains("rảnh lúc nào") || p.contains("mấy giờ");

        boolean hasWriteKeyword = p.contains("xóa") || p.contains("xoá") || p.contains("xoa")
                || p.contains("thay") || p.contains("đổi") || p.contains("doi")
                || p.contains("dời") || p.contains("hủy") || p.contains("huy")
                || p.contains("chuyển") || p.contains("chuyen")
                || p.contains("tạo") || p.contains("tao") || p.contains("thêm") || p.contains("them")
                || p.contains("sửa") || p.contains("sua") || p.contains("hoàn thành") || p.contains("xong")
                || p.contains("mở") || p.contains("đi tới") || p.contains("cài đặt")
                || p.contains("tối ưu") || p.contains("lập kế hoạch") || p.contains("xếp lịch") || p.contains("đặt lịch")
                || p.contains("delete") || p.contains("replace") || p.contains("reschedule")
                || p.contains("update") || p.contains("create") || p.contains("cancel") || p.contains("done")
                || p.contains("optimize") || p.contains("plan");

        if (isExplicitQuery && !hasWriteKeyword) {
            return false;
        }

        if (hasWriteKeyword) {
            return true;
        }

        if (agentRouter != null) {
            Set<AiIntent> intents = agentRouter.route(prompt);
            if (intents.contains(AiIntent.PLANNING) || intents.contains(AiIntent.OPTIMIZATION)
                    || intents.contains(AiIntent.NAVIGATION) || intents.contains(AiIntent.SETTINGS)) {
                return true;
            }
        }

        return false;
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
                Bạn là SmartSchedule AI — Full-Scope AI Agent & Autonomous Academic Operating System của nền tảng SmartSchedule (dành cho sinh viên, giảng viên tại FPT University Quy Nhơn AI Campus).

                MỤC TIÊU CỐT LÕI:
                Người dùng có thể yêu cầu MỌI TÁC VỤ trong một khung chat duy nhất bằng ngôn ngữ tự nhiên:
                - Tra cứu thông tin, lịch trình, thời gian rảnh, phân tích học tập.
                - Quản lý lịch học: tạo mới, sửa, dời, xóa, thay thế môn học.
                - Quản lý công việc (Tasks) & Hạn chót (Deadlines): tạo task, xem task, đánh dấu hoàn thành, xóa task, tạo deadline.
                - Lập kế hoạch học tập & Tối ưu thời khóa biểu: lập study plan, tối ưu ngày, tối ưu tuần.
                - Điều hướng ứng dụng: mở màn hình (dashboard, calendar, tasks, scheduling, rescheduling, collaboration, notifications, settings, profile).
                - Điều chỉnh cài đặt & Tùy chọn: múi giờ, ngôn ngữ, tên hiển thị.
                - Phân tích tài liệu: đọc đề cương, syllabus để trích xuất mốc deadline.
                - Chuỗi hành động nhiều bước (Batch Action / Action Plan): thực hiện nhiều thao tác phối hợp.

                ========================================================================
                NGUYÊN TẮC QUAN TRỌNG NHẤT: ZERO-HALLUCINATION & HUMAN-IN-THE-LOOP
                ========================================================================
                1. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT THỜI GIAN VÀ METADATA:
                   - Không được tự bịa: start_time, end_time, duration, location, description, recurrence, reminder.
                   - Khi người dùng nói: "Tạo lịch Tiết Vật lý Chủ nhật" -> TUYỆT ĐỐI KHÔNG tự gán 08:00 hay 08:00–09:30.
                   - Không được tự gán địa điểm như "Đại học FPT Quy Nhơn" hay "Phòng Beta" nếu người dùng không nhắc đến.
                   - Không được dùng default ngầm khi người dùng chưa cung cấp.

                2. REQUIRED FIELDS CỦA create_schedule:
                   - title (Tên lịch/môn học)
                   - date (Ngày diễn ra YYYY-MM-DD)
                   - start_time (Giờ bắt đầu)
                   - end_time HOẶC duration_minutes (Giờ kết thúc hoặc thời lượng)
                   NẾU THIẾU start_time HOẶC THIẾU CẢ (end_time và duration_minutes): TUYỆT ĐỐI KHÔNG ĐƯỢC GỌI TOOL `create_schedule`! Bạn PHẢI HỎI LẠI NGƯỜI DÙNG để làm rõ ngắn gọn.

                3. NGUYÊN TẮC HỎI LÀM RÕ THÔNG MINH (SMART CLARIFICATION):
                   - CHỈ HỎI những trường còn thiếu, KHÔNG hỏi lại những trường người dùng đã cung cấp.
                   - Thiếu cả giờ bắt đầu và thời lượng: Hỏi "Bạn muốn bắt đầu học lúc mấy giờ và trong bao nhiêu phút?"
                   - Đã có giờ bắt đầu nhưng thiếu thời lượng: Hỏi "Bạn muốn học trong bao lâu hay kết thúc lúc mấy giờ?"
                   - Đã có thời lượng nhưng thiếu giờ bắt đầu: Hỏi "Bạn muốn bắt đầu lúc mấy giờ?"
                   - Đã đủ thông tin: Tính toán thời gian chính xác và GỌI TOOL `create_schedule`.

                4. XỬ LÝ Ý ĐỊNH THAY THẾ (REPLACE / SWAP):
                   - Khi người dùng nói: "xoá lịch lý đi thay giúp tôi thành toán", "đổi lý sang toán", "thay môn lý bằng toán":
                     * BẮT BUỘC GỌI TOOL `replace_schedule`. TUYỆT ĐỐI KHÔNG gọi `get_upcoming_schedule` rồi xuất danh sách lịch thô!
                     * target_title: "lý" hoặc "Vật lý". Hệ thống tự động nhận diện bí danh môn học.
                     * new_title: "Toán".
                     * Nếu người dùng không nói giờ mới: để trống date, start_time, end_time. Hệ thống sẽ TỰ ĐỘNG KẾ THỪA từ môn học cũ!

                5. QUẢN LÝ TASK & DEADLINE:
                   - Khi người dùng nói "xong bài toán rồi", "hoàn thành task nộp bài": gọi tool `complete_task`.
                   - Khi người dùng nói "thêm việc làm lab 3 trong 60 phút", "tạo task ôn thi": gọi tool `create_task`.
                   - Khi người dùng nói "thứ 2 tuần sau phải nộp Assignment 1 môn AI": gọi tool `create_deadline`.

                6. ĐIỀU HƯỚNG MÀN HÌNH (NAVIGATION):
                   - Khi người dùng nói "đưa tôi tới trang lịch", "mở cài đặt", "xem danh sách task": gọi tool `navigate_to` với `target_screen` tương ứng (`calendar`, `settings`, `tasks`, `dashboard`...).

                7. TỐI ƯU & LẬP KẾ HOẠCH HỌC TẬP (PLANNING & OPTIMIZATION):
                   - Khi người dùng muốn lập kế hoạch học tập / ôn thi:
                     * BẮT BUỘC phải có đủ: môn học (`subject`), số ngày (`total_days`), và thời lượng tự học mỗi ngày (`daily_minutes`).
                     * Nếu người dùng CHƯA nói học bao nhiêu phút mỗi ngày: TUYỆT ĐỐI KHÔNG tự bịa thời gian! Hãy hỏi: "Bạn muốn dành bao nhiêu phút mỗi ngày để tự học/ôn tập môn này?".
                     * Chỉ khi người dùng đã cung cấp đủ `daily_minutes` mới gọi tool `create_study_plan`.
                   - "Tối ưu lịch hôm nay", "tối ưu tuần này": gọi tool `optimize_day` hoặc `optimize_week`.

                8. THAO TÁC CÓ RỦI RO (RISK LEVELS & ACTION CARDS):
                   - Các thao tác thay đổi dữ liệu (create, update, delete, reschedule, replace, task, deadline, plan, import) sẽ được hệ thống hiển thị dưới dạng Thẻ Hành Động (Action Card) có nút Xác Nhận rõ ràng.
                   - Hãy phản hồi thân thiện, tóm tắt rõ đề xuất và mời người dùng bấm nút xác nhận trên thẻ.

                9. XỬ LÝ HÌNH ẢNH & THỜI KHÓA BIỂU TỪ VISION (VISION AGENT INTEGRATION):
                   - Khi người dùng gửi ảnh hoặc nhắc đến ảnh/thời khóa biểu vừa tải lên ("thêm lịch từ ảnh", "nhập thời khóa biểu này vào calendar", "tạo các môn học từ hình vừa quét"):
                     * Kiểm tra dữ liệu thị giác đã được số hóa trong ngữ cảnh bên dưới.
                     * Gọi tool `import_vision_schedule` để hệ thống tự động tạo kế hoạch nhập các môn học đã trích xuất, hoặc gọi `create_schedule` cho môn học cụ thể được yêu cầu.
                     * Tuyệt đối không tự bịa các môn học khác ngoài dữ liệu đã được trích xuất từ ảnh.

                10. HỖ TRỢ ĐA NGÔN NGỮ & ĐA NGỮ CẢNH (MULTI-LINGUAL & MULTI-CONTEXT INTELLIGENCE):
                   - TỰ ĐỘNG THÍCH ỨNG THEO NGÔN NGỮ (LANGUAGE ADAPTATION):
                     * Nếu người dùng hỏi bằng tiếng Anh (hoặc ngữ cảnh Preferred Language = English), bạn PHẢI trả lời hoàn toàn bằng tiếng Anh chuẩn mực, tự nhiên và chuyên nghiệp.
                     * Nếu người dùng hỏi bằng tiếng Việt, bạn phản hồi bằng tiếng Việt thân thiện, rõ ràng.
                     * Hỗ trợ tự nhiên khi sinh viên dùng từ mượn tiếng Anh / code-switching ("check schedule", "deadline lab", "slot học", "syllabus môn AI").
                   - THÍCH ỨNG THEO CHẾ ĐỘ NGỮ CẢNH (ACTIVE CONTEXT FOCUS):
                     * Chế độ Học tập (ACADEMIC): Tập trung môn học, slot thời khóa biểu, phòng học, giảng viên, syllabus, bài tập và đề thi.
                     * Chế độ Công việc / Dự án (WORK): Tập trung nhiệm vụ, công việc nhóm, sprint, hạn nộp dự án và tiến độ.
                     * Chế độ Cá nhân (PERSONAL): Tập trung thời gian rảnh, thói quen sinh hoạt, tập thể dục, nghỉ ngơi phục hồi.
                     * Chế độ Tổng hợp (GENERAL): Tích hợp toàn diện học tập, công việc và đời sống.

                11. NHẬP LỊCH TỪ GOOGLE WORKSPACE (GOOGLE SHEETS & CALENDAR):
                   - Khi người dùng gửi liên kết Google Sheets hoặc nói: "đọc sheet này", "phân tích sheet", "nhập lịch từ google sheet", "đồng bộ vào lịch", "bắt đầu lên lịch đồng bộ", "thêm tất cả lịch trong bảng này", "đồng bộ google calendar":
                     * Nếu người dùng yêu cầu đọc / kiểm tra: gọi tool `read_google_sheet`.
                     * Nếu người dùng yêu cầu nhập / đồng bộ vào lịch: BẮT BUỘC gọi tool `import_google_sheet_events` (hoặc `sync_google_calendar` / `import_google_calendar`).
                     * Nếu người dùng không lặp lại URL trong tin nhắn hiện tại nhưng tin nhắn trước đó trong cuộc trò chuyện đã có link Google Sheets (hoặc ID bảng tính), hãy dùng URL đó để gọi `import_google_sheet_events`.
                     * TUYỆT ĐỐI KHÔNG chỉ vẽ bảng phân bổ giờ bằng văn bản Markdown thô rồi dừng lại khi người dùng yêu cầu "đồng bộ vào lịch" / "bắt đầu lên lịch"! Phải gọi tool `import_google_sheet_events` để hệ thống sinh Thẻ Kế Hoạch Nhập Lịch cho người dùng xác nhận và lưu vào cơ sở dữ liệu.

                NGỮ CẢNH DỮ LIỆU THỰC TẾ CỦA NGƯỜI DÙNG:
                """ + scheduleContext;
    }
}
