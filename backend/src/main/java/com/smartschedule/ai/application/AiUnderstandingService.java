package com.smartschedule.ai.application;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.ai.domain.AiIntent;
import com.smartschedule.user.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conversation Understanding Layer (AiUnderstandingService).
 * Analyzes intent, sub-intent, entities, target references, confidence,
 * coordinates 2-pass recovery, and generates smart clarifications with choices.
 */
@Service
public class AiUnderstandingService {

    public record UnderstandingResult(
            String intent,                     // CREATE_SCHEDULE, REPLACE_SCHEDULE, DELETE_SCHEDULE, RESCHEDULE_EVENT, SYNC_GOOGLE_CALENDAR, IMPORT_GOOGLE_SHEETS, QUERY, HELP, CANCEL
            String subIntent,
            boolean isCommand,
            boolean isHelp,
            boolean isCancel,
            Map<String, Object> entities,
            UUID targetEventId,
            String targetTitle,
            AiConfidenceEngine.ConfidenceLevel confidence,
            List<String> missingFields,
            boolean needsClarification,
            String clarificationQuestion,
            List<String> clarificationOptions,
            String repairedMessage
    ) {}

    private final AiQueryRepairService repairService;
    private final AiAliasService aliasService;
    private final AiReferenceResolverService referenceResolver;
    private final AiPendingIntentService pendingIntentService;
    private final AiConfidenceEngine confidenceEngine;
    private final AiAgentRouter agentRouter;

    @Autowired
    public AiUnderstandingService(
            AiQueryRepairService repairService,
            AiAliasService aliasService,
            AiReferenceResolverService referenceResolver,
            AiPendingIntentService pendingIntentService,
            AiConfidenceEngine confidenceEngine,
            AiAgentRouter agentRouter
    ) {
        this.repairService = repairService;
        this.aliasService = aliasService;
        this.referenceResolver = referenceResolver;
        this.pendingIntentService = pendingIntentService;
        this.confidenceEngine = confidenceEngine;
        this.agentRouter = agentRouter;
    }

    public UnderstandingResult analyze(User user, String rawMessage, UUID conversationId, AiDtos.ClientContextDto clientContext) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return new UnderstandingResult("HELP", null, false, true, false, Map.of(), null, null,
                    AiConfidenceEngine.ConfidenceLevel.HIGH, List.of(), false, null, List.of(), "");
        }

        // ---------------------------------------------------------------------
        // STEP 1: Check Multi-Turn Pending Intent
        // ---------------------------------------------------------------------
        if (conversationId != null) {
            AiPendingIntentService.MergeResult mergeResult = pendingIntentService.processFollowUp(conversationId, rawMessage);
            if (mergeResult.matchedPending()) {
                if (mergeResult.isCancelled()) {
                    return new UnderstandingResult("CANCEL", null, true, false, true, Map.of(), null, null,
                            AiConfidenceEngine.ConfidenceLevel.HIGH, List.of(), false, null, List.of(), rawMessage);
                }
                if (mergeResult.isFullyResolved() && mergeResult.updatedIntent() != null) {
                    Map<String, Object> fields = mergeResult.updatedIntent().knownFields();
                    return new UnderstandingResult(
                            mergeResult.updatedIntent().intent(),
                            "RESOLVED_FROM_CLARIFICATION",
                            true,
                            false,
                            false,
                            fields,
                            null,
                            (String) fields.get("title"),
                            AiConfidenceEngine.ConfidenceLevel.HIGH,
                            List.of(),
                            false,
                            null,
                            List.of(),
                            rawMessage
                    );
                }
            }
        }

        // ---------------------------------------------------------------------
        // STEP 2: Query Repair & Normalization
        // ---------------------------------------------------------------------
        AiQueryRepairService.RepairResult repair = repairService.repair(rawMessage);
        String text = repair.repairedQuery();
        String lower = text.toLowerCase();
        String unaccented = repair.normalizedUnaccented();

        // ---------------------------------------------------------------------
        // STEP 3: Reference & Pronoun Resolution
        // ---------------------------------------------------------------------
        AiReferenceResolverService.ResolvedReference ref = referenceResolver.resolve(text, user, clientContext);

        // ---------------------------------------------------------------------
        // STEP 4: Command vs Question vs Help vs Cancellation
        // ---------------------------------------------------------------------
        boolean isHelp = isHelpQuery(lower, unaccented);
        boolean isCancel = isCancelQuery(lower);
        if (isCancel) {
            if (conversationId != null) pendingIntentService.clear(conversationId);
            return new UnderstandingResult("CANCEL", null, true, false, true, Map.of(), null, null,
                    AiConfidenceEngine.ConfidenceLevel.HIGH, List.of(), false, null, List.of(), text);
        }
        if (isHelp) {
            return new UnderstandingResult("HELP", null, false, true, false, Map.of(), null, null,
                    AiConfidenceEngine.ConfidenceLevel.HIGH, List.of(), false, null, List.of(), text);
        }

        boolean isQuestion = isQuestionQuery(lower, unaccented);
        if (isQuestion) {
            return new UnderstandingResult("QUESTION", null, false, false, false, Map.of(), null, null,
                    AiConfidenceEngine.ConfidenceLevel.HIGH, List.of(), false, null, List.of(), text);
        }

        boolean isCommand = isCommandPhrase(lower, unaccented);

        // ---------------------------------------------------------------------
        // STEP 5: Intent Recognition & Entity Extraction
        // ---------------------------------------------------------------------
        Map<String, Object> entities = new LinkedHashMap<>();
        List<String> missingFields = new ArrayList<>();
        String detectedIntent = "QUERY";

        // Extract Google Sheets URL if present in rawMessage or text
        Matcher sheetUrlMatcher = Pattern.compile("https://docs\\.google\\.com/spreadsheets/d/([a-zA-Z0-9-_]+)[^\\s]*").matcher(rawMessage);
        if (sheetUrlMatcher.find()) {
            entities.put("spreadsheet_url", sheetUrlMatcher.group(0));
            entities.put("spreadsheet_id", sheetUrlMatcher.group(1));
            entities.put("provider", "GOOGLE_SHEETS");
        }

        // A. Google Calendar Sync
        if (unaccented.contains("dong bo") || unaccented.contains("sync")) {
            if (unaccented.contains("google calendar") || unaccented.contains("gg cal") || unaccented.contains("calendar")) {
                detectedIntent = "SYNC_GOOGLE_CALENDAR";
                entities.put("provider", "GOOGLE_CALENDAR");
            }
        }

        // B. Google Sheets Import & Read
        boolean mentionsSheet = lower.contains("docs.google.com/spreadsheets")
                || lower.contains("google sheet")
                || unaccented.contains("bang tinh")
                || entities.containsKey("spreadsheet_url")
                || unaccented.contains("nhap toan bo vao lich")
                || unaccented.contains("nhap vao lich")
                || unaccented.contains("dua het vao lich");

        if (mentionsSheet) {
            if (unaccented.contains("nhap") || unaccented.contains("dong bo") || unaccented.contains("sync")
                    || unaccented.contains("them") || unaccented.contains("dua vao") || unaccented.contains("dua het")
                    || unaccented.contains("nhap vao lich") || unaccented.contains("nhap toan bo")) {
                detectedIntent = "IMPORT_GOOGLE_SHEETS";
            } else if (unaccented.contains("doc") || unaccented.contains("xem") || unaccented.contains("kiem tra")
                    || unaccented.contains("phan tich") || lower.contains("read") || lower.contains("check")) {
                detectedIntent = "READ_GOOGLE_SHEET";
            } else if (entities.containsKey("spreadsheet_url")) {
                detectedIntent = "IMPORT_GOOGLE_SHEETS";
            }
            entities.put("provider", "GOOGLE_SHEETS");
        }

        // C. Reschedule / Move Schedule: "dời toán sang tối", "đổi nó sang tối", "dời cái vừa tạo", "chuyển sang chiều"
        if ("QUERY".equals(detectedIntent) && (unaccented.contains("doi no") || unaccented.contains("sang toi") || unaccented.contains("sang sang") || unaccented.contains("sang chieu")
                || (unaccented.contains("doi") && (unaccented.contains("sang") || unaccented.contains("chuyen")))
                || unaccented.contains("doi gio") || unaccented.contains("doi ngay") || unaccented.contains("doi sang"))) {
            boolean isSessionMove = unaccented.contains("toi") || unaccented.contains("chieu") || unaccented.contains("sang sang") || unaccented.contains("mai") || unaccented.contains("thu");
            if (isSessionMove || ref.hasReference()) {
                detectedIntent = "RESCHEDULE_EVENT";
                if (ref.hasReference() && ref.targetEventId() != null) {
                    entities.put("target_event_id", ref.targetEventId().toString());
                    entities.put("target_title", ref.targetTitle());
                } else {
                    Optional<String> subject = extractSubject(text);
                    subject.ifPresent(s -> entities.put("target_title", s));
                }
                // Check session time
                if (unaccented.contains("sang toi") || unaccented.contains("toi")) {
                    entities.put("new_start_time", "19:00");
                } else if (unaccented.contains("sang chieu") || unaccented.contains("chieu")) {
                    entities.put("new_start_time", "14:00");
                } else if (unaccented.contains("sang sang") || unaccented.contains("sang")) {
                    entities.put("new_start_time", "08:00");
                }
            }
        }

        // D. Replace / Swap Schedule: "xoá lịch lý đi thay thành toán", "đổi lý sang toán", "thay lý bằng toán", "xóa lý rồi thay bằng toán"
        if ("QUERY".equals(detectedIntent) && (unaccented.contains("thay") || unaccented.contains("doi")) && (unaccented.contains("thanh") || unaccented.contains("bang") || unaccented.contains("sang"))) {
            Matcher replaceMatcher = Pattern.compile("(?i)(?:xóa|xoá|bỏ|thay|đổi)?\\s*(?:lịch|môn)?\\s*([a-zA-ZÀ-ỹ0-9_]+)\\s*(?:đi|ra|rồi|roi)?\\s*(?:thay|đổi|chuyển)?\\s*(?:thành|bằng|sang|giúp tôi thành)\\s*([a-zA-ZÀ-ỹ0-9_]+)").matcher(text);
            if (replaceMatcher.find()) {
                String rawOld = replaceMatcher.group(1).trim();
                String rawNew = replaceMatcher.group(2).trim();
                Optional<String> oldSub = aliasService.resolveSubject(rawOld);
                Optional<String> newSub = aliasService.resolveSubject(rawNew);
                if (oldSub.isPresent() && newSub.isPresent()) {
                    detectedIntent = "REPLACE_SCHEDULE";
                    entities.put("target_title", oldSub.get());
                    entities.put("new_title", newSub.get());
                }
            }
        }

        // E. Delete / Remove Schedule: "xóa lịch lý", "cho lý out", "bỏ lịch lý", "xóa cái này"
        if ("QUERY".equals(detectedIntent) && (unaccented.contains("xoa") || unaccented.contains("bo") || unaccented.contains("huy") || unaccented.contains("out"))) {
            detectedIntent = "DELETE_SCHEDULE";
            if (ref.hasReference() && ref.targetEventId() != null) {
                entities.put("target_event_id", ref.targetEventId().toString());
                entities.put("target_title", ref.targetTitle());
            } else {
                // Try to extract subject
                Optional<String> subject = extractSubject(text);
                subject.ifPresent(s -> entities.put("target_title", s));
            }
        }

        // F. Create Schedule: "tạo lịch toán chủ nhật 8h 90 phút"
        if ("QUERY".equals(detectedIntent) && (unaccented.contains("tao") || unaccented.contains("them")) && (unaccented.contains("lich") || unaccented.contains("mon") || unaccented.contains("tiet"))) {
            detectedIntent = "CREATE_SCHEDULE";
            Optional<String> subject = extractSubject(text);
            subject.ifPresent(s -> entities.put("title", s));

            LocalTime parsedTime = AiDateTimeUtils.parseLocalTime(text);
            if (parsedTime != null) {
                entities.put("start_time", parsedTime.toString());
            }
            Integer parsedDuration = AiDateTimeUtils.parseDurationMinutes(text);
            if (parsedDuration != null) {
                entities.put("duration_minutes", parsedDuration);
            }

            // Check missing required fields for create_schedule
            if (!entities.containsKey("title")) missingFields.add("title");
            if (!entities.containsKey("start_time")) missingFields.add("start_time");
            if (!entities.containsKey("duration_minutes") && !entities.containsKey("end_time")) {
                missingFields.add("duration_minutes");
            }
        }

        // G. Find Free Time
        if ("QUERY".equals(detectedIntent) && (unaccented.contains("ranh") || unaccented.contains("trong khong") || unaccented.contains("gio ranh"))) {
            detectedIntent = "FIND_FREE_TIME";
            Integer parsedDuration = AiDateTimeUtils.parseDurationMinutes(text);
            if (parsedDuration != null) {
                entities.put("duration_minutes", parsedDuration);
            }
        }

        // ---------------------------------------------------------------------
        // STEP 6: Second-Pass Recovery & Ambiguity Handling
        // ---------------------------------------------------------------------
        // If operation targets Google Sheets, clear any false calendar event pronoun ambiguity
        if (entities.containsKey("spreadsheet_url") || "IMPORT_GOOGLE_SHEETS".equals(detectedIntent) || "READ_GOOGLE_SHEET".equals(detectedIntent)) {
            if (ref.hasReference() && ref.targetEventId() == null) {
                ref = new AiReferenceResolverService.ResolvedReference(false, null, null, null, false, List.of());
            }
        }

        boolean isAmbiguous = ref.isAmbiguous();
        List<String> clarificationOptions = new ArrayList<>();
        String clarificationQuestion = null;

        // If pronoun reference without direct target
        if (ref.hasReference() && ref.targetEventId() == null) {
            missingFields.add("target");
            if (!ref.candidates().isEmpty()) {
                isAmbiguous = true;
                StringBuilder sb = new StringBuilder("Tôi tìm thấy các lịch sau của bạn:\n");
                for (int i = 0; i < Math.min(ref.candidates().size(), 3); i++) {
                    AiReferenceResolverService.CandidateEvent c = ref.candidates().get(i);
                    sb.append(String.format("%d. %s (%s lúc %s)\n", i + 1, c.title(), c.dateStr(), c.timeStr()));
                    clarificationOptions.add(c.title() + " " + c.dateStr());
                }
                sb.append("Bạn muốn thao tác với lịch nào?");
                clarificationQuestion = sb.toString();
            } else {
                isAmbiguous = true;
                clarificationQuestion = "Bạn muốn thao tác với lịch nào? Vui lòng chọn một sự kiện trên lịch hoặc cho tôi biết tên môn học nhé!";
                clarificationOptions = List.of("Chọn sự kiện trên lịch", "Nêu tên môn học");
            }
        }

        // If user mentions a subject and multiple events exist in DB (e.g. "đổi lịch lý")
        if (user != null && ("DELETE_SCHEDULE".equals(detectedIntent) || "RESCHEDULE_EVENT".equals(detectedIntent) || "QUERY".equals(detectedIntent))) {
            Optional<String> subOpt = extractSubject(text);
            if (subOpt.isPresent() && ref.targetEventId() == null) {
                List<AiReferenceResolverService.CandidateEvent> subjectEvents = referenceResolver.findMatchingSubjectEvents(user, subOpt.get());
                if (subjectEvents.size() > 1) {
                    isAmbiguous = true;
                    StringBuilder sb = new StringBuilder(String.format("Tôi tìm thấy %d lịch %s:\n", subjectEvents.size(), subOpt.get()));
                    clarificationOptions.clear();
                    for (int i = 0; i < Math.min(subjectEvents.size(), 3); i++) {
                        AiReferenceResolverService.CandidateEvent c = subjectEvents.get(i);
                        sb.append(String.format("%d. %s lúc %s\n", i + 1, c.dateStr(), c.timeStr()));
                        clarificationOptions.add(c.dateStr() + " " + c.timeStr());
                    }
                    sb.append("Bạn muốn thao tác với lịch nào?");
                    clarificationQuestion = sb.toString();
                }
            }
        }

        // If user says "đổi lý" (ambiguous whether to change time, subject name, or replace)
        if (clarificationQuestion == null && "QUERY".equals(detectedIntent) && (unaccented.equals("doi ly") || unaccented.equals("doi lich ly") || unaccented.equals("thay ly"))) {
            isAmbiguous = true;
            clarificationQuestion = "Bạn muốn:\n1. Đổi giờ học môn Vật lý\n2. Thay môn Vật lý bằng môn khác\n3. Đổi tên lịch?";
            clarificationOptions = List.of("Đổi giờ", "Thay môn khác", "Đổi tên");
        }

        // If CREATE_SCHEDULE is missing required time / duration
        if ("CREATE_SCHEDULE".equals(detectedIntent) && !missingFields.isEmpty()) {
            String title = (String) entities.getOrDefault("title", "môn học");
            if (missingFields.contains("start_time") && missingFields.contains("duration_minutes")) {
                clarificationQuestion = String.format("Bạn muốn tạo lịch %s bắt đầu lúc mấy giờ và trong bao lâu (ví dụ: 08:00 trong 90 phút)?", title);
            } else if (missingFields.contains("start_time")) {
                clarificationQuestion = String.format("Bạn muốn bắt đầu học %s lúc mấy giờ?", title);
            } else if (missingFields.contains("duration_minutes")) {
                clarificationQuestion = String.format("Bạn muốn học %s trong bao nhiêu phút (ví dụ: 60 phút, 90 phút)?", title);
            }
        }

        // ---------------------------------------------------------------------
        // STEP 7: Confidence Assessment
        // ---------------------------------------------------------------------
        AiConfidenceEngine.ConfidenceAssessment assessment = confidenceEngine.evaluate(
                detectedIntent,
                entities,
                missingFields,
                isAmbiguous,
                repair.wasRepaired()
        );

        boolean needsClarification = assessment.isLow() || isAmbiguous || (clarificationQuestion != null);

        // Save pending intent if clarification is requested
        if (needsClarification && conversationId != null && clarificationQuestion != null) {
            pendingIntentService.save(conversationId, new AiPendingIntentService.PendingIntent(
                    conversationId,
                    detectedIntent,
                    entities,
                    missingFields,
                    ref.targetEventId() != null ? ref.targetEventId().toString() : null,
                    clarificationOptions,
                    clarificationQuestion,
                    java.time.Instant.now(),
                    java.time.Instant.now().plus(java.time.Duration.ofMinutes(15))
            ));
        }

        return new UnderstandingResult(
                detectedIntent,
                assessment.explanation(),
                isCommand,
                isHelp,
                isCancel,
                entities,
                ref.targetEventId(),
                ref.targetTitle(),
                assessment.overallConfidence(),
                missingFields,
                needsClarification,
                clarificationQuestion,
                clarificationOptions,
                text
        );
    }

    private Optional<String> extractSubject(String text) {
        String[] words = text.split("\\s+");
        for (String w : words) {
            Optional<String> sub = aliasService.resolveSubject(w);
            if (sub.isPresent()) return sub;
        }
        return Optional.empty();
    }

    private boolean isHelpQuery(String lower, String unaccented) {
        return lower.contains("cách dùng") || lower.contains("dung the nao") || lower.contains("làm sao")
                || lower.contains("hướng dẫn") || lower.contains("chỉ tôi") || lower.contains("không biết dùng")
                || lower.contains("cái này dùng sao") || lower.contains("dung sao") || lower.contains("help")
                || lower.startsWith("cách ") || lower.contains("cách xóa") || lower.contains("cách tạo")
                || lower.contains("cách đổi") || lower.contains("làm thế nào");
    }

    private boolean isQuestionQuery(String lower, String unaccented) {
        return lower.contains("có nên") || lower.contains("co nen")
                || lower.contains("có được không") || lower.contains("co duoc khong")
                || lower.contains("liệu có") || lower.contains("lieu co")
                || lower.contains("tại sao") || lower.contains("tai sao")
                || lower.contains("khi nào") || lower.contains("khi nao")
                || lower.endsWith("không?") || lower.endsWith("khong?")
                || lower.contains("được không?") || lower.contains("duoc khong?");
    }

    private boolean isCancelQuery(String lower) {
        return lower.equals("thôi bỏ") || lower.equals("thôi") || lower.equals("hủy") || lower.equals("bỏ đi")
                || lower.contains("thôi không cần") || lower.equals("cancel");
    }

    private boolean isCommandPhrase(String lower, String unaccented) {
        return unaccented.contains("xoa") || unaccented.contains("thay") || unaccented.contains("doi")
                || unaccented.contains("tao") || unaccented.contains("them") || unaccented.contains("dong bo")
                || unaccented.contains("nhap") || unaccented.contains("chuyen") || unaccented.contains("out")
                || lower.contains("docs.google.com/spreadsheets");
    }
}
