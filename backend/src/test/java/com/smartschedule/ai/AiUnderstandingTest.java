package com.smartschedule.ai;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.application.*;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AiUnderstandingTest {

    private AiQueryRepairService repairService;
    private AiAliasService aliasService;
    private AiReferenceResolverService referenceResolver;
    private AiPendingIntentService pendingIntentService;
    private AiConfidenceEngine confidenceEngine;
    private AiAgentRouter agentRouter;
    private AiUnderstandingService understandingService;
    private AiWrongToolGuard wrongToolGuard;
    private AiResponseRelevanceValidator relevanceValidator;

    private EventRepository mockEventRepository;
    private ScheduleRepository mockScheduleRepository;
    private User testUser;

    @BeforeEach
    void setUp() {
        mockEventRepository = Mockito.mock(EventRepository.class);
        mockScheduleRepository = Mockito.mock(ScheduleRepository.class);

        repairService = new AiQueryRepairService();
        aliasService = new AiAliasService();
        referenceResolver = new AiReferenceResolverService(mockEventRepository, mockScheduleRepository, aliasService);
        pendingIntentService = new AiPendingIntentService(aliasService);
        confidenceEngine = new AiConfidenceEngine();
        agentRouter = new AiAgentRouter();

        understandingService = new AiUnderstandingService(
                repairService,
                aliasService,
                referenceResolver,
                pendingIntentService,
                confidenceEngine,
                agentRouter
        );

        wrongToolGuard = new AiWrongToolGuard();
        relevanceValidator = new AiResponseRelevanceValidator();

        testUser = new User("tester@example.com", "hash", "Tester");
    }

    @Test
    @DisplayName("Case 1: 'xoa lich ly' (No accents) -> DELETE_SCHEDULE with target 'Vật lý'")
    void testCase1_xoaLichLy_noAccents() {
        var res = understandingService.analyze(testUser, "xoa lich ly", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("DELETE_SCHEDULE");
        assertThat(res.entities().get("target_title")).isEqualTo("Vật lý");
        assertThat(res.isCommand()).isTrue();
    }

    @Test
    @DisplayName("Case 2: 'xoá lịch Lý' (With accents) -> DELETE_SCHEDULE with target 'Vật lý'")
    void testCase2_xoaLichLy_withAccents() {
        var res = understandingService.analyze(testUser, "xoá lịch Lý", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("DELETE_SCHEDULE");
        assertThat(res.entities().get("target_title")).isEqualTo("Vật lý");
        assertThat(res.isCommand()).isTrue();
    }

    @Test
    @DisplayName("Case 3: 'cho lý out' (Slang) -> DELETE_SCHEDULE with target 'Vật lý'")
    void testCase3_choLyOut_slang() {
        var res = understandingService.analyze(testUser, "cho lý out", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("DELETE_SCHEDULE");
        assertThat(res.entities().get("target_title")).isEqualTo("Vật lý");
    }

    @Test
    @DisplayName("Case 4: 'dong bo gg cal' (No accents + abbreviation) -> SYNC_GOOGLE_CALENDAR")
    void testCase4_dongBoGgCal_abbreviation() {
        var res = understandingService.analyze(testUser, "dong bo gg cal", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("SYNC_GOOGLE_CALENDAR");
        assertThat(res.entities().get("provider")).isEqualTo("GOOGLE_CALENDAR");
    }

    @Test
    @DisplayName("Case 5: 'đổi nó sang tối' (Pronoun resolution with selected event) -> RESCHEDULE_EVENT with 19:00")
    void testCase5_doiNoSangToi_pronoun() {
        UUID eventId = UUID.randomUUID();
        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto(
                "CALENDAR",
                LocalDate.now().toString(),
                eventId.toString(),
                "Physics",
                "Asia/Ho_Chi_Minh"
        );

        var res = understandingService.analyze(testUser, "đổi nó sang tối", UUID.randomUUID(), context);
        assertThat(res.intent()).isEqualTo("RESCHEDULE_EVENT");
        assertThat(res.targetEventId()).isEqualTo(eventId);
        assertThat(res.entities().get("new_start_time")).isEqualTo("19:00");
    }

    @Test
    @DisplayName("Case 6: 'không, là Math' (User correction) -> Updates pending intent title to 'Toán'")
    void testCase6_khongLaMath_correction() {
        UUID convId = UUID.randomUUID();
        pendingIntentService.save(convId, new AiPendingIntentService.PendingIntent(
                convId,
                "CREATE_SCHEDULE",
                Map.of("title", "Vật lý"),
                List.of("start_time"),
                null,
                List.of(),
                "Bạn muốn bắt đầu học lúc mấy giờ?",
                Instant.now(),
                Instant.now().plusSeconds(600)
        ));

        var mergeResult = pendingIntentService.processFollowUp(convId, "không, là Math");
        assertThat(mergeResult.isCorrection()).isTrue();
        assertThat(mergeResult.updatedIntent().knownFields().get("title")).isEqualTo("Toán");
    }

    @Test
    @DisplayName("Case 7: '1 tiếng rưỡi' (Follow-up duration parameter) -> 90 minutes")
    void testCase7_motTiengRuoi_durationFollowUp() {
        UUID convId = UUID.randomUUID();
        pendingIntentService.save(convId, new AiPendingIntentService.PendingIntent(
                convId,
                "CREATE_SCHEDULE",
                Map.of("title", "Toán", "start_time", "08:00"),
                List.of("duration_minutes"),
                null,
                List.of(),
                "Bạn muốn học trong bao lâu?",
                Instant.now(),
                Instant.now().plusSeconds(600)
        ));

        var mergeResult = pendingIntentService.processFollowUp(convId, "1 tiếng rưỡi");
        assertThat(mergeResult.isFullyResolved()).isTrue();
        assertThat(mergeResult.updatedIntent().knownFields().get("duration_minutes")).isEqualTo(90);
    }

    @Test
    @DisplayName("Case 8: 'tạo lịch Physics chủ nhật' -> Missing time & duration -> Clarification (No default guessing)")
    void testCase8_taoPhysicsChuNhat_missingTimeAndDuration() {
        var res = understandingService.analyze(testUser, "tạo lịch Physics chủ nhật", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("CREATE_SCHEDULE");
        assertThat(res.missingFields()).contains("start_time", "duration_minutes");
        assertThat(res.needsClarification()).isTrue();
        assertThat(res.clarificationQuestion()).contains("bắt đầu lúc mấy giờ");
    }

    @Test
    @DisplayName("Case 9: 'xóa cái này' (Without selection) -> Missing target -> Clarification")
    void testCase9_xoaCaiNay_noSelection() {
        var res = understandingService.analyze(testUser, "xóa cái này", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("DELETE_SCHEDULE");
        assertThat(res.needsClarification()).isTrue();
        assertThat(res.missingFields()).contains("target");
    }

    @Test
    @DisplayName("Case 10: 'xóa cái này' (With selected event) -> Target resolved with HIGH confidence")
    void testCase10_xoaCaiNay_withSelection() {
        UUID eventId = UUID.randomUUID();
        AiDtos.ClientContextDto context = new AiDtos.ClientContextDto(
                "CALENDAR",
                LocalDate.now().toString(),
                eventId.toString(),
                "Hóa học",
                "Asia/Ho_Chi_Minh"
        );

        var res = understandingService.analyze(testUser, "xóa cái này", UUID.randomUUID(), context);
        assertThat(res.intent()).isEqualTo("DELETE_SCHEDULE");
        assertThat(res.targetEventId()).isEqualTo(eventId);
        assertThat(res.confidence()).isEqualTo(AiConfidenceEngine.ConfidenceLevel.HIGH);
    }

    @Test
    @DisplayName("Case 11: 'đổi lịch lý' (2 physics events in DB) -> Ambiguous target with choices")
    void testCase11_doiLichLy_ambiguousMultipleEvents() {
        Schedule sched = Mockito.mock(Schedule.class);
        UUID schedId = UUID.randomUUID();
        when(sched.getId()).thenReturn(schedId);
        when(mockScheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId()))
                .thenReturn(List.of(sched));

        Event ev1 = Mockito.mock(Event.class);
        when(ev1.getId()).thenReturn(UUID.randomUUID());
        when(ev1.getTitle()).thenReturn("Vật lý");
        when(ev1.getStartsAt()).thenReturn(Instant.now());

        Event ev2 = Mockito.mock(Event.class);
        when(ev2.getId()).thenReturn(UUID.randomUUID());
        when(ev2.getTitle()).thenReturn("Vật lý");
        when(ev2.getStartsAt()).thenReturn(Instant.now().plus(2, ChronoUnit.DAYS));

        when(mockEventRepository.findAllByScheduleId(schedId))
                .thenReturn(List.of(ev1, ev2));

        var res = understandingService.analyze(testUser, "đổi lịch lý", UUID.randomUUID(), null);
        assertThat(res.needsClarification()).isTrue();
        assertThat(res.clarificationQuestion()).contains("Tôi tìm thấy 2 lịch Vật lý");
        assertThat(res.clarificationOptions()).hasSize(2);
    }

    @Test
    @DisplayName("Case 12: 'xóa lý rồi thay bằng toán' -> Multi-intent REPLACE_SCHEDULE")
    void testCase12_xoaLyThayBangToan_multiIntent() {
        var res = understandingService.analyze(testUser, "xóa lý rồi thay bằng toán", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("REPLACE_SCHEDULE");
        assertThat(res.entities().get("target_title")).isEqualTo("Vật lý");
        assertThat(res.entities().get("new_title")).isEqualTo("Toán");
    }

    @Test
    @DisplayName("Case 13: 'tôi có nên xóa lý không?' -> Advisory QUESTION (Not a mutation)")
    void testCase13_toiCoNenXoaLyKhong_question() {
        var res = understandingService.analyze(testUser, "tôi có nên xóa lý không?", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("QUESTION");
        assertThat(res.isCommand()).isFalse();
    }

    @Test
    @DisplayName("Case 14: 'cách xóa lý?' -> HELP guide (Not a mutation)")
    void testCase14_cachXoaLy_help() {
        var res = understandingService.analyze(testUser, "cách xóa lý?", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("HELP");
        assertThat(res.isHelp()).isTrue();
        assertThat(res.isCommand()).isFalse();
    }

    @Test
    @DisplayName("Case 15: 'thôi bỏ' -> CANCEL request")
    void testCase15_thoiBo_cancellation() {
        UUID convId = UUID.randomUUID();
        var res = understandingService.analyze(testUser, "thôi bỏ", convId, null);
        assertThat(res.intent()).isEqualTo("CANCEL");
        assertThat(res.isCancel()).isTrue();
    }

    @Test
    @DisplayName("Case 16: 'nhập toàn bộ vào lịch' -> IMPORT_GOOGLE_SHEETS")
    void testCase16_nhapToanBoVaoLich_import() {
        var res = understandingService.analyze(testUser, "nhập toàn bộ vào lịch", UUID.randomUUID(), null);
        assertThat(res.intent()).isEqualTo("IMPORT_GOOGLE_SHEETS");
        assertThat(res.entities().get("provider")).isEqualTo("GOOGLE_SHEETS");
    }

    @Test
    @DisplayName("WrongToolGuard: Intercepts read-only tool calls when mutation requested")
    void testWrongToolGuard_interceptsReadWhenDeleteRequested() {
        var val1 = wrongToolGuard.validate("DELETE_SCHEDULE", "get_week_schedule", Map.of());
        assertThat(val1.isValid()).isFalse();
        assertThat(val1.suggestedTool()).isEqualTo("delete_schedule");

        var val2 = wrongToolGuard.validate("SYNC_GOOGLE_CALENDAR", "get_today_schedule", Map.of());
        assertThat(val2.isValid()).isFalse();
        assertThat(val2.suggestedTool()).isEqualTo("sync_google_calendar");
    }

    @Test
    @DisplayName("ResponseRelevanceValidator: Intercepts generic no-op acknowledgements on commands")
    void testResponseRelevanceValidator_noOpGuard() {
        var assess = relevanceValidator.validate(
                "DELETE_SCHEDULE",
                true,
                "Tôi đã ghi nhận câu hỏi của bạn.",
                false
        );
        assertThat(assess.isRelevant()).isFalse();
        assertThat(assess.isNoOpViolation()).isTrue();
        assertThat(assess.suggestedFallback()).contains("Tôi chưa rõ bạn muốn xóa lịch cụ thể nào");
    }
}
