package com.smartschedule.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.schedule.api.ScheduleDtos.ScheduleSummaryResponse;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.application.ScheduleService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.domain.ScheduleMember;
import com.smartschedule.schedule.domain.ShareLink;
import com.smartschedule.schedule.infrastructure.ScheduleMemberRepository;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CollaborationPhase7Test {
    @Test
    void authorizationRecognizesMemberRoles() {
        ScheduleRepository schedules = mock(ScheduleRepository.class);
        ScheduleMemberRepository members = mock(ScheduleMemberRepository.class);
        AuthorizationService authorization = new AuthorizationService(schedules, members);

        User owner = new User("owner@example.com", "hash", "Owner");
        Schedule schedule = new Schedule(owner, "Shared plan", "Desc", "UTC", "SHARED");
        UUID scheduleId = schedule.getId();

        org.mockito.Mockito.when(schedules.findById(scheduleId)).thenReturn(Optional.of(schedule));
        org.mockito.Mockito.when(members.existsByScheduleIdAndUserId(scheduleId, owner.getId())).thenReturn(false);
        org.mockito.Mockito.when(members.existsByScheduleIdAndUserIdAndRole(scheduleId, owner.getId(), "OWNER")).thenReturn(false);
        org.mockito.Mockito.when(members.existsByScheduleIdAndUserIdAndRole(scheduleId, owner.getId(), "EDITOR")).thenReturn(true);

        assertThat(authorization.requireEditor(scheduleId, owner.getId()).getId()).isEqualTo(scheduleId);
        assertThat(authorization.requireAccess(scheduleId, owner.getId())).isNotNull();
    }

    @Test
    void scheduleListIncludesSharedMemberships() {
        ScheduleRepository schedules = mock(ScheduleRepository.class);
        ScheduleMemberRepository members = mock(ScheduleMemberRepository.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        AuthorizationService authorization = new AuthorizationService(schedules, members);
        ActivityLogService activity = new ActivityLogService();

        User owner = new User("owner@example.com", "hash", "Owner");
        User collaborator = new User("collab@example.com", "hash", "Collaborator");
        Schedule schedule = new Schedule(owner, "Planning", "Desc", "UTC", "SHARED");

        org.mockito.Mockito.when(currentUser.requireUser()).thenReturn(collaborator);
        org.mockito.Mockito.when(schedules.findAllByOwnerIdOrderByUpdatedAtDesc(collaborator.getId())).thenReturn(List.of());
        org.mockito.Mockito.when(members.findAllByUserIdOrderByCreatedAtDesc(collaborator.getId())).thenReturn(List.of(
                new ScheduleMember(schedule, collaborator, "VIEWER")));

        ScheduleService service = new ScheduleService(schedules, members, currentUser, authorization, activity);
        List<ScheduleSummaryResponse> result = service.list();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).role()).isEqualTo("VIEWER");
        assertThat(result.get(0).owned()).isFalse();
    }

    @Test
    void shareLinksHashTokensWithoutStoringRawValues() {
        String rawToken = "abc123share-link-token";
        String hashed = ShareLink.hashToken(rawToken);

        assertThat(hashed).isNotBlank();
        assertThat(hashed).isNotEqualTo(rawToken);
        assertThat(ShareLink.hashToken(rawToken)).isEqualTo(hashed);
    }
}