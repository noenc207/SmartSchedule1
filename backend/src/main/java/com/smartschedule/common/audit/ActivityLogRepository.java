package com.smartschedule.common.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findTop50ByScheduleIdOrderByCreatedAtDesc(UUID scheduleId);
}
