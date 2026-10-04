package com.smartschedule.ai.application;

import com.smartschedule.ai.api.AiDtos;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves pronoun references (cái này, nó, cái kia, cái hôm qua, cái vừa tạo)
 * into concrete event IDs, titles, and candidates.
 */
@Service
public class AiReferenceResolverService {

    private static final List<String> PRONOUNS = List.of(
            "cái vừa tạo", "cai vua tao", "lịch vừa tạo", "lich vua tao",
            "cái mới tạo", "cai moi tao", "lịch mới tạo", "lich moi tao",
            "cái hôm qua", "cai hom qua", "lịch hôm qua", "lich hom qua",
            "cái ngày mai", "cai ngay mai", "lịch ngày mai", "lich ngay mai",
            "cái bên trên", "cai ben tren",
            "cái này", "cai nay", "lịch này", "lich nay",
            "cái kia", "cai kia", "lịch kia", "lich kia",
            "lịch đó", "lich do", "môn này", "mon nay", "môn đó", "mon do",
            "nó", "no", "đó", "do"
    );

    private static final List<Pattern> PRONOUN_PATTERNS;
    static {
        List<Pattern> patterns = new ArrayList<>();
        for (String p : PRONOUNS) {
            patterns.add(Pattern.compile("(?i)(?<=^|[\\s\\p{Punct}])" + Pattern.quote(p) + "(?=$|[\\s\\p{Punct}])"));
        }
        PRONOUN_PATTERNS = Collections.unmodifiableList(patterns);
    }

    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final AiAliasService aliasService;

    @Autowired
    public AiReferenceResolverService(
            @Autowired(required = false) EventRepository eventRepository,
            @Autowired(required = false) ScheduleRepository scheduleRepository,
            AiAliasService aliasService
    ) {
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.aliasService = aliasService;
    }

    public record CandidateEvent(
            UUID id,
            String title,
            String dateStr,
            String timeStr
    ) {}

    public record ResolvedReference(
            boolean hasReference,
            String pronoun,
            UUID targetEventId,
            String targetTitle,
            boolean isAmbiguous,
            List<CandidateEvent> candidates
    ) {}

    public ResolvedReference resolve(String userMessage, User user, AiDtos.ClientContextDto clientContext) {
        if (userMessage == null || userMessage.isBlank()) {
            return new ResolvedReference(false, null, null, null, false, List.of());
        }

        // 1. If explicit selectedEventId exists in ClientContext
        if (clientContext != null && clientContext.selectedEventId() != null && !clientContext.selectedEventId().isBlank()) {
            try {
                UUID eventId = UUID.fromString(clientContext.selectedEventId().trim());
                String title = clientContext.selectedEventTitle() != null ? clientContext.selectedEventTitle() : "Sự kiện đang chọn";
                return new ResolvedReference(true, "cái này", eventId, title, false, List.of());
            } catch (IllegalArgumentException ignored) {}
        }

        // 2. Strip URLs completely so domain components (e.g. docs.google.com, /d/..., .com) never trigger pronouns
        String textWithoutUrls = userMessage.replaceAll("https?://\\S+", " ").trim();
        String lowerClean = textWithoutUrls.toLowerCase();

        // 3. If message mentions spreadsheets or external documents (e.g. "Google Sheet này", "sheet này", "bảng tính này"),
        // the word "này" / "đó" refers to the sheet/file/URL, NOT a calendar event in the database!
        boolean isSheetContext = lowerClean.contains("sheet")
                || lowerClean.contains("bảng tính")
                || lowerClean.contains("bang tinh")
                || lowerClean.contains("spreadsheet")
                || userMessage.toLowerCase().contains("docs.google.com/spreadsheets");
        if (isSheetContext) {
            return new ResolvedReference(false, null, null, null, false, List.of());
        }

        // 4. Match pronouns using strict word-boundary patterns (never raw substring contains)
        String detectedPronoun = null;
        for (int i = 0; i < PRONOUNS.size(); i++) {
            if (PRONOUN_PATTERNS.get(i).matcher(textWithoutUrls).find()) {
                detectedPronoun = PRONOUNS.get(i);
                break;
            }
        }

        if (detectedPronoun == null) {
            return new ResolvedReference(false, null, null, null, false, List.of());
        }

        // 5. Pronoun references yesterday ("cái hôm qua") or tomorrow ("cái ngày mai")
        LocalDate targetDate = null;
        if (detectedPronoun.contains("hôm qua") || detectedPronoun.contains("hom qua")) {
            targetDate = LocalDate.now(AiDateTimeUtils.DEFAULT_ZONE).minusDays(1);
        } else if (detectedPronoun.contains("ngày mai") || detectedPronoun.contains("ngay mai")) {
            targetDate = LocalDate.now(AiDateTimeUtils.DEFAULT_ZONE).plusDays(1);
        }

        // 6. Search user's recent events in database
        List<CandidateEvent> candidates = findUserEventCandidates(user, targetDate);

        if (candidates.isEmpty()) {
            // Cannot resolve pronoun
            return new ResolvedReference(true, detectedPronoun, null, null, true, List.of());
        }

        if (candidates.size() == 1) {
            CandidateEvent single = candidates.getFirst();
            return new ResolvedReference(true, detectedPronoun, single.id(), single.title(), false, candidates);
        }

        // Multiple candidates -> Ambiguous!
        return new ResolvedReference(true, detectedPronoun, null, null, true, candidates);
    }

    public List<CandidateEvent> findMatchingSubjectEvents(User user, String subject) {
        if (user == null || eventRepository == null || scheduleRepository == null) return List.of();
        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        if (schedules.isEmpty()) return List.of();

        List<CandidateEvent> matches = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        String canonicalSubject = aliasService.resolveSubject(subject).orElse(subject).toLowerCase();

        for (Schedule s : schedules) {
            List<Event> events = eventRepository.findAllByScheduleId(s.getId());
            for (Event e : events) {
                if (e.getTitle() != null && (e.getTitle().toLowerCase().contains(canonicalSubject) || canonicalSubject.contains(e.getTitle().toLowerCase()))) {
                    ZonedDateTime start = e.getStartsAt().atZone(AiDateTimeUtils.DEFAULT_ZONE);
                    matches.add(new CandidateEvent(e.getId(), e.getTitle(), start.format(dateFmt), start.format(timeFmt)));
                }
            }
        }
        return matches;
    }

    private List<CandidateEvent> findUserEventCandidates(User user, LocalDate filterDate) {
        if (user == null || eventRepository == null || scheduleRepository == null) return List.of();
        List<Schedule> schedules = scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId());
        if (schedules.isEmpty()) return List.of();

        List<CandidateEvent> list = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        for (Schedule s : schedules) {
            List<Event> events = eventRepository.findAllByScheduleId(s.getId());
            for (Event e : events) {
                ZonedDateTime start = e.getStartsAt().atZone(AiDateTimeUtils.DEFAULT_ZONE);
                if (filterDate != null) {
                    if (start.toLocalDate().equals(filterDate)) {
                        list.add(new CandidateEvent(e.getId(), e.getTitle(), start.format(dateFmt), start.format(timeFmt)));
                    }
                } else {
                    list.add(new CandidateEvent(e.getId(), e.getTitle(), start.format(dateFmt), start.format(timeFmt)));
                }
            }
        }
        return list;
    }
}
