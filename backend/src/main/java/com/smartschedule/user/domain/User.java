package com.smartschedule.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "google_id", unique = true, length = 255)
    private String googleId;

    @Column(name = "auth_provider", nullable = false, length = 32)
    private String authProvider = "LOCAL";

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone = "UTC";

    @Column(name = "locale", nullable = false, length = 16)
    private String locale = "en";

    @Column(name = "tier", nullable = false, length = 16)
    private String tier = "PRO";

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String email, String passwordHash, String displayName) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.authProvider = "LOCAL";
        this.tier = "PRO";
    }

    public static User createGoogleUser(String email, String displayName, String googleId, String avatarUrl) {
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = email;
        user.displayName = displayName;
        user.googleId = googleId;
        user.avatarUrl = avatarUrl;
        user.authProvider = "GOOGLE";
        user.tier = "PRO";
        return user;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public String getAvatarUrl() { return avatarUrl; }
    public boolean isEnabled() { return enabled; }
    public String getTimezone() { return timezone; }
    public String getLocale() { return locale; }
    public String getTier() { return tier != null ? tier : "PRO"; }
    public boolean isPro() { return !"FREE".equalsIgnoreCase(getTier()); }
    public void setTier(String tier) { this.tier = tier != null ? tier.toUpperCase() : "PRO"; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getAuthProvider() { return authProvider; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }

    public void updateProfile(String displayName, String timezone, String locale, String avatarUrl) {
        this.displayName = displayName;
        this.timezone = timezone;
        this.locale = locale;
        this.avatarUrl = avatarUrl;
    }
}
