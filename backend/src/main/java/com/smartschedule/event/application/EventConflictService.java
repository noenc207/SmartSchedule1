package com.smartschedule.event.application;

import com.smartschedule.event.api.EventDtos.*;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.schedule.application.AuthorizationService;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class EventConflictService {
    private final EventRepository events;
    private final RecurrenceService recurrence;
    private final AuthorizationService authorization; private final CurrentUserService currentUser;
    public EventConflictService(EventRepository events, RecurrenceService recurrence, AuthorizationService authorization, CurrentUserService currentUser) {
        this.events = events; this.recurrence = recurrence; this.authorization = authorization; this.currentUser = currentUser;
    }
    public ConflictCheckResponse check(UUID scheduleId, Instant startsAt, Instant endsAt, UUID excludeEventId) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        List<ConflictItem> conflicts = events.search(scheduleId, startsAt, endsAt, null, null, null).stream()
                .filter(event -> !event.getId().equals(excludeEventId))
                .flatMap(event -> recurrence.expand(event, startsAt, endsAt).stream()
                        .filter(occurrence -> occurrence.startsAt().isBefore(endsAt) && occurrence.endsAt().isAfter(startsAt))
                        .map(occurrence -> new ConflictItem(event.getId().toString(), event.getTitle(),
                                Duration.between(max(startsAt, occurrence.startsAt()), min(endsAt, occurrence.endsAt())).toMinutes())))
                .toList();
        return new ConflictCheckResponse(!conflicts.isEmpty(), conflicts);
    }
    private Instant max(Instant first, Instant second) { return first.isAfter(second) ? first : second; }
    private Instant min(Instant first, Instant second) { return first.isBefore(second) ? first : second; }
}
