package com.smartschedule.portal.infrastructure;

import com.smartschedule.portal.domain.ScheduleImport;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleImportRepository extends JpaRepository<ScheduleImport, UUID> {
    List<ScheduleImport> findAllByScheduleIdOrderByCreatedAtDesc(UUID scheduleId);
    List<ScheduleImport> findTop10ByScheduleIdOrderByCreatedAtDesc(UUID scheduleId);
}
