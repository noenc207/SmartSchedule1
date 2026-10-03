package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_action_plans")
public class AiActionPlan {
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

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(nullable = false, length = 32)
    private String status = STATUS_PROPOSED;

    @Column(name = "action_count", nullable = false)
    private int actionCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "executed_at")
    private Instant executedAt;

    protected AiActionPlan() {
    }

    public AiActionPlan(User user, AiConversation conversation, String title, String summary, int actionCount) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.conversation = conversation;
        this.title = title;
        this.summary = summary;
        this.actionCount = actionCount;
        this.status = STATUS_PROPOSED;
        this.createdAt = Instant.now();
    }

    public void markConfirmed() {
        this.status = STATUS_CONFIRMED;
        this.confirmedAt = Instant.now();
    }

    public void markExecuting() {
        this.status = STATUS_EXECUTING;
    }

    public void markSuccess() {
        this.status = STATUS_SUCCESS;
        this.executedAt = Instant.now();
    }

    public void markFailed() {
        this.status = STATUS_FAILED;
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

    public String getTitle() {
        return title;
    }

    public String getSummary() {
        return summary;
    }

    public String getStatus() {
        return status;
    }

    public int getActionCount() {
        return actionCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }
}
