package com.smartschedule.ai.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_messages")
public class AiMessage {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private AiConversation conversation;

    @Column(nullable = false, length = 32)
    private String role; // "user", "model", "system"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AiMessage() {
    }

    public AiMessage(AiConversation conversation, String role, String content) {
        this(conversation, role, content, null);
    }

    public AiMessage(AiConversation conversation, String role, String content, Integer tokensUsed) {
        this.id = UUID.randomUUID();
        this.conversation = conversation;
        this.role = role != null ? role.trim() : "user";
        this.content = content != null ? content : "";
        this.tokensUsed = tokensUsed;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public AiConversation getConversation() {
        return conversation;
    }

    public String getRole() {
        return role;
    }

    public String getContent() {
        return content;
    }

    public Integer getTokensUsed() {
        return tokensUsed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
