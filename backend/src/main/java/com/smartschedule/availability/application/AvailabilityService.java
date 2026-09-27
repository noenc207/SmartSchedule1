package com.smartschedule.availability.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.api.AvailabilityDtos.*;
import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityService {
    private final AvailabilityRepository availabilities; private final AuthorizationService authorization;
    private final CurrentUserService currentUser; private final ActivityLogService activity;
    public AvailabilityService(AvailabilityRepository availabilities, AuthorizationService authorization, CurrentUserService currentUser, ActivityLogService activity) {
        this.availabilities = availabilities; this.authorization = authorization; this.currentUser = currentUser; this.activity = activity;
    }
    @Transactional(readOnly = true)
    public List<AvailabilityResponse> list(UUID scheduleId) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        return availabilities.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId).stream().map(this::toResponse).toList();
    }
    @Transactional
    public AvailabilityResponse create(UUID scheduleId, AvailabilityRequest r) {
        Schedule schedule = authorization.requireOwner(scheduleId, currentUser.requireUser().getId()); validate(r);
        if (availabilities.existsByScheduleIdAndWeekdayAndStartsAtAndEndsAt(scheduleId, r.dayOfWeek(), r.startTime(), r.endTime()))
            throw new DomainException("DUPLICATE_AVAILABILITY", 409, "This availability slot already exists.");
        Availability availability = availabilities.save(new Availability(schedule, r.dayOfWeek(), r.startTime(), r.endTime(), r.enabled()));
        schedule.incrementVersion();
        activity.record(scheduleId, currentUser.requireUser().getId(), "CREATE_AVAILABILITY"); return toResponse(availability);
    }
    @Transactional public AvailabilityResponse update(UUID id, AvailabilityRequest r) {
        Availability availability = requireOwned(id); validate(r);
        if (availabilities.existsByScheduleIdAndWeekdayAndStartsAtAndEndsAtAndIdNot(
                availability.getSchedule().getId(), r.dayOfWeek(), r.startTime(), r.endTime(), id)) {
            throw new DomainException("DUPLICATE_AVAILABILITY", 409, "This availability slot already exists.");
        }
        availability.update(r.dayOfWeek(), r.startTime(), r.endTime(), r.enabled());
        availability.getSchedule().incrementVersion();
        activity.record(availability.getSchedule().getId(), currentUser.requireUser().getId(), "UPDATE_AVAILABILITY"); return toResponse(availability);
    }
    @Transactional public void delete(UUID id) { Availability availability = requireOwned(id); availability.getSchedule().incrementVersion(); availabilities.delete(availability); activity.record(availability.getSchedule().getId(), currentUser.requireUser().getId(), "DELETE_AVAILABILITY"); }
    private Availability requireOwned(UUID id) {
        Availability a = availabilities.findById(id).orElseThrow(() -> new DomainException("AVAILABILITY_NOT_FOUND", 404, "Availability not found."));
        authorization.requireOwner(a.getSchedule().getId(), currentUser.requireUser().getId()); return a;
    }
    private void validate(AvailabilityRequest r) { if (!r.startTime().isBefore(r.endTime())) throw new DomainException("INVALID_AVAILABILITY", 422, "Availability start must be before end."); }
    private AvailabilityResponse toResponse(Availability a) { return new AvailabilityResponse(a.getId(), a.getSchedule().getId(), a.getWeekday(), a.getStartsAt(), a.getEndsAt(), a.isAvailable(), a.getCreatedAt(), a.getUpdatedAt()); }
}
