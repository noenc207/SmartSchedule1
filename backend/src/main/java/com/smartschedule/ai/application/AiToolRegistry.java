package com.smartschedule.ai.application;

import com.smartschedule.ai.domain.AiIntent;
import com.smartschedule.ai.domain.RiskLevel;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AiToolRegistry {

    public record ToolDefinition(
            String name,
            String description,
            AiIntent category,
            RiskLevel riskLevel,
            Map<String, Object> schema
    ) {}

    private final Map<String, ToolDefinition> tools = new LinkedHashMap<>();

    public AiToolRegistry() {
        registerTools();
    }

    private void registerTools() {
        // =========================================================================
        // 1. READ TOOLS
        // =========================================================================
        register(new ToolDefinition(
                "get_today_schedule",
                "Xem toàn bộ lịch học, sự kiện hoặc phiên ôn tập diễn ra trong ngày hôm nay của người dùng.",
                AiIntent.QUERY,
                RiskLevel.READ,
                Map.of("type", "OBJECT", "properties", Map.of())
        ));

        register(new ToolDefinition(
                "get_week_schedule",
                "Xem danh sách các sự kiện/tiết học diễn ra trong 7 ngày tới (hoặc số ngày chỉ định).",
                AiIntent.QUERY,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "days", Map.of("type", "INTEGER", "description", "Số ngày cần xem tới (mặc định 7)")
                        )
                )
        ));

        register(new ToolDefinition(
                "find_free_time",
                "Tìm kiếm các khoảng thời gian trống (free slots) trong ngày của người dùng để sắp xếp việc tự học.",
                AiIntent.QUERY,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "date", Map.of("type", "STRING", "description", "Ngày cần tìm giờ rảnh định dạng YYYY-MM-DD"),
                                "duration_minutes", Map.of("type", "INTEGER", "description", "Thời lượng cần tìm tính theo phút (ví dụ 60, 120)")
                        )
                )
        ));

        register(new ToolDefinition(
                "check_schedule_conflict",
                "Kiểm tra xem một khung thời gian cụ thể có bị trùng lịch hoặc xung đột với các sự kiện hiện có không.",
                AiIntent.QUERY,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu (ISO 8601 hoặc YYYY-MM-DDTHH:mm hoặc HH:mm)"),
                                "end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc (ISO 8601 hoặc YYYY-MM-DDTHH:mm hoặc HH:mm)"),
                                "exclude_event_id", Map.of("type", "STRING", "description", "ID sự kiện bỏ qua khi kiểm tra trùng")
                        ),
                        "required", List.of("start_time", "end_time")
                )
        ));

        register(new ToolDefinition(
                "get_schedule_details",
                "Tra cứu thông tin chi tiết của một sự kiện/tiết học theo tên hoặc mã ID.",
                AiIntent.QUERY,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "event_id_or_title", Map.of("type", "STRING", "description", "Tên sự kiện hoặc ID sự kiện cần tra cứu")
                        ),
                        "required", List.of("event_id_or_title")
                )
        ));

        register(new ToolDefinition(
                "search_schedule",
                "Tìm kiếm các sự kiện, môn học, lịch trình theo từ khóa hoặc chủ đề.",
                AiIntent.SEARCH,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "query", Map.of("type", "STRING", "description", "Từ khóa cần tìm kiếm (ví dụ: Physics, Toán, Thi)")
                        ),
                        "required", List.of("query")
                )
        ));

        register(new ToolDefinition(
                "get_tasks",
                "Lấy danh sách các công việc/task cần làm của người dùng, phân loại theo trạng thái (TODO, IN_PROGRESS, COMPLETED).",
                AiIntent.TASK,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "status", Map.of("type", "STRING", "description", "Lọc theo trạng thái: TODO, IN_PROGRESS, COMPLETED hoặc ALL")
                        )
                )
        ));

        register(new ToolDefinition(
                "get_deadlines",
                "Xem danh sách các deadline, hạn nộp bài tập sắp đến hạn, sắp xếp theo mức độ cấp bách.",
                AiIntent.DEADLINE,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "days", Map.of("type", "INTEGER", "description", "Số ngày sắp tới cần lọc deadline (mặc định 14 ngày)")
                        )
                )
        ));

        register(new ToolDefinition(
                "get_user_preferences",
                "Lấy thông tin cài đặt cá nhân của người dùng như múi giờ, ngôn ngữ, tên hiển thị và hạng tài khoản.",
                AiIntent.SETTINGS,
                RiskLevel.READ,
                Map.of("type", "OBJECT", "properties", Map.of())
        ));

        register(new ToolDefinition(
                "get_analytics_summary",
                "Thống kê tổng số giờ học, thời gian rảnh, tỷ lệ hoàn thành công việc trong tuần này.",
                AiIntent.ANALYTICS,
                RiskLevel.READ,
                Map.of("type", "OBJECT", "properties", Map.of())
        ));

        register(new ToolDefinition(
                "analyze_document",
                "Đọc và phân tích văn bản syllabus, đề cương môn học hoặc tài liệu học tập để trích xuất danh sách deadline và lịch kiểm tra.",
                AiIntent.DOCUMENT,
                RiskLevel.READ,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "document_text", Map.of("type", "STRING", "description", "Nội dung văn bản syllabus/đề cương cần phân tích")
                        ),
                        "required", List.of("document_text")
                )
        ));

        // =========================================================================
        // 2. LOW_WRITE TOOLS (Safe client/state mutations)
        // =========================================================================
        register(new ToolDefinition(
                "navigate_to",
                "Điều hướng người dùng đến đúng màn hình trong ứng dụng SmartSchedule (chỉ được điều hướng trong danh sách route hợp lệ).",
                AiIntent.NAVIGATION,
                RiskLevel.LOW_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "target_screen", Map.of("type", "STRING", "description", "Màn hình đích: dashboard, calendar, tasks, deadlines, scheduling, rescheduling, collaboration, notifications, settings, profile")
                        ),
                        "required", List.of("target_screen")
                )
        ));

        register(new ToolDefinition(
                "complete_task",
                "Đánh dấu một công việc/task là đã hoàn thành.",
                AiIntent.TASK,
                RiskLevel.LOW_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "task_id_or_title", Map.of("type", "STRING", "description", "ID hoặc tên công việc cần hoàn thành")
                        ),
                        "required", List.of("task_id_or_title")
                )
        ));

        register(new ToolDefinition(
                "update_user_preferences",
                "Cập nhật các tùy chọn người dùng như múi giờ hiển thị (timezone) hoặc ngôn ngữ.",
                AiIntent.SETTINGS,
                RiskLevel.LOW_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "timezone", Map.of("type", "STRING", "description", "Múi giờ IANA chuẩn (ví dụ: Asia/Ho_Chi_Minh, Asia/Tokyo)"),
                                "display_name", Map.of("type", "STRING", "description", "Tên hiển thị mới")
                        )
                )
        ));

        // =========================================================================
        // 3. IMPORTANT_WRITE TOOLS (Requires user confirmation card)
        // =========================================================================
        register(new ToolDefinition(
                "create_schedule",
                "Đề xuất tạo mới một sự kiện/lịch học/lịch ôn tập trên thời khóa biểu. CHỈ GỌI CÔNG CỤ NÀY khi người dùng ĐÃ CUNG CẤP ĐỦ: tên sự kiện, ngày diễn ra, giờ bắt đầu và thời lượng (hoặc giờ kết thúc).",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "title", Map.of("type", "STRING", "description", "Tên môn học hoặc sự kiện (ví dụ: Physics, Ôn thi Giải tích)"),
                                "date", Map.of("type", "STRING", "description", "Ngày diễn ra định dạng YYYY-MM-DD"),
                                "start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu (ví dụ: 08:00, 14:30)"),
                                "end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc (ví dụ: 09:30, 16:00)"),
                                "duration_minutes", Map.of("type", "INTEGER", "description", "Thời lượng bằng phút (ví dụ: 60, 90, 120)"),
                                "location", Map.of("type", "STRING", "description", "Địa điểm hoặc phòng học nếu người dùng đã đề cập"),
                                "description", Map.of("type", "STRING", "description", "Ghi chú nếu người dùng đã đề cập")
                        ),
                        "required", List.of("title", "date", "start_time")
                )
        ));

        register(new ToolDefinition(
                "update_schedule",
                "Đề xuất cập nhật tiêu đề, giờ học hoặc địa điểm của một sự kiện/tiết học hiện có.",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần cập nhật"),
                                "title", Map.of("type", "STRING", "description", "Tên sự kiện hoặc tiêu đề mới"),
                                "start_time", Map.of("type", "STRING", "description", "Giờ bắt đầu mới HH:mm"),
                                "end_time", Map.of("type", "STRING", "description", "Giờ kết thúc mới HH:mm"),
                                "location", Map.of("type", "STRING", "description", "Địa điểm mới"),
                                "description", Map.of("type", "STRING", "description", "Mô tả mới")
                        ),
                        "required", List.of("title")
                )
        ));

        register(new ToolDefinition(
                "delete_schedule",
                "Đề xuất xóa một sự kiện/lịch học khỏi thời khóa biểu.",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần xóa"),
                                "title", Map.of("type", "STRING", "description", "Tên môn học/sự kiện cần xóa (hệ thống tự tìm kiếm nếu không có ID)")
                        ),
                        "required", List.of("title")
                )
        ));

        register(new ToolDefinition(
                "reschedule_event",
                "Đề xuất dời lịch một sự kiện sang ngày hoặc giờ mới.",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần dời"),
                                "title", Map.of("type", "STRING", "description", "Tên sự kiện cần dời"),
                                "date", Map.of("type", "STRING", "description", "Ngày mới YYYY-MM-DD"),
                                "new_start_time", Map.of("type", "STRING", "description", "Giờ bắt đầu mới HH:mm"),
                                "new_end_time", Map.of("type", "STRING", "description", "Giờ kết thúc mới HH:mm")
                        ),
                        "required", List.of("title", "new_start_time")
                )
        ));

        register(new ToolDefinition(
                "replace_schedule",
                "Đề xuất thay thế một lịch học/môn học cũ bằng một môn học mới (ví dụ: xoá lý thay thành toán).",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "target_title", Map.of("type", "STRING", "description", "Tên môn học hoặc sự kiện cần thay thế"),
                                "new_title", Map.of("type", "STRING", "description", "Tên môn học hoặc sự kiện mới thay thế"),
                                "date", Map.of("type", "STRING", "description", "Ngày mới nếu muốn đổi ngày"),
                                "start_time", Map.of("type", "STRING", "description", "Giờ bắt đầu mới nếu muốn đổi giờ"),
                                "end_time", Map.of("type", "STRING", "description", "Giờ kết thúc mới nếu muốn đổi giờ"),
                                "duration_minutes", Map.of("type", "INTEGER", "description", "Thời lượng mới")
                        ),
                        "required", List.of("target_title", "new_title")
                )
        ));

        register(new ToolDefinition(
                "create_task",
                "Đề xuất tạo mới một công việc cần làm (Task) có ước lượng thời gian và hạn nộp.",
                AiIntent.TASK,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "title", Map.of("type", "STRING", "description", "Tên công việc cần làm (ví dụ: Làm bài tập Physics ch 3)"),
                                "estimated_minutes", Map.of("type", "INTEGER", "description", "Thời gian ước tính hoàn thành (phút)"),
                                "priority", Map.of("type", "STRING", "description", "Độ ưu tiên: LOW, MEDIUM, HIGH, URGENT"),
                                "deadline", Map.of("type", "STRING", "description", "Hạn chót hoàn thành (ISO 8601 hoặc YYYY-MM-DDTHH:mm)"),
                                "description", Map.of("type", "STRING", "description", "Mô tả chi tiết công việc")
                        ),
                        "required", List.of("title")
                )
        ));

        register(new ToolDefinition(
                "update_task",
                "Đề xuất cập nhật thông tin công việc (Task).",
                AiIntent.TASK,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "task_id_or_title", Map.of("type", "STRING", "description", "ID hoặc tên công việc cần sửa"),
                                "new_title", Map.of("type", "STRING", "description", "Tiêu đề mới"),
                                "priority", Map.of("type", "STRING", "description", "Độ ưu tiên mới: LOW, MEDIUM, HIGH, URGENT"),
                                "deadline", Map.of("type", "STRING", "description", "Hạn chót mới"),
                                "status", Map.of("type", "STRING", "description", "Trạng thái mới: TODO, IN_PROGRESS, COMPLETED")
                        ),
                        "required", List.of("task_id_or_title")
                )
        ));

        register(new ToolDefinition(
                "delete_task",
                "Đề xuất xóa một công việc khỏi danh sách task.",
                AiIntent.TASK,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "task_id_or_title", Map.of("type", "STRING", "description", "ID hoặc tên công việc cần xóa")
                        ),
                        "required", List.of("task_id_or_title")
                )
        ));

        register(new ToolDefinition(
                "create_deadline",
                "Đề xuất tạo mới một hạn chót / deadline quan trọng.",
                AiIntent.DEADLINE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "title", Map.of("type", "STRING", "description", "Tên bài tập hoặc đồ án (ví dụ: Nộp Assignment 1)"),
                                "deadline", Map.of("type", "STRING", "description", "Thời điểm hạn nộp (YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD HH:mm)"),
                                "priority", Map.of("type", "STRING", "description", "Độ ưu tiên (mặc định HIGH hoặc URGENT)"),
                                "description", Map.of("type", "STRING", "description", "Mô tả yêu cầu nộp bài")
                        ),
                        "required", List.of("title", "deadline")
                )
        ));

        register(new ToolDefinition(
                "update_reminder",
                "Cập nhật thời gian nhắc nhở (reminder) cho một lịch học hoặc sự kiện.",
                AiIntent.REMINDER,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "event_title", Map.of("type", "STRING", "description", "Tên sự kiện cần chỉnh nhắc nhở"),
                                "reminder_minutes", Map.of("type", "INTEGER", "description", "Số phút nhắc trước sự kiện (ví dụ: 15, 30, 60)")
                        ),
                        "required", List.of("event_title", "reminder_minutes")
                )
        ));

        register(new ToolDefinition(
                "create_study_plan",
                "Đề xuất lập kế hoạch học tập/ôn thi gồm chuỗi nhiều phiên học trong nhiều ngày. CHỈ GỌI CÔNG CỤ NÀY khi người dùng đã cung cấp đủ: môn học, số ngày, và thời gian học mỗi ngày (daily_minutes).",
                AiIntent.PLANNING,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "subject", Map.of("type", "STRING", "description", "Môn học hoặc kỳ thi cần lập kế hoạch (ví dụ: Ôn thi Physics)"),
                                "total_days", Map.of("type", "INTEGER", "description", "Tổng số ngày trong kế hoạch ôn tập (ví dụ: 10)"),
                                "daily_minutes", Map.of("type", "INTEGER", "description", "Thời gian tự học mỗi ngày tính bằng phút (ví dụ: 90)"),
                                "preferred_time", Map.of("type", "STRING", "description", "Khung giờ ưu tiên: morning (sáng), afternoon (chiều), evening (tối)")
                        ),
                        "required", List.of("subject", "total_days", "daily_minutes")
                )
        ));

        register(new ToolDefinition(
                "optimize_day",
                "Đề xuất tối ưu hóa lịch trình ngày hôm nay (hoặc ngày chỉ định), sắp xếp lại các khoảng trống và phòng ngừa quá tải.",
                AiIntent.OPTIMIZATION,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "date", Map.of("type", "STRING", "description", "Ngày cần tối ưu hóa (YYYY-MM-DD, mặc định hôm nay)"),
                                "keep_fixed", Map.of("type", "BOOLEAN", "description", "Giữ nguyên các lớp học chính khóa cố định (mặc định true)")
                        )
                )
        ));

        register(new ToolDefinition(
                "optimize_week",
                "Đề xuất tối ưu hóa toàn bộ lịch trình tuần, phân bổ thời gian tự học thông minh và giữ nguyên tất cả lớp học chính khóa.",
                AiIntent.OPTIMIZATION,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "keep_classes", Map.of("type", "BOOLEAN", "description", "Bắt buộc giữ nguyên tất cả các lớp học cố định trên trường (mặc định true)"),
                                "focus_area", Map.of("type", "STRING", "description", "Chủ đề hoặc môn học trọng tâm cần ưu tiên ôn tập")
                        )
                )
        ));

        register(new ToolDefinition(
                "batch_action",
                "Đề xuất thực thi một chuỗi nhiều hành động (Action Plan) cùng lúc dưới dạng một gói thay đổi được người dùng duyệt một lần.",
                AiIntent.PLANNING,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "title", Map.of("type", "STRING", "description", "Tiêu đề của kế hoạch hành động"),
                                "summary", Map.of("type", "STRING", "description", "Tóm tắt các thay đổi trong kế hoạch"),
                                "actions", Map.of(
                                        "type", "ARRAY",
                                        "description", "Danh sách các tool calls con cần thực hiện trong batch",
                                        "items", Map.of(
                                                "type", "OBJECT",
                                                "properties", Map.of(
                                                        "tool", Map.of("type", "STRING", "description", "Tên tool con (ví dụ: create_schedule, update_schedule, delete_schedule, reschedule_event)"),
                                                        "summary", Map.of("type", "STRING", "description", "Mô tả ngắn gọn về hành động này"),
                                                        "arguments_json", Map.of("type", "STRING", "description", "Chuỗi JSON chứa các tham số truyền vào tool con")
                                                ),
                                                "required", List.of("tool")
                                        )
                                )
                        ),
                        "required", List.of("title", "actions")
                )
        ));

        register(new ToolDefinition(
                "import_vision_schedule",
                "Đề xuất nhập toàn bộ hoặc các môn học/sự kiện đã được trích xuất từ ảnh thời khóa biểu/tài liệu gần nhất vào lịch học.",
                AiIntent.SCHEDULE,
                RiskLevel.IMPORTANT_WRITE,
                Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "vision_result_id", Map.of("type", "STRING", "description", "UUID kết quả phân tích ảnh (nếu không có thì hệ thống tự lấy kết quả ảnh gần nhất)"),
                                "target_schedule_id", Map.of("type", "STRING", "description", "ID thời khóa biểu muốn nhập vào")
                        )
                )
        ));
    }

    private void register(ToolDefinition def) {
        tools.put(def.name(), def);
    }

    public ToolDefinition getTool(String name) {
        return tools.get(name);
    }

    public Collection<ToolDefinition> getAllTools() {
        return Collections.unmodifiableCollection(tools.values());
    }

    public boolean isRegistered(String name) {
        return tools.containsKey(name);
    }

    public boolean isWriteTool(String name) {
        ToolDefinition def = tools.get(name);
        if (def == null) return false;
        return def.riskLevel() == RiskLevel.LOW_WRITE || def.riskLevel() == RiskLevel.IMPORTANT_WRITE;
    }

    public List<Map<String, Object>> getGeminiFunctionDeclarations() {
        List<Map<String, Object>> declarations = new ArrayList<>();
        for (ToolDefinition def : tools.values()) {
            declarations.add(Map.of(
                    "name", def.name(),
                    "description", def.description(),
                    "parameters", def.schema()
            ));
        }
        return declarations;
    }
}
