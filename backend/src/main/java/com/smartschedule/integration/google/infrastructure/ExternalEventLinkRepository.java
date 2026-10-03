package com.smartschedule.integration.google.infrastructure;

import com.smartschedule.integration.google.domain.ExternalEventLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExternalEventLinkRepository extends JpaRepository<ExternalEventLink, UUID> {
    Optional<ExternalEventLink> findByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
            UUID userId, String provider, String externalCalendarId, String externalEventId
    );

    boolean existsByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
            UUID userId, String provider, String externalCalendarId, String externalEventId
    );

    Optional<ExternalEventLink> findBySmartEventId(UUID smartEventId);

    List<ExternalEventLink> findAllByUserIdAndProvider(UUID userId, String provider);

    void deleteAllByUserId(UUID userId);
}
