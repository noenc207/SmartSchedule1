package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "vision_results")
public class VisionResult {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private AiConversation conversation;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "warnings_json", columnDefinition = "TEXT")
    private String warningsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected VisionResult() {}

    public VisionResult(UUID id, User user, AiConversation conversation,
                        String documentType, String provider, String model,
                        double confidence, String summary, String rawText,
                        String payloadJson, String warningsJson, Instant expiresAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.user = user;
        this.conversation = conversation;
        this.documentType = documentType;
        this.provider = provider;
        this.model = model;
        this.confidence = confidence;
        this.summary = summary;
        this.rawText = rawText;
        this.payloadJson = payloadJson;
        this.warningsJson = warningsJson;
        this.createdAt = Instant.now();
        this.expiresAt = expiresAt != null ? expiresAt : Instant.now().plusSeconds(86400); // 24h default TTL
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

    public void setConversation(AiConversation conversation) {
        this.conversation = conversation;
    }

    public String getDocumentType() {
        return documentType;
    }

    public String getProvider() {
        return provider;
    }

    public String getModel() {
        return model;
    }

    public double getConfidence() {
        return confidence;
    }

    public String getSummary() {
        return summary;
    }

    public String getRawText() {
        return rawText;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public String getWarningsJson() {
        return warningsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
