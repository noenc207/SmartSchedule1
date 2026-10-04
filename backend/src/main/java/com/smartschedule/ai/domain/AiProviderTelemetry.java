package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_provider_telemetry")
public class AiProviderTelemetry {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private AiConversation conversation;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "client_message_id", length = 64)
    private String clientMessageId;

    @Column(name = "provider", nullable = false, length = 64)
    private String provider;

    @Column(name = "model", nullable = false, length = 128)
    private String model;

    @Column(name = "latency_ms", nullable = false)
    private long latencyMs;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "status", nullable = false, length = 32)
    private String status; // 'SUCCESS', 'FALLBACK', 'FAILED'

    @Column(name = "fallback_reason", columnDefinition = "TEXT")
    private String fallbackReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AiProviderTelemetry() {}

    public AiProviderTelemetry(
            User user,
            AiConversation conversation,
            String requestId,
            String clientMessageId,
            String provider,
            String model,
            long latencyMs,
            Integer tokensUsed,
            String status,
            String fallbackReason
    ) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.conversation = conversation;
        this.requestId = requestId;
        this.clientMessageId = clientMessageId;
        this.provider = provider;
        this.model = model;
        this.latencyMs = latencyMs;
        this.tokensUsed = tokensUsed;
        this.status = status;
        this.fallbackReason = fallbackReason;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public AiConversation getConversation() {
        return conversation;
    }

    public String getRequestId() {
        return requestId;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public String getProvider() {
        return provider;
    }

    public String getModel() {
        return model;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public Integer getTokensUsed() {
        return tokensUsed;
    }

    public String getStatus() {
        return status;
    }

    public String getFallbackReason() {
        return fallbackReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
