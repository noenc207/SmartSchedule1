package com.smartschedule.event.infrastructure;

import com.smartschedule.event.domain.Event;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID> {
    @Query("select e from Event e where e.schedule.id = :scheduleId and ((e.startsAt < :to and e.endsAt > :from) or e.recurrenceRule is not null) and (:categoryId is null or e.category.id = :categoryId) and (:priority is null or e.priority = :priority) and (:status is null or e.status = :status) order by e.startsAt")
    List<Event> search(@Param("scheduleId") UUID scheduleId, @Param("from") Instant from, @Param("to") Instant to,
                       @Param("categoryId") UUID categoryId, @Param("priority") String priority, @Param("status") String status);
    Optional<Event> findByIdAndScheduleId(UUID id, UUID scheduleId);
    List<Event> findAllByScheduleId(UUID scheduleId);
    List<Event> findAllByScheduleIdAndGeneratedPlanId(UUID scheduleId, UUID generatedPlanId);
    @Query("select e from Event e where e.schedule.id = :scheduleId and e.generatedPlanId is not null order by e.startsAt")
    List<Event> findGeneratedByScheduleId(@Param("scheduleId") UUID scheduleId);
    @Query("select e from Event e where e.schedule.id = :scheduleId and e.sourceTaskId = :taskId and e.generatedPlanId is not null order by e.startsAt")
    List<Event> findAllByScheduleIdAndSourceTaskId(@Param("scheduleId") UUID scheduleId, @Param("taskId") UUID taskId);
    List<Event> findAllBySourceTaskId(UUID sourceTaskId);
    Optional<Event> findByScheduleIdAndExternalId(UUID scheduleId, String externalId);
    List<Event> findAllByScheduleIdAndExternalIdIn(UUID scheduleId, Collection<String> externalIds);
}
