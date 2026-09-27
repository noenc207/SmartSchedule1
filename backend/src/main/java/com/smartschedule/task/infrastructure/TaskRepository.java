package com.smartschedule.task.infrastructure;

import com.smartschedule.task.domain.Task;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

import jakarta.persistence.LockModeType;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByScheduleId(UUID scheduleId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Task t where t.id = :id")
    java.util.Optional<Task> findByIdWithLock(@Param("id") UUID id);
}

