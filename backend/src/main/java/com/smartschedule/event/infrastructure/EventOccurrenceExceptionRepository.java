package com.smartschedule.event.infrastructure;

import com.smartschedule.event.domain.EventOccurrenceException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOccurrenceExceptionRepository extends JpaRepository<EventOccurrenceException, UUID> {
    Optional<EventOccurrenceException> findByEventIdAndOccurrenceStart(UUID eventId, Instant occurrenceStart);
}
