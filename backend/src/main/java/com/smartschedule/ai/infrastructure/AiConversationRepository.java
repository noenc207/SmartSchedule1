package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {
    List<AiConversation> findAllByUserIdOrderByUpdatedAtDesc(UUID userId);

    @Query("SELECT c FROM AiConversation c WHERE c.user.id = :userId ORDER BY c.updatedAt DESC LIMIT 1")
    Optional<AiConversation> findLatestByUserId(@Param("userId") UUID userId);

    Optional<AiConversation> findByIdAndUserId(UUID id, UUID userId);
}
