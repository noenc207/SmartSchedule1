package com.smartschedule.integration.google.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "google_connections")
public class GoogleConnection {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "provider", nullable = false, length = 32)
    private String provider = "GOOGLE_WORKSPACE";

    @Column(name = "encrypted_credentials", nullable = false, columnDefinition = "TEXT")
    private String encryptedCredentials;

    @Column(name = "scopes", nullable = false, length = 500)
    private String scopes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected GoogleConnection() {}

    public GoogleConnection(UUID userId, String encryptedCredentials, String scopes) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.provider = "GOOGLE_WORKSPACE";
        this.encryptedCredentials = encryptedCredentials;
        this.scopes = scopes != null ? scopes : "";
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getEncryptedCredentials() { return encryptedCredentials; }
    public void setEncryptedCredentials(String encryptedCredentials) { this.encryptedCredentials = encryptedCredentials; }
    public String getScopes() { return scopes; }
    public void setScopes(String scopes) { this.scopes = scopes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getRevokedAt() { return revokedAt; }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
        this.updatedAt = Instant.now();
    }
}
