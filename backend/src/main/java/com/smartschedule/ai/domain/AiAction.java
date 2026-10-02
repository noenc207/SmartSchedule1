package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_actions")
public class AiAction {
    public static final String STATUS_PROPOSED = "PROPOSED";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_EXECUTING = "EXECUTING";
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private AiConversation conversation;

    @Column(nullable = false, length = 64)
    private String tool;

    @Column(nullable = false, length = 32)
    private String status = STATUS_PROPOSED;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "parameters_json", nullable = false, columnDefinition = "TEXT")
    private String parametersJson;

    @Column(name = "has_conflict", nullable = false)
    private boolean hasConflict = false;

    @Column(name = "conflict_details", columnDefinition = "TEXT")
    private String conflictDetails;

    @Column(name = "target_event_id")
    private UUID targetEventId;

    @Column(name = "result_details", columnDefinition = "TEXT")
    private String resultDetails;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AiAction() {
    }

    public AiAction(User user, AiConversation conversation, String tool, String summary,
                    String parametersJson, boolean hasConflict, String conflictDetails,
                    UUID targetEventId, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.conversation = conversation;
        this.tool = tool;
        this.status = STATUS_PROPOSED;
        this.summary = summary;
        this.parametersJson = parametersJson;
        this.hasConflict = hasConflict;
        this.conflictDetails = conflictDetails;
        this.targetEventId = targetEventId;
        this.expiresAt = expiresAt != null ? expiresAt : Instant.now().plusSeconds(900); // 15 min TTL
        this.createdAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiresAt);
    }

    public boolean canExecute() {
        return STATUS_PROPOSED.equalsIgnoreCase(this.status) && !isExpired();
    }

    public void markConfirmed() {
        this.status = STATUS_CONFIRMED;
        this.confirmedAt = Instant.now();
    }

    public void markExecuting() {
        this.status = STATUS_EXECUTING;
    }

    public void markSuccess(String resultDetails) {
        this.status = STATUS_SUCCESS;
        this.resultDetails = resultDetails;
        this.executedAt = Instant.now();
    }

    public void markFailed(String errorMessage) {
        this.status = STATUS_FAILED;
        this.errorMessage = errorMessage;
        this.executedAt = Instant.now();
    }

    public void markCancelled() {
        this.status = STATUS_CANCELLED;
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

    public String getTool() {
        return tool;
    }

    public String getStatus() {
        return status;
    }

    public String getSummary() {
        return summary;
    }

    public String getParametersJson() {
        return parametersJson;
    }

    public boolean isHasConflict() {
        return hasConflict;
    }

    public String getConflictDetails() {
        return conflictDetails;
    }

    public UUID getTargetEventId() {
        return targetEventId;
    }

    public void setTargetEventId(UUID targetEventId) {
        this.targetEventId = targetEventId;
    }

    public String getResultDetails() {
        return resultDetails;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
