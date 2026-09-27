package com.smartschedule.schedule.application;

import com.smartschedule.common.audit.ActivityLog;
import com.smartschedule.common.audit.ActivityLogRepository;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.availability.domain.Availability;
import com.smartschedule.availability.infrastructure.AvailabilityRepository;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.schedule.api.ScheduleDtos.*;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.domain.ScheduleMember;
import com.smartschedule.schedule.domain.ShareLink;
import com.smartschedule.schedule.infrastructure.ScheduleMemberRepository;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.schedule.infrastructure.ShareLinkRepository;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CollaborationService {
    private final ScheduleRepository schedules;
    private final ScheduleMemberRepository members;
    private final UserRepository users;
    private final ShareLinkRepository shareLinks;
    private final AvailabilityRepository availabilities;
    private final EventRepository events;
    private final AuthorizationService authorization;
    private final CurrentUserService currentUser;
    private final ActivityLogRepository activityLogs;

    public CollaborationService(ScheduleRepository schedules, ScheduleMemberRepository members, UserRepository users,
                                ShareLinkRepository shareLinks, AvailabilityRepository availabilities,
                                EventRepository events, AuthorizationService authorization, CurrentUserService currentUser,
                                ActivityLogRepository activityLogs) {
        this.schedules = schedules;
        this.members = members;
        this.users = users;
        this.shareLinks = shareLinks;
        this.availabilities = availabilities;
        this.events = events;
        this.authorization = authorization;
        this.currentUser = currentUser;
        this.activityLogs = activityLogs;
    }

    @Transactional(readOnly = true)
    public List<ScheduleMemberResponse> listMembers(UUID scheduleId) {
        Schedule schedule = authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        List<ScheduleMemberResponse> result = new ArrayList<>();
        result.add(new ScheduleMemberResponse(schedule.getOwner().getId(), schedule.getOwner().getEmail(),
                schedule.getOwner().getDisplayName(), "OWNER", schedule.getCreatedAt()));
        result.addAll(members.findAllByScheduleIdOrderByCreatedAtAsc(scheduleId).stream()
                .filter(member -> !member.getUser().getId().equals(schedule.getOwner().getId()))
                .map(member -> new ScheduleMemberResponse(member.getUser().getId(), member.getUser().getEmail(),
                        member.getUser().getDisplayName(), member.getRole(), member.getCreatedAt()))
                .toList());
        return result;
    }

    @Transactional
    public ScheduleMemberResponse inviteMember(UUID scheduleId, MemberInviteRequest request) {
        User actor = currentUser.requireUser();
        authorization.requireOwner(scheduleId, actor.getId());
        String normalizedRole = normalizeRole(request.role());
        if (!"EDITOR".equals(normalizedRole) && !"VIEWER".equals(normalizedRole)) {
            throw new DomainException("INVALID_MEMBER_ROLE", 422, "Role must be EDITOR or VIEWER.");
        }
        User user = users.findByEmailIgnoreCaseAndDeletedAtIsNull(request.email().trim())
                .orElseThrow(() -> new DomainException("USER_NOT_FOUND", 404, "No active user exists for that email."));
        if (user.getId().equals(actor.getId())) {
            throw new DomainException("INVALID_MEMBER_ROLE", 409, "The owner is already a member of the schedule.");
        }
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new DomainException("SCHEDULE_NOT_FOUND", 404, "Schedule not found."));
        if (members.existsByScheduleIdAndUserId(scheduleId, user.getId())) {
            throw new DomainException("MEMBER_ALREADY_EXISTS", 409, "This user is already a member of the schedule.");
        }
        ScheduleMember member = members.save(new ScheduleMember(schedule, user, normalizedRole));
        activityLogs.save(new ActivityLog(schedule, actor, "MEMBER_INVITED"));
        return new ScheduleMemberResponse(user.getId(), user.getEmail(), user.getDisplayName(), member.getRole(), member.getCreatedAt());
    }

    @Transactional
    public ScheduleMemberResponse updateRole(UUID scheduleId, UUID memberUserId, MemberRoleRequest request) {
        User actor = currentUser.requireUser();
        authorization.requireOwner(scheduleId, actor.getId());
        String normalizedRole = normalizeRole(request.role());
        ScheduleMember member = members.findByScheduleIdAndUserId(scheduleId, memberUserId)
                .orElseThrow(() -> new DomainException("MEMBER_NOT_FOUND", 404, "Member not found."));
        if ("OWNER".equalsIgnoreCase(member.getRole())) {
            throw new DomainException("INVALID_MEMBER_ROLE", 409, "The owner role cannot be changed from this endpoint.");
        }
        if (!"EDITOR".equals(normalizedRole) && !"VIEWER".equals(normalizedRole)) {
            throw new DomainException("INVALID_MEMBER_ROLE", 422, "Role must be EDITOR or VIEWER.");
        }
        member.setRole(normalizedRole);
        activityLogs.save(new ActivityLog(member.getSchedule(), actor, "MEMBER_ROLE_CHANGED"));
        return new ScheduleMemberResponse(member.getUser().getId(), member.getUser().getEmail(),
                member.getUser().getDisplayName(), member.getRole(), member.getCreatedAt());
    }

    @Transactional
    public void removeMember(UUID scheduleId, UUID memberUserId) {
        User actor = currentUser.requireUser();
        authorization.requireOwner(scheduleId, actor.getId());
        ScheduleMember member = members.findByScheduleIdAndUserId(scheduleId, memberUserId)
                .orElseThrow(() -> new DomainException("MEMBER_NOT_FOUND", 404, "Member not found."));
        if ("OWNER".equalsIgnoreCase(member.getRole())) {
            throw new DomainException("INVALID_MEMBER_ROLE", 409, "The owner cannot be removed from the schedule.");
        }
        members.delete(member);
        activityLogs.save(new ActivityLog(member.getSchedule(), actor, "MEMBER_REMOVED"));
    }

    @Transactional(readOnly = true)
    public TeamAvailabilityResponse getTeamAvailability(UUID scheduleId, Instant from, Instant to, Integer minimumMembers) {
        if (from == null || to == null || !from.isBefore(to)) {
            throw new DomainException("INVALID_TIME_RANGE", 422, "from must be before to.");
        }
        User actor = currentUser.requireUser();
        Schedule schedule = authorization.requireEditor(scheduleId, actor.getId());
        List<UUID> memberIds = buildMemberIds(scheduleId, schedule);
        int totalMembers = memberIds.size();
        if (totalMembers == 0) {
            return new TeamAvailabilityResponse(List.of(), 0, from, to);
        }

        ZoneId zone = ZoneId.of(schedule.getTimezone());
        List<Availability> rules = availabilities.findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(scheduleId);
        List<TeamAvailabilitySlotResponse> slots = new ArrayList<>();
        Instant check = from;
        while (!check.isAfter(to)) {
            Instant candidateEnd = check.plusSeconds(1800L);
            if (candidateEnd.isAfter(to)) {
                break;
            }
            LocalDate date = check.atZone(zone).toLocalDate();
            LocalTime startTime = check.atZone(zone).toLocalTime();
            LocalTime endTime = candidateEnd.atZone(zone).toLocalTime();
            if (scheduleHasAvailabilityForPeriod(rules, date, startTime, endTime)) {
                slots.add(new TeamAvailabilitySlotResponse(check, candidateEnd, totalMembers, totalMembers));
            }
            check = candidateEnd;
        }

        if (minimumMembers != null && minimumMembers > 0) {
            slots = slots.stream().filter(slot -> slot.availableMembers() >= minimumMembers).toList();
        }

        return new TeamAvailabilityResponse(slots, totalMembers, from, to);
    }

    @Transactional(readOnly = true)
    public List<TeamAvailabilitySlotResponse> suggestMeetings(UUID scheduleId, Instant from, Instant to, Integer durationMinutes) {
        TeamAvailabilityResponse availability = getTeamAvailability(scheduleId, from, to, null);
        int minutes = durationMinutes == null || durationMinutes <= 0 ? 30 : durationMinutes;
        Duration duration = Duration.ofMinutes(minutes);
        List<TeamAvailabilitySlotResponse> suggestions = new ArrayList<>();
        for (TeamAvailabilitySlotResponse slot : availability.slots()) {
            if (Duration.between(slot.start(), slot.end()).compareTo(duration) >= 0) {
                suggestions.add(new TeamAvailabilitySlotResponse(slot.start(), slot.start().plus(duration), slot.availableMembers(), slot.totalMembers()));
            }
        }
        suggestions.sort(Comparator.comparing(TeamAvailabilitySlotResponse::availableMembers).reversed()
                .thenComparing(TeamAvailabilitySlotResponse::start));
        return suggestions.stream().limit(5).toList();
    }

    @Transactional(readOnly = true)
    public List<ShareLinkResponse> listShareLinks(UUID scheduleId) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        return shareLinks.findAllByScheduleIdOrderByCreatedAtDesc(scheduleId).stream()
                .map(link -> new ShareLinkResponse(link.getId(), link.getMode(), link.getExpiresAt(), link.getRevokedAt(),
                        link.getCreatedAt(), null))
                .toList();
    }

    @Transactional
    public ShareLinkResponse createShareLink(UUID scheduleId, ShareLinkCreateRequest request, HttpServletRequest httpRequest) {
        User actor = currentUser.requireUser();
        authorization.requireOwner(scheduleId, actor.getId());
        String mode = request == null || request.mode() == null ? "VIEW_ONLY" : normalizeMode(request.mode());
        Instant expiresAt = request == null ? null : request.expiresAt();
        String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = ShareLink.hashToken(rawToken);
        ShareLink link = shareLinks.save(new ShareLink(schedules.getReferenceById(scheduleId), tokenHash, expiresAt, mode));
        activityLogs.save(new ActivityLog(link.getSchedule(), actor, "SCHEDULE_SHARED"));
        String url = buildShareUrl(httpRequest, rawToken);
        return new ShareLinkResponse(link.getId(), link.getMode(), link.getExpiresAt(), link.getRevokedAt(),
                link.getCreatedAt(), url);
    }

    @Transactional
    public void revokeShareLink(UUID scheduleId, UUID linkId) {
        User actor = currentUser.requireUser();
        authorization.requireOwner(scheduleId, actor.getId());
        ShareLink link = shareLinks.findById(linkId).orElseThrow(() -> new DomainException("SHARE_LINK_NOT_FOUND", 404, "Share link not found."));
        if (!link.getSchedule().getId().equals(scheduleId)) {
            throw new DomainException("SHARE_LINK_NOT_FOUND", 404, "Share link not found.");
        }
        if (link.getRevokedAt() == null) {
            link.revoke();
            activityLogs.save(new ActivityLog(link.getSchedule(), actor, "SHARE_REVOKED"));
        }
    }

    @Transactional(readOnly = true)
    public PublicScheduleResponse getPublicSchedule(String token) {
        String tokenHash = ShareLink.hashToken(token);
        ShareLink link = shareLinks.findActiveByToken(tokenHash, Instant.now())
                .orElseThrow(() -> new DomainException("SHARE_LINK_NOT_FOUND", 404, "Shared schedule not found."));
        Schedule schedule = link.getSchedule();
        List<Event> items = events.findAllByScheduleId(schedule.getId());
        List<PublicScheduleEventResponse> publicEvents = items.stream()
                .filter(event -> event.getStatus() == null || !"CANCELLED".equalsIgnoreCase(event.getStatus()))
                .sorted(Comparator.comparing(Event::getStartsAt))
                .map(event -> new PublicScheduleEventResponse(event.getTitle(), event.getStartsAt(), event.getEndsAt(),
                        event.getLocation(), event.getCategory() != null ? event.getCategory().getColor() : null))
                .toList();
        return new PublicScheduleResponse(schedule.getName(), schedule.getTimezone(), publicEvents);
    }

    @Transactional(readOnly = true)
    public List<ActivityItemResponse> listActivity(UUID scheduleId) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        return activityLogs.findTop50ByScheduleIdOrderByCreatedAtDesc(scheduleId).stream()
                .map(log -> new ActivityItemResponse(log.getId(), log.getAction(),
                        log.getActor() == null ? null : log.getActor().getDisplayName(), log.getCreatedAt()))
                .toList();
    }

    private String normalizeRole(String role) {
        return role == null ? "VIEWER" : role.trim().toUpperCase();
    }

    private String normalizeMode(String mode) {
        return mode == null ? "VIEW_ONLY" : mode.trim().toUpperCase();
    }

    private List<UUID> buildMemberIds(UUID scheduleId, Schedule schedule) {
        Set<UUID> ids = new LinkedHashSet<>();
        ids.add(schedule.getOwner().getId());
        for (ScheduleMember member : members.findAllByScheduleIdOrderByCreatedAtAsc(scheduleId)) {
            ids.add(member.getUser().getId());
        }
        return new ArrayList<>(ids);
    }

    private boolean scheduleHasAvailabilityForPeriod(List<Availability> rules, LocalDate date, LocalTime startTime, LocalTime endTime) {
        for (Availability availability : rules) {
            if (!availability.isAvailable()) {
                continue;
            }
            int dayOfWeek = date.getDayOfWeek().getValue();
            boolean dateMatch = availability.getSpecificDate() != null && availability.getSpecificDate().equals(date);
            boolean weekdayMatch = availability.getWeekday() != null && availability.getWeekday().equals(dayOfWeek);
            if (!dateMatch && !weekdayMatch) {
                continue;
            }
            LocalTime availabilityStart = availability.getStartsAt();
            LocalTime availabilityEnd = availability.getEndsAt();
            if (!startTime.isBefore(availabilityStart) && !endTime.isAfter(availabilityEnd)) {
                return true;
            }
        }
        return false;
    }

    private String buildShareUrl(HttpServletRequest request, String rawToken) {
        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            origin = request.getScheme() + "://" + request.getServerName();
            int port = request.getServerPort();
            if (port != 80 && port != 443) {
                origin = origin + ":" + port;
            }
        }
        return origin + "/shared/" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }
}