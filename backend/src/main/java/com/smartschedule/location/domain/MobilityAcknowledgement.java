package com.smartschedule.location.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "mobility_acknowledgements")
public class MobilityAcknowledgement {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "from_event_id")
    private UUID fromEventId;

    @Column(name = "to_event_id")
    private UUID toEventId;

    @Column(nullable = false, length = 512)
    private String signature;

    @Column(name = "acknowledged_at", nullable = false)
    private Instant acknowledgedAt;

    protected MobilityAcknowledgement() {}

    public MobilityAcknowledgement(User user, UUID fromEventId, UUID toEventId, String signature) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.fromEventId = fromEventId;
        this.toEventId = toEventId;
        this.signature = signature;
        this.acknowledgedAt = Instant.now();
    }

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (acknowledgedAt == null) acknowledgedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public UUID getFromEventId() { return fromEventId; }
    public UUID getToEventId() { return toEventId; }
    public String getSignature() { return signature; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
}
