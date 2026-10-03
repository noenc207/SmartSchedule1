package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiActionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiActionPlanRepository extends JpaRepository<AiActionPlan, UUID> {
    Optional<AiActionPlan> findByIdAndUserId(UUID id, UUID userId);

    List<AiActionPlan> findAllByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<AiActionPlan> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
