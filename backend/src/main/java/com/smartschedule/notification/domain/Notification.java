package com.smartschedule.notification.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "related_entity_type", length = 32)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Column(name = "scheduled_for")
    private Instant scheduledFor;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "idempotency_key", unique = true, length = 255)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {}

    public Notification(User user, String type, String title, String message,
                        String relatedEntityType, UUID relatedEntityId,
                        Instant scheduledFor, String idempotencyKey) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.type = type;
        this.title = title;
        this.message = message;
        this.relatedEntityType = relatedEntityType;
        this.relatedEntityId = relatedEntityId;
        this.scheduledFor = scheduledFor;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getRelatedEntityType() { return relatedEntityType; }
    public UUID getRelatedEntityId() { return relatedEntityId; }
    public Instant getScheduledFor() { return scheduledFor; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void markRead() { readAt = Instant.now(); }
}
