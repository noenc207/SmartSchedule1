package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Evaluates semantic understanding confidence (HIGH, MEDIUM, LOW) across
 * intent, entities, and required parameters to decide whether to execute,
 * recover, or ask a clarification question.
 */
@Service
public class AiConfidenceEngine {

    public enum ConfidenceLevel {
        HIGH,
        MEDIUM,
        LOW
    }

    public record ConfidenceAssessment(
            ConfidenceLevel intentConfidence,
            ConfidenceLevel entityConfidence,
            ConfidenceLevel parameterConfidence,
            ConfidenceLevel overallConfidence,
            String explanation
    ) {
        public boolean isHigh() {
            return overallConfidence == ConfidenceLevel.HIGH;
        }

        public boolean isMedium() {
            return overallConfidence == ConfidenceLevel.MEDIUM;
        }

        public boolean isLow() {
            return overallConfidence == ConfidenceLevel.LOW;
        }
    }

    public ConfidenceAssessment evaluate(
            String intent,
            Map<String, Object> entities,
            List<String> missingFields,
            boolean isAmbiguousReference,
            boolean wasRepaired
    ) {
        ConfidenceLevel intentConf = (intent != null && !intent.isBlank()) ? ConfidenceLevel.HIGH : ConfidenceLevel.LOW;
        ConfidenceLevel entityConf = ConfidenceLevel.HIGH;
        ConfidenceLevel paramConf = ConfidenceLevel.HIGH;

        StringBuilder explanation = new StringBuilder();

        // 1. Missing required parameters
        if (missingFields != null && !missingFields.isEmpty()) {
            paramConf = ConfidenceLevel.LOW;
            explanation.append("Thiếu trường bắt buộc: ").append(String.join(", ", missingFields)).append(". ");
        }

        // 2. Ambiguous entity or pronoun reference
        if (isAmbiguousReference) {
            entityConf = ConfidenceLevel.LOW;
            explanation.append("Tham chiếu đối tượng mơ hồ hoặc không xác định được đích. ");
        } else if (entities == null || entities.isEmpty()) {
            if ("CREATE_SCHEDULE".equals(intent) || "REPLACE_SCHEDULE".equals(intent) || "DELETE_SCHEDULE".equals(intent)) {
                entityConf = ConfidenceLevel.LOW;
                explanation.append("Chưa nhận diện được thực thể môn học/đối tượng cần thao tác. ");
            }
        } else if (wasRepaired) {
            entityConf = ConfidenceLevel.MEDIUM;
            explanation.append("Thực thể được phân giải qua quy tắc sửa lỗi/khẩu ngữ. ");
        }

        // Overall calculation
        ConfidenceLevel overall;
        if (paramConf == ConfidenceLevel.LOW || entityConf == ConfidenceLevel.LOW || intentConf == ConfidenceLevel.LOW) {
            overall = ConfidenceLevel.LOW;
        } else if (paramConf == ConfidenceLevel.MEDIUM || entityConf == ConfidenceLevel.MEDIUM) {
            overall = ConfidenceLevel.MEDIUM;
        } else {
            overall = ConfidenceLevel.HIGH;
        }

        if (explanation.isEmpty()) {
            explanation.append("Đầy đủ thông tin, độ tin cậy cao.");
        }

        return new ConfidenceAssessment(intentConf, entityConf, paramConf, overall, explanation.toString().trim());
    }
}
