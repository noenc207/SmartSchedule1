package com.smartschedule.event.api;

import com.smartschedule.event.api.EventDtos.*;
import com.smartschedule.event.application.EventService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class EventController {
    private final EventService service; private final com.smartschedule.event.application.EventConflictService conflicts;
    private final com.smartschedule.event.application.ConflictAnalysisService analysis;
    public EventController(EventService service, com.smartschedule.event.application.EventConflictService conflicts,
                            com.smartschedule.event.application.ConflictAnalysisService analysis) {
        this.service = service; this.conflicts = conflicts; this.analysis = analysis;
    }
    @GetMapping("/api/v1/schedules/{scheduleId}/events")
    public List<EventResponse> list(@PathVariable UUID scheduleId, @RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to,
                                    @RequestParam(required = false) UUID category, @RequestParam(required = false) String priority,
                                    @RequestParam(required = false) String status) { return service.list(scheduleId, from, to, category, priority, status); }
    @PostMapping("/api/v1/schedules/{scheduleId}/events")
    @ResponseStatus(HttpStatus.CREATED) public EventResponse create(@PathVariable UUID scheduleId, @Valid @RequestBody EventRequest r) { return service.create(scheduleId, r); }
    @GetMapping("/api/v1/events/{id}") public EventResponse get(@PathVariable UUID id) { return service.get(id); }
    @PutMapping("/api/v1/events/{id}") public EventResponse update(@PathVariable UUID id, @Valid @RequestBody EventRequest r) { return service.update(id, r); }
    @PatchMapping("/api/v1/events/{id}") public EventResponse patch(@PathVariable UUID id, @Valid @RequestBody EventRequest r) { return service.update(id, r); }
    @DeleteMapping("/api/v1/events/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
    @PostMapping("/api/v1/events/{id}/duplicate") @ResponseStatus(HttpStatus.CREATED) public EventResponse duplicate(@PathVariable UUID id) { return service.duplicate(id); }
    @PutMapping("/api/v1/events/{id}/occurrence-exception")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveOccurrenceException(@PathVariable UUID id, @Valid @RequestBody OccurrenceExceptionRequest request) {
        service.saveOccurrenceException(id, request);
    }
    @DeleteMapping("/api/v1/events/{id}/occurrence-exception")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOccurrenceException(@PathVariable UUID id, @RequestParam Instant occurrenceStart) {
        service.deleteOccurrenceException(id, occurrenceStart);
    }
    @PostMapping("/api/v1/events/check-conflict") public ConflictCheckResponse conflict(@RequestParam UUID scheduleId, @RequestParam Instant startsAt,
                                                                                           @RequestParam Instant endsAt, @RequestParam(required = false) UUID excludeEventId) {
        if (!startsAt.isBefore(endsAt)) throw new com.smartschedule.common.error.DomainException("INVALID_TIME_RANGE", 422, "Event start must be before event end.");
        return conflicts.check(scheduleId, startsAt, endsAt, excludeEventId);
    }
    @GetMapping("/api/v1/schedules/{scheduleId}/conflicts")
    public ConflictAnalysisResponse analyze(@PathVariable UUID scheduleId, @RequestParam Instant from, @RequestParam Instant to) {
        if (!from.isBefore(to)) throw new com.smartschedule.common.error.DomainException("INVALID_TIME_RANGE", 422, "Conflict analysis range must be valid.");
        return analysis.analyze(scheduleId, from, to);
    }
}
