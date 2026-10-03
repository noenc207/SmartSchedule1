package com.smartschedule.integration.google.infrastructure;

import com.smartschedule.integration.google.domain.GoogleConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoogleConnectionRepository extends JpaRepository<GoogleConnection, UUID> {
    Optional<GoogleConnection> findByUserIdAndRevokedAtIsNull(UUID userId);
    Optional<GoogleConnection> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
    void deleteAllByUserId(UUID userId);
}
