package com.smartschedule.ai.application;

import com.smartschedule.ai.domain.AiIntent;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AiAgentRouter {

    public Set<AiIntent> route(String message) {
        if (message == null || message.isBlank()) {
            return Set.of(AiIntent.QUERY);
        }

        String msg = message.toLowerCase().trim();
        EnumSet<AiIntent> intents = EnumSet.noneOf(AiIntent.class);

        // 1. HELP
        if (msg.contains("dùng thế nào") || msg.contains("cách dùng") || msg.contains("làm sao")
                || msg.contains("hướng dẫn") || msg.contains("chỉ tôi") || msg.contains("ở đâu")
                || msg.contains("không biết dùng") || msg.contains("help") || msg.contains("hỗ trợ")) {
            intents.add(AiIntent.HELP);
        }

        // 2. NAVIGATION
        if (msg.contains("đưa tôi tới") || msg.contains("đi tới") || msg.contains("chuyển sang")
                || msg.contains("mở màn hình") || msg.contains("mở phần") || msg.contains("vào trang")
                || msg.contains("mở trang") || msg.contains("navigate") || msg.contains("open")) {
            intents.add(AiIntent.NAVIGATION);
        }

        // 3. SEARCH
        if (msg.contains("tìm tất cả") || msg.contains("tìm lịch") || msg.contains("tìm kiếm")
                || msg.contains("tra cứu") || msg.contains("search") || msg.contains("lọc")) {
            intents.add(AiIntent.SEARCH);
        }

        // 4. DEADLINE
        if (msg.contains("deadline") || msg.contains("hạn nộp") || msg.contains("hạn chót")
                || msg.contains("đến hạn") || msg.contains("sắp hết hạn")) {
            intents.add(AiIntent.DEADLINE);
        }

        // 5. TASK
        if (msg.contains("task") || msg.contains("công việc") || msg.contains("nhiệm vụ")
                || msg.contains("hoàn thành") || msg.contains("bài tập")) {
            intents.add(AiIntent.TASK);
        }

        // 6. REMINDER
        if (msg.contains("nhắc nhở") || msg.contains("báo trước") || msg.contains("reminder")
                || msg.contains("chuông báo") || msg.contains("thông báo")) {
            intents.add(AiIntent.REMINDER);
        }

        // 7. PLANNING
        if (msg.contains("kế hoạch") || msg.contains("lập lịch ôn") || msg.contains("study plan")
                || msg.contains("lộ trình") || msg.contains("ôn thi")) {
            intents.add(AiIntent.PLANNING);
        }

        // 8. OPTIMIZATION
        if (msg.contains("tối ưu") || msg.contains("optimize") || msg.contains("sắp xếp lại")
                || msg.contains("dọn dẹp lịch") || msg.contains("trống lịch")) {
            intents.add(AiIntent.OPTIMIZATION);
        }

        // 9. DOCUMENT
        if (msg.contains("syllabus") || msg.contains("tài liệu") || msg.contains("đọc file")
                || msg.contains("văn bản") || msg.contains("trích xuất") || msg.contains("pdf")) {
            intents.add(AiIntent.DOCUMENT);
        }

        // 10. ANALYTICS
        if (msg.contains("thống kê") || msg.contains("phân tích") || msg.contains("bao nhiêu tiếng")
                || msg.contains("học bao lâu") || msg.contains("analytics") || msg.contains("hiệu suất")) {
            intents.add(AiIntent.ANALYTICS);
        }

        // 11. PROFILE / SETTINGS
        if (msg.contains("timezone") || msg.contains("múi giờ") || msg.contains("cài đặt")
                || msg.contains("avatar") || msg.contains("ảnh đại diện") || msg.contains("settings")
                || msg.contains("profile") || msg.contains("thông tin cá nhân")) {
            intents.add(AiIntent.SETTINGS);
        }

        // 12. SCHEDULE (Mutation or Viewing)
        if (msg.contains("tạo lịch") || msg.contains("xóa lịch") || msg.contains("xoá lịch")
                || msg.contains("sửa lịch") || msg.contains("dời lịch") || msg.contains("thay lịch")
                || msg.contains("đổi lịch") || msg.contains("tiết") || msg.contains("môn")
                || msg.contains("lịch học") || msg.contains("schedule") || msg.contains("calendar")) {
            intents.add(AiIntent.SCHEDULE);
        }

        // Default to QUERY if empty
        if (intents.isEmpty()) {
            intents.add(AiIntent.QUERY);
        }

        return Collections.unmodifiableSet(intents);
    }
}
