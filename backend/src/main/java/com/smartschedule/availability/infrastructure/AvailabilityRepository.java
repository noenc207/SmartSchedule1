package com.smartschedule.availability.infrastructure;

import com.smartschedule.availability.domain.Availability;
import java.time.LocalTime;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRepository extends JpaRepository<Availability, UUID> {
    List<Availability> findAllByScheduleIdOrderByWeekdayAscStartsAtAsc(UUID scheduleId);
    Optional<Availability> findByIdAndScheduleId(UUID id, UUID scheduleId);
    boolean existsByScheduleIdAndWeekdayAndStartsAtAndEndsAt(UUID scheduleId, Integer weekday, LocalTime startsAt, LocalTime endsAt);
    boolean existsByScheduleIdAndWeekdayAndStartsAtAndEndsAtAndIdNot(UUID scheduleId, Integer weekday, LocalTime startsAt, LocalTime endsAt, UUID id);
}
