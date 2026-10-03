package com.smartschedule.ai.application;

import com.smartschedule.ai.domain.RiskLevel;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class AiRiskEngine {

    private static final Set<String> HIGH_RISK_TOOLS = Set.of(
            "delete_account",
            "reset_all_data",
            "wipe_database",
            "delete_all_schedules",
            "export_private_keys"
    );

    private static final Set<String> LOW_WRITE_TOOLS = Set.of(
            "complete_task",
            "navigate_to",
            "update_user_preferences"
    );

    private static final Set<String> IMPORTANT_WRITE_TOOLS = Set.of(
            "create_schedule",
            "update_schedule",
            "delete_schedule",
            "reschedule_event",
            "replace_schedule",
            "create_task",
            "update_task",
            "delete_task",
            "create_deadline",
            "update_reminder",
            "create_study_plan",
            "optimize_day",
            "optimize_week",
            "batch_action",
            "import_vision_schedule"
    );

    public RiskLevel getRiskLevel(String toolName) {
        if (toolName == null || toolName.isBlank()) {
            return RiskLevel.READ;
        }
        String tool = toolName.toLowerCase().trim();
        if (HIGH_RISK_TOOLS.contains(tool)) {
            return RiskLevel.HIGH_RISK;
        }
        if (LOW_WRITE_TOOLS.contains(tool)) {
            return RiskLevel.LOW_WRITE;
        }
        if (IMPORTANT_WRITE_TOOLS.contains(tool)) {
            return RiskLevel.IMPORTANT_WRITE;
        }
        return RiskLevel.READ;
    }

    public boolean isHighRisk(String toolName) {
        return getRiskLevel(toolName) == RiskLevel.HIGH_RISK;
    }

    public boolean requiresConfirmation(String toolName) {
        RiskLevel level = getRiskLevel(toolName);
        return level == RiskLevel.IMPORTANT_WRITE || level == RiskLevel.HIGH_RISK;
    }

    public void enforcePolicy(String toolName, Map<String, Object> arguments) {
        if (isHighRisk(toolName)) {
            throw new AiException("HIGH_RISK_ACTION_BLOCKED",
                    "Thao tác nguy hiểm cao (" + toolName + ") bị vô hiệu hóa qua AI vì lý do bảo mật. Vui lòng thực hiện thủ công trong Cài đặt bảo mật hệ thống.");
        }
    }
}
