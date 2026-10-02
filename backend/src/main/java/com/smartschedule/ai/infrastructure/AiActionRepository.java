package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiActionRepository extends JpaRepository<AiAction, UUID> {
    Optional<AiAction> findByIdAndUserId(UUID id, UUID userId);

    List<AiAction> findAllByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<AiAction> findAllByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, String status);
}
