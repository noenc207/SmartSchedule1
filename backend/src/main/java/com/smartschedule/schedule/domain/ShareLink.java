package com.smartschedule.schedule.domain;

import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "share_links")
public class ShareLink {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "token", nullable = false, unique = true, length = 96)
    private String tokenHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false, length = 16)
    private String mode = "VIEW_ONLY";

    protected ShareLink() {}

    public ShareLink(Schedule schedule, String tokenHash, Instant expiresAt, String mode) {
        this.id = UUID.randomUUID();
        this.schedule = schedule;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.mode = mode == null ? "VIEW_ONLY" : mode.toUpperCase();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (mode == null) {
            mode = "VIEW_ONLY";
        }
    }

    public UUID getId() { return id; }
    public Schedule getSchedule() { return schedule; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public String getMode() { return mode; }

    public boolean isActive(Instant now) {
        return revokedAt == null && (expiresAt == null || expiresAt.isAfter(now));
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    public static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available in runtime", e);
        }
    }
}