package com.smartschedule.auth.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "registration_keys")
public class RegistrationKey {
    @Id
    private UUID id;

    @Column(name = "key_hash", nullable = false, unique = true, length = 255)
    private String keyHash;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "used_by")
    private UUID usedBy;

    protected RegistrationKey() {
    }

    public RegistrationKey(String keyHash, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.keyHash = keyHash;
        this.status = "ACTIVE";
        this.expiresAt = expiresAt;
    }

    public RegistrationKey(String keyHash) {
        this(keyHash, null);
    }

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = "ACTIVE";
        }
    }

    public boolean isUsable(Instant now) {
        if (!"ACTIVE".equalsIgnoreCase(status)) {
            return false;
        }
        return expiresAt == null || expiresAt.isAfter(now);
    }

    public void markUsed(User user, Instant now) {
        this.status = "USED";
        this.usedAt = now;
        this.usedBy = user != null ? user.getId() : null;
    }

    public UUID getId() { return id; }
    public String getKeyHash() { return keyHash; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public UUID getUsedBy() { return usedBy; }
}
