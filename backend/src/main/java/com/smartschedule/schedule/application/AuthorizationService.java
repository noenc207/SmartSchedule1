package com.smartschedule.schedule.application;

import com.smartschedule.auth.application.AuthException;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleMemberRepository;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuthorizationService {
    private final ScheduleRepository schedules;
    private final ScheduleMemberRepository members;

    public AuthorizationService(ScheduleRepository schedules, ScheduleMemberRepository members) {
        this.schedules = schedules;
        this.members = members;
    }

    public Schedule requireOwner(UUID scheduleId, UUID userId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new AuthException("FORBIDDEN", "You do not have access to this schedule."));
        if (schedule.getOwner() != null && schedule.getOwner().getId().equals(userId)) {
            return schedule;
        }
        if (members.existsByScheduleIdAndUserIdAndRole(scheduleId, userId, "OWNER")) {
            return schedule;
        }
        throw new AuthException("FORBIDDEN", "You do not have access to this schedule.");
    }

    public Schedule requireEditor(UUID scheduleId, UUID userId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new AuthException("FORBIDDEN", "You do not have access to this schedule."));
        if (schedule.getOwner() != null && schedule.getOwner().getId().equals(userId)) {
            return schedule;
        }
        if (members.existsByScheduleIdAndUserIdAndRole(scheduleId, userId, "OWNER")
                || members.existsByScheduleIdAndUserIdAndRole(scheduleId, userId, "EDITOR")) {
            return schedule;
        }
        throw new AuthException("FORBIDDEN", "You do not have access to this schedule.");
    }

    public Schedule requireViewer(UUID scheduleId, UUID userId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new AuthException("FORBIDDEN", "You do not have access to this schedule."));
        if (schedule.getOwner() != null && schedule.getOwner().getId().equals(userId)) {
            return schedule;
        }
        if (members.existsByScheduleIdAndUserId(scheduleId, userId)) {
            return schedule;
        }
        throw new AuthException("FORBIDDEN", "You do not have access to this schedule.");
    }

    public Schedule requireAccess(UUID scheduleId, UUID userId) {
        return requireViewer(scheduleId, userId);
    }
}