package com.smartschedule.schedule.infrastructure;

import com.smartschedule.schedule.domain.ScheduleMember;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleMemberRepository extends JpaRepository<ScheduleMember, UUID> {
    Optional<ScheduleMember> findByScheduleIdAndUserId(UUID scheduleId, UUID userId);
    List<ScheduleMember> findAllByScheduleIdOrderByCreatedAtAsc(UUID scheduleId);
    List<ScheduleMember> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    boolean existsByScheduleIdAndUserId(UUID scheduleId, UUID userId);
    boolean existsByScheduleIdAndUserIdAndRole(UUID scheduleId, UUID userId, String role);
}