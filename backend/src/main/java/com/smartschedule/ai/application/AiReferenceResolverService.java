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
            "cái này", "cai nay", "cái kia", "cai kia", "nó", "no", "đó", "do",
            "lịch đó", "lich do", "môn này", "mon nay", "cái vừa tạo", "cai vua tao",
            "lịch vừa tạo", "lich vua tao", "cái mới tạo", "cai moi tao", "lịch mới tạo", "lich moi tao",
            "cái bên trên", "cai ben tren", "cái hôm qua", "cai hom qua", "lịch hôm qua", "lich hom qua",
            "cái ngày mai", "cai ngay mai"
    );

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

        String lower = userMessage.toLowerCase().trim();
        String detectedPronoun = null;
        for (String p : PRONOUNS) {
            if (lower.contains(p)) {
                detectedPronoun = p;
                break;
            }
        }

        // 1. If explicit selectedEventId exists in ClientContext
        if (clientContext != null && clientContext.selectedEventId() != null && !clientContext.selectedEventId().isBlank()) {
            try {
                UUID eventId = UUID.fromString(clientContext.selectedEventId().trim());
                String title = clientContext.selectedEventTitle() != null ? clientContext.selectedEventTitle() : "Sự kiện đang chọn";
                return new ResolvedReference(true, detectedPronoun != null ? detectedPronoun : "cái này", eventId, title, false, List.of());
            } catch (IllegalArgumentException ignored) {}
        }

        if (detectedPronoun == null) {
            return new ResolvedReference(false, null, null, null, false, List.of());
        }

        // 2. Pronoun references yesterday ("cái hôm qua")
        LocalDate targetDate = null;
        if (detectedPronoun.contains("hôm qua") || detectedPronoun.contains("hom qua")) {
            targetDate = LocalDate.now(AiDateTimeUtils.DEFAULT_ZONE).minusDays(1);
        } else if (detectedPronoun.contains("ngày mai") || detectedPronoun.contains("ngay mai")) {
            targetDate = LocalDate.now(AiDateTimeUtils.DEFAULT_ZONE).plusDays(1);
        }

        // 3. Search user's recent events in database
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
