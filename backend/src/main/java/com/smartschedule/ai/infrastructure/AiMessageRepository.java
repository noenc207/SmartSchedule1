package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AiMessageRepository extends JpaRepository<AiMessage, UUID> {
    List<AiMessage> findAllByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    @Query("SELECT m FROM AiMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC LIMIT :limit")
    List<AiMessage> findRecentByConversationId(@Param("conversationId") UUID conversationId, @Param("limit") int limit);

    void deleteAllByConversationId(UUID conversationId);
}
