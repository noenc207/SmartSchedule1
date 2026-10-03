package com.smartschedule.ai;

import com.smartschedule.ai.application.AiAgentRouter;
import com.smartschedule.ai.domain.AiIntent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AiAgentRouterTest {

    private AiAgentRouter router;

    @BeforeEach
    void setUp() {
        router = new AiAgentRouter();
    }

    @Test
    void testRoute_navigation() {
        Set<AiIntent> intents = router.route("mở màn hình calendar giúp tôi");
        assertThat(intents).contains(AiIntent.NAVIGATION);
    }

    @Test
    void testRoute_taskAndDeadline() {
        Set<AiIntent> taskIntents = router.route("hoàn thành task nộp bài lab");
        assertThat(taskIntents).contains(AiIntent.TASK);

        Set<AiIntent> deadlineIntents = router.route("xem deadline sắp tới trong 7 ngày");
        assertThat(deadlineIntents).contains(AiIntent.DEADLINE);
    }

    @Test
    void testRoute_planningAndOptimization() {
        Set<AiIntent> planIntents = router.route("lập kế hoạch ôn thi Physics 10 ngày");
        assertThat(planIntents).contains(AiIntent.PLANNING);

        Set<AiIntent> optIntents = router.route("tối ưu lịch tuần này giữ nguyên lớp chính khóa");
        assertThat(optIntents).contains(AiIntent.OPTIMIZATION);
    }

    @Test
    void testRoute_multiIntentReplace() {
        Set<AiIntent> intents = router.route("xoá lịch lý đi thay giúp tôi thành toán");
        assertThat(intents).contains(AiIntent.SCHEDULE);
    }

    @Test
    void testRoute_analyticsAndSettings() {
        Set<AiIntent> analyticsIntents = router.route("thống kê xem tuần này tôi học bao nhiêu tiếng");
        assertThat(analyticsIntents).contains(AiIntent.ANALYTICS);

        Set<AiIntent> settingsIntents = router.route("đổi múi giờ sang Asia/Tokyo trong cài đặt");
        assertThat(settingsIntents).contains(AiIntent.SETTINGS);
    }

    @Test
    void testRoute_documentAnalysis() {
        Set<AiIntent> docIntents = router.route("đọc file syllabus này và trích xuất lịch thi");
        assertThat(docIntents).contains(AiIntent.DOCUMENT);
    }

    @Test
    void testRoute_googleWorkspace() {
        Set<AiIntent> sheetsIntents = router.route("Đọc Google Sheet này và thêm lịch vào SmartSchedule https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit");
        assertThat(sheetsIntents).contains(AiIntent.SCHEDULE);

        Set<AiIntent> calIntents = router.route("Import lịch từ Google Calendar của tôi");
        assertThat(calIntents).contains(AiIntent.SCHEDULE);

        Set<AiIntent> syncIntents = router.route("Đồng bộ Google Calendar với SmartSchedule");
        assertThat(syncIntents).contains(AiIntent.SCHEDULE);
    }
}
