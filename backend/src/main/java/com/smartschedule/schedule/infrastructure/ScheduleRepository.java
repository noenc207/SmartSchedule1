package com.smartschedule.schedule.infrastructure;

import com.smartschedule.schedule.domain.Schedule;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    Optional<Schedule> findByIdAndOwnerId(UUID id, UUID ownerId);
    List<Schedule> findAllByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
}