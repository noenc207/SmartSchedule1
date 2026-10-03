package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.VisionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisionResultRepository extends JpaRepository<VisionResult, UUID> {
    Optional<VisionResult> findByIdAndUserId(UUID id, UUID userId);
    List<VisionResult> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<VisionResult> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);
    void deleteAllByExpiresAtBefore(Instant now);
}
