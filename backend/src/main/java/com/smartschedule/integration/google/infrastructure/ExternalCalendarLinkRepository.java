package com.smartschedule.integration.google.infrastructure;

import com.smartschedule.integration.google.domain.ExternalCalendarLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExternalCalendarLinkRepository extends JpaRepository<ExternalCalendarLink, UUID> {
    Optional<ExternalCalendarLink> findByUserIdAndProviderAndExternalCalendarId(UUID userId, String provider, String externalCalendarId);
    List<ExternalCalendarLink> findAllByUserIdAndProvider(UUID userId, String provider);
    void deleteAllByUserId(UUID userId);
}
