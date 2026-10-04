package com.smartschedule.ai.application;

import com.smartschedule.ai.domain.AiIntent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AiAgentRouter {

    private final AiQueryRepairService repairService;

    public AiAgentRouter() {
        this(new AiQueryRepairService());
    }

    @Autowired
    public AiAgentRouter(@Autowired(required = false) AiQueryRepairService repairService) {
        this.repairService = repairService != null ? repairService : new AiQueryRepairService();
    }

    public Set<AiIntent> route(String message) {
        if (message == null || message.isBlank()) {
            return Set.of(AiIntent.QUERY);
        }

        AiQueryRepairService.RepairResult repair = repairService.repair(message);
        String msg = repair.repairedQuery().toLowerCase().trim();
        String unaccented = repair.normalizedUnaccented().trim();
        EnumSet<AiIntent> intents = EnumSet.noneOf(AiIntent.class);

        // 1. HELP
        if (msg.contains("dùng thế nào") || msg.contains("cách dùng") || msg.contains("làm sao")
                || msg.contains("hướng dẫn") || msg.contains("chỉ tôi") || msg.contains("ở đâu")
                || msg.contains("không biết dùng") || msg.contains("help") || msg.contains("hỗ trợ")
                || unaccented.contains("dung sao") || unaccented.contains("cai nay dung sao")) {
            intents.add(AiIntent.HELP);
        }

        // 2. NAVIGATION
        if (msg.contains("đưa tôi tới") || msg.contains("đi tới") || msg.contains("chuyển sang")
                || msg.contains("mở màn hình") || msg.contains("mở phần") || msg.contains("vào trang")
                || msg.contains("mở trang") || msg.contains("navigate") || msg.contains("open")
                || unaccented.contains("chuyen sang") || unaccented.contains("mo man hinh")) {
            intents.add(AiIntent.NAVIGATION);
        }

        // 3. SEARCH
        if (msg.contains("tìm tất cả") || msg.contains("tìm lịch") || msg.contains("tìm kiếm")
                || msg.contains("tra cứu") || msg.contains("search") || msg.contains("lọc")
                || unaccented.contains("tra cuu") || unaccented.contains("tim kiem")) {
            intents.add(AiIntent.SEARCH);
        }

        // 4. DEADLINE
        if (msg.contains("deadline") || msg.contains("hạn nộp") || msg.contains("hạn chót")
                || msg.contains("đến hạn") || msg.contains("sắp hết hạn")
                || unaccented.contains("han nop") || unaccented.contains("han chot")) {
            intents.add(AiIntent.DEADLINE);
        }

        // 5. TASK
        if (msg.contains("task") || msg.contains("công việc") || msg.contains("nhiệm vụ")
                || msg.contains("hoàn thành") || msg.contains("bài tập")
                || unaccented.contains("cong viec") || unaccented.contains("hoan thanh")) {
            intents.add(AiIntent.TASK);
        }

        // 6. REMINDER
        if (msg.contains("nhắc nhở") || msg.contains("báo trước") || msg.contains("reminder")
                || msg.contains("chuông báo") || msg.contains("thông báo")
                || unaccented.contains("nhac nho") || unaccented.contains("thong bao")) {
            intents.add(AiIntent.REMINDER);
        }

        // 7. PLANNING
        if (msg.contains("kế hoạch") || msg.contains("lập lịch ôn") || msg.contains("study plan")
                || msg.contains("lộ trình") || msg.contains("ôn thi")
                || unaccented.contains("ke hoach") || unaccented.contains("on thi")) {
            intents.add(AiIntent.PLANNING);
        }

        // 8. OPTIMIZATION
        if (msg.contains("tối ưu") || msg.contains("optimize") || msg.contains("sắp xếp lại")
                || msg.contains("dọn dẹp lịch") || msg.contains("trống lịch")
                || unaccented.contains("toi uu") || unaccented.contains("sap xep lai")) {
            intents.add(AiIntent.OPTIMIZATION);
        }

        // 9. DOCUMENT
        if (msg.contains("syllabus") || msg.contains("tài liệu") || msg.contains("đọc file")
                || msg.contains("văn bản") || msg.contains("trích xuất") || msg.contains("pdf")
                || unaccented.contains("tai lieu") || unaccented.contains("trich xuat")) {
            intents.add(AiIntent.DOCUMENT);
        }

        // 10. ANALYTICS
        if (msg.contains("thống kê") || msg.contains("phân tích") || msg.contains("bao nhiêu tiếng")
                || msg.contains("học bao lâu") || msg.contains("analytics") || msg.contains("hiệu suất")
                || unaccented.contains("thong ke") || unaccented.contains("phan tich")) {
            intents.add(AiIntent.ANALYTICS);
        }

        // 11. PROFILE / SETTINGS
        if (msg.contains("timezone") || msg.contains("múi giờ") || msg.contains("cài đặt")
                || msg.contains("avatar") || msg.contains("ảnh đại diện") || msg.contains("settings")
                || msg.contains("profile") || msg.contains("thông tin cá nhân")
                || unaccented.contains("cai dat") || unaccented.contains("mui gio")) {
            intents.add(AiIntent.SETTINGS);
        }

        // 12. SCHEDULE (Mutation or Viewing, including Google Workspace Sheets & Calendar)
        if (msg.contains("tạo lịch") || msg.contains("xóa lịch") || msg.contains("xoá lịch")
                || msg.contains("sửa lịch") || msg.contains("dời lịch") || msg.contains("thay lịch")
                || msg.contains("đổi lịch") || msg.contains("tiết") || msg.contains("môn")
                || msg.contains("lịch học") || msg.contains("schedule") || msg.contains("calendar")
                || msg.contains("docs.google.com/spreadsheets") || msg.contains("google sheet")
                || msg.contains("google sheets") || msg.contains("bảng tính") || msg.contains("đồng bộ")
                || msg.contains("google calendar") || msg.contains("import lịch") || msg.contains("nhập lịch")
                || unaccented.contains("xoa lich") || unaccented.contains("tao lich") || unaccented.contains("doi lich")
                || unaccented.contains("dong bo") || unaccented.contains("nhap lich") || unaccented.contains("cho lich")
                || unaccented.contains("out") || unaccented.contains("gcal") || unaccented.contains("gg cal")) {
            intents.add(AiIntent.SCHEDULE);
        }

        // Default to QUERY if empty
        if (intents.isEmpty()) {
            intents.add(AiIntent.QUERY);
        }

        return Collections.unmodifiableSet(intents);
    }
}
