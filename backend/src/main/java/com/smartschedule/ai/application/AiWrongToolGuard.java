package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * Intercepts and rejects incorrect tool calls where the model attempts
 * to substitute an action (delete, replace, sync, create) with a read-only query.
 */
@Service
public class AiWrongToolGuard {

    private static final Set<String> READ_ONLY_TOOLS = Set.of(
            "get_today_schedule",
            "get_week_schedule",
            "get_upcoming_schedule",
            "search_schedule",
            "find_free_time",
            "get_day_analytics",
            "get_week_analytics"
    );

    public record ToolValidation(
            boolean isValid,
            String reason,
            String suggestedTool
    ) {}

    public ToolValidation validate(String detectedIntent, String toolName, Map<String, Object> arguments) {
        if (detectedIntent == null || toolName == null) {
            return new ToolValidation(true, "No intent or tool to validate", null);
        }

        // 1. User wants to DELETE / REMOVE, but model called a read-only tool
        if ("DELETE_SCHEDULE".equals(detectedIntent) && READ_ONLY_TOOLS.contains(toolName)) {
            return new ToolValidation(false,
                    "Người dùng yêu cầu xóa môn học nhưng model lại gọi tool đọc dữ liệu: " + toolName,
                    "delete_schedule");
        }

        // 2. User wants to REPLACE / SWAP, but model called a read-only tool
        if ("REPLACE_SCHEDULE".equals(detectedIntent) && READ_ONLY_TOOLS.contains(toolName)) {
            return new ToolValidation(false,
                    "Người dùng yêu cầu thay đổi/đổi môn nhưng model lại gọi tool đọc dữ liệu: " + toolName,
                    "replace_schedule");
        }

        // 3. User wants to SYNC / IMPORT, but model called a read-only tool
        if ("SYNC_GOOGLE_CALENDAR".equals(detectedIntent) && (READ_ONLY_TOOLS.contains(toolName) || "read_google_sheet".equals(toolName))) {
            return new ToolValidation(false,
                    "Người dùng yêu cầu đồng bộ Google Calendar nhưng model lại gọi tool: " + toolName,
                    "sync_google_calendar");
        }

        if ("IMPORT_GOOGLE_SHEETS".equals(detectedIntent) && READ_ONLY_TOOLS.contains(toolName)) {
            return new ToolValidation(false,
                    "Người dùng yêu cầu nhập dữ liệu Google Sheets vào lịch nhưng model lại gọi tool: " + toolName,
                    "import_google_sheet_events");
        }

        // 4. User asked for HELP, but model attempted a write mutation
        if ("HELP".equals(detectedIntent) && !READ_ONLY_TOOLS.contains(toolName)) {
            return new ToolValidation(false,
                    "Người dùng hỏi hướng dẫn cách dùng nhưng model lại gọi tool thay đổi dữ liệu: " + toolName,
                    null);
        }

        return new ToolValidation(true, "Tool phù hợp với ý định", toolName);
    }
}
