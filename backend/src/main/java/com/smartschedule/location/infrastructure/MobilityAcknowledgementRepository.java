package com.smartschedule.location.infrastructure;

import com.smartschedule.location.domain.MobilityAcknowledgement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MobilityAcknowledgementRepository extends JpaRepository<MobilityAcknowledgement, UUID> {
    Optional<MobilityAcknowledgement> findByUserIdAndSignature(UUID userId, String signature);
    boolean existsByUserIdAndSignature(UUID userId, String signature);
}
