package com.smartschedule.schedule.api;

import com.smartschedule.schedule.application.CollaborationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CollaborationController {
    private final CollaborationService service;

    public CollaborationController(CollaborationService service) {
        this.service = service;
    }

    @GetMapping("/schedules/{scheduleId}/members")
    public List<ScheduleDtos.ScheduleMemberResponse> listMembers(@PathVariable UUID scheduleId) {
        return service.listMembers(scheduleId);
    }

    @PostMapping("/schedules/{scheduleId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleDtos.ScheduleMemberResponse inviteMember(@PathVariable UUID scheduleId,
                                                          @Valid @RequestBody ScheduleDtos.MemberInviteRequest request) {
        return service.inviteMember(scheduleId, request);
    }

    @PutMapping("/schedules/{scheduleId}/members/{userId}")
    public ScheduleDtos.ScheduleMemberResponse updateRole(@PathVariable UUID scheduleId,
                                                        @PathVariable UUID userId,
                                                        @Valid @RequestBody ScheduleDtos.MemberRoleRequest request) {
        return service.updateRole(scheduleId, userId, request);
    }

    @DeleteMapping("/schedules/{scheduleId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID scheduleId, @PathVariable UUID userId) {
        service.removeMember(scheduleId, userId);
    }

    @GetMapping("/schedules/{scheduleId}/team-availability")
    public ScheduleDtos.TeamAvailabilityResponse getTeamAvailability(@PathVariable UUID scheduleId,
                                                                  @RequestParam java.time.Instant from,
                                                                  @RequestParam java.time.Instant to,
                                                                  @RequestParam(required = false) Integer minimumMembers) {
        return service.getTeamAvailability(scheduleId, from, to, minimumMembers);
    }

    @GetMapping("/schedules/{scheduleId}/meeting-suggestions")
    public List<ScheduleDtos.TeamAvailabilitySlotResponse> suggestMeetings(@PathVariable UUID scheduleId,
                                                                          @RequestParam java.time.Instant from,
                                                                          @RequestParam java.time.Instant to,
                                                                          @RequestParam(required = false) Integer durationMinutes) {
        return service.suggestMeetings(scheduleId, from, to, durationMinutes);
    }

    @GetMapping("/schedules/{scheduleId}/share-links")
    public List<ScheduleDtos.ShareLinkResponse> listShareLinks(@PathVariable UUID scheduleId) {
        return service.listShareLinks(scheduleId);
    }

    @PostMapping("/schedules/{scheduleId}/share-links")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleDtos.ShareLinkResponse createShareLink(@PathVariable UUID scheduleId,
                                                        @Valid @RequestBody ScheduleDtos.ShareLinkCreateRequest request,
                                                        HttpServletRequest httpRequest) {
        return service.createShareLink(scheduleId, request, httpRequest);
    }

    @DeleteMapping("/schedules/{scheduleId}/share-links/{shareLinkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShareLink(@PathVariable UUID scheduleId, @PathVariable UUID shareLinkId) {
        service.revokeShareLink(scheduleId, shareLinkId);
    }

    @GetMapping("/schedules/{scheduleId}/activity")
    public List<ScheduleDtos.ActivityItemResponse> listActivity(@PathVariable UUID scheduleId) {
        return service.listActivity(scheduleId);
    }

    @GetMapping("/shared/{token}")
    public ScheduleDtos.PublicScheduleResponse publicSchedule(@PathVariable String token) {
        return service.getPublicSchedule(token);
    }
}