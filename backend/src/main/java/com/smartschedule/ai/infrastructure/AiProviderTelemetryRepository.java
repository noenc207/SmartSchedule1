package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiProviderTelemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiProviderTelemetryRepository extends JpaRepository<AiProviderTelemetry, UUID> {

    List<AiProviderTelemetry> findTop100ByOrderByCreatedAtDesc();

    List<AiProviderTelemetry> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
