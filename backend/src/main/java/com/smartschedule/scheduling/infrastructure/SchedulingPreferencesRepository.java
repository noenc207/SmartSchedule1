package com.smartschedule.scheduling.infrastructure;

import com.smartschedule.scheduling.domain.SchedulingPreferences;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchedulingPreferencesRepository extends JpaRepository<SchedulingPreferences, UUID> {
    Optional<SchedulingPreferences> findByScheduleId(UUID scheduleId);
}
