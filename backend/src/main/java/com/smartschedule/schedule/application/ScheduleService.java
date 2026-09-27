package com.smartschedule.schedule.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.schedule.api.ScheduleDtos.*;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.domain.ScheduleMember;
import com.smartschedule.schedule.infrastructure.ScheduleMemberRepository;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {
    private final ScheduleRepository schedules;
    private final ScheduleMemberRepository scheduleMembers;
    private final CurrentUserService currentUser;
    private final AuthorizationService authorization;
    private final ActivityLogService activity;

    public ScheduleService(ScheduleRepository schedules, ScheduleMemberRepository scheduleMembers, CurrentUserService currentUser,
                           AuthorizationService authorization, ActivityLogService activity) {
        this.schedules = schedules;
        this.scheduleMembers = scheduleMembers;
        this.currentUser = currentUser;
        this.authorization = authorization;
        this.activity = activity;
    }

    @Transactional
    public ScheduleResponse create(CreateScheduleRequest request) {
        validate(request.timezone(), request.visibility());
        User owner = currentUser.requireUser();
        Schedule schedule = schedules.save(new Schedule(owner, request.name().trim(), request.description(),
                request.timezone(), visibility(request.visibility())));
        activity.record(schedule.getId(), owner.getId(), "CREATE_SCHEDULE");
        return toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleSummaryResponse> list() {
        UUID userId = currentUser.requireUser().getId();
        Map<UUID, ScheduleRoleInfo> byId = new LinkedHashMap<>();

        for (Schedule schedule : schedules.findAllByOwnerIdOrderByUpdatedAtDesc(userId)) {
            byId.put(schedule.getId(), new ScheduleRoleInfo(schedule, "OWNER", true));
        }

        for (ScheduleMember member : scheduleMembers.findAllByUserIdOrderByCreatedAtDesc(userId)) {
            Schedule schedule = member.getSchedule();
            if (schedule == null) {
                continue;
            }
            ScheduleRoleInfo current = byId.get(schedule.getId());
            if (current == null) {
                byId.put(schedule.getId(), new ScheduleRoleInfo(schedule, member.getRole(), false));
            }
        }

        List<ScheduleRoleInfo> values = new ArrayList<>(byId.values());
        values.sort(Comparator.comparing((ScheduleRoleInfo info) -> info.schedule().getUpdatedAt()).reversed());
        return values.stream()
                .map(info -> new ScheduleSummaryResponse(info.schedule().getId(), info.schedule().getName(),
                            info.schedule().getTimezone(), info.schedule().getVisibility(), info.role(), info.owned(),
                            info.schedule().getVersion()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ScheduleResponse get(UUID id) {
        return toResponse(authorization.requireAccess(id, currentUser.requireUser().getId()));
    }

    @Transactional
    public ScheduleResponse update(UUID id, UpdateScheduleRequest request) {
        validate(request.timezone(), request.visibility());
        User user = currentUser.requireUser();
        Schedule schedule = authorization.requireOwner(id, user.getId());
        if (request.version() != null && request.version() != schedule.getVersion()) {
            throw new DomainException("RESOURCE_VERSION_CONFLICT", 409,
                    "Lịch trình đã được cập nhật bởi một phiên làm việc khác (phiên bản hiện tại: " + schedule.getVersion() + "). Vui lòng làm mới.");
        }
        schedule.update(request.name().trim(), request.description(), request.timezone(), visibility(request.visibility()));
        schedule.incrementVersion();
        activity.record(id, user.getId(), "UPDATE_SCHEDULE");
        return toResponse(schedule);
    }

    @Transactional
    public void delete(UUID id) {
        User user = currentUser.requireUser();
        Schedule schedule = authorization.requireOwner(id, user.getId());
        schedules.delete(schedule);
        activity.record(id, user.getId(), "DELETE_SCHEDULE");
    }

    private void validate(String timezone, String visibility) {
        try { ZoneId.of(timezone); } catch (Exception e) { throw new DomainException("INVALID_TIMEZONE", 422, "Timezone is invalid."); }
        if (visibility != null && !List.of("PRIVATE", "PUBLIC", "SHARED").contains(visibility.toUpperCase())) {
            throw new DomainException("INVALID_VISIBILITY", 422, "Visibility is invalid.");
        }
    }

    private String visibility(String value) {
        return value == null ? "PRIVATE" : value.toUpperCase();
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(s.getId(), s.getOwner().getId(), s.getName(), s.getDescription(), s.getTimezone(),
                s.getVisibility(), s.getCreatedAt(), s.getUpdatedAt(), s.getVersion());
    }

    private record ScheduleRoleInfo(Schedule schedule, String role, boolean owned) {}
}