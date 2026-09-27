package com.smartschedule.common.audit;

import java.util.UUID;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {
    private final ActivityLogRepository logs;
    private final EntityManager entityManager;

    public ActivityLogService() {
        this.logs = null;
        this.entityManager = null;
    }

    @Autowired
    public ActivityLogService(ActivityLogRepository logs, EntityManager entityManager) {
        this.logs = logs;
        this.entityManager = entityManager;
    }

    public void record(UUID scheduleId, UUID actorId, String action) {
        if (logs == null) {
            return;
        }
        logs.save(new ActivityLog(
                entityManager.getReference(com.smartschedule.schedule.domain.Schedule.class, scheduleId),
                entityManager.getReference(com.smartschedule.user.domain.User.class, actorId),
                action));
    }
}
