package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Validates that final assistant responses match user intent,
 * and rejects empty/generic acknowledgements ("Tôi đã ghi nhận...") when a command was given.
 */
@Service
public class AiResponseRelevanceValidator {

    private static final List<String> FORBIDDEN_GENERIC_PHRASES = List.of(
            "tôi đã ghi nhận câu hỏi",
            "tôi đã ghi nhận yêu cầu",
            "tôi đã ghi nhận",
            "tôi hiểu rồi",
            "dưới đây là lịch của bạn",
            "lịch trình 7 ngày tới"
    );

    public record RelevanceAssessment(
            boolean isRelevant,
            boolean isNoOpViolation,
            String suggestedFallback
    ) {}

    public RelevanceAssessment validate(
            String detectedIntent,
            boolean isCommand,
            String responseContent,
            boolean hasProposedActions
    ) {
        if (responseContent == null) {
            responseContent = "";
        }
        String lower = responseContent.trim().toLowerCase();

        // 1. No-Op Guard: Command given, but no proposed action card, and response is generic acknowledgement
        if (isCommand && !hasProposedActions) {
            for (String forbidden : FORBIDDEN_GENERIC_PHRASES) {
                if (lower.contains(forbidden)) {
                    String fallback;
                    if ("DELETE_SCHEDULE".equals(detectedIntent)) {
                        fallback = "Tôi chưa rõ bạn muốn xóa lịch cụ thể nào. Bạn có thể cho tôi biết tên môn học hoặc chọn một sự kiện trên lịch nhé!";
                    } else if ("SYNC_GOOGLE_CALENDAR".equals(detectedIntent)) {
                        fallback = "Bạn có muốn tôi đồng bộ toàn bộ sự kiện từ Google Calendar vào SmartSchedule không?";
                    } else if ("REPLACE_SCHEDULE".equals(detectedIntent)) {
                        fallback = "Bạn muốn thay thế bằng môn học nào và giữ nguyên giờ học cũ đúng không?";
                    } else {
                        fallback = "Vui lòng cho tôi biết thêm thông tin cụ thể để tôi thực hiện thao tác này giúp bạn.";
                    }
                    return new RelevanceAssessment(false, true, fallback);
                }
            }
        }

        // 2. Schedule dump when Sync or Delete was requested
        if (("SYNC_GOOGLE_CALENDAR".equals(detectedIntent) || "DELETE_SCHEDULE".equals(detectedIntent))
                && !hasProposedActions && (lower.contains("lịch 7 ngày tới") || lower.contains("tiết học sắp tới"))) {
            return new RelevanceAssessment(false, false,
                    "SYNC_GOOGLE_CALENDAR".equals(detectedIntent)
                            ? "Bạn muốn kết nối và đồng bộ sự kiện từ Google Calendar đúng không?"
                            : "Bạn muốn xóa sự kiện nào trong danh sách trên?");
        }

        return new RelevanceAssessment(true, false, responseContent);
    }
}
