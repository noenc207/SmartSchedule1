package com.smartschedule.integration.google.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_calendar_links")
public class ExternalCalendarLink {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "provider", nullable = false, length = 32)
    private String provider = "GOOGLE_CALENDAR";

    @Column(name = "external_calendar_id", nullable = false, length = 255)
    private String externalCalendarId;

    @Column(name = "smart_calendar_id")
    private UUID smartCalendarId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false, length = 32)
    private SyncStatus syncStatus = SyncStatus.LINKED;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ExternalCalendarLink() {}

    public ExternalCalendarLink(UUID userId, String externalCalendarId, UUID smartCalendarId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.provider = "GOOGLE_CALENDAR";
        this.externalCalendarId = externalCalendarId;
        this.smartCalendarId = smartCalendarId;
        this.syncStatus = SyncStatus.LINKED;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getExternalCalendarId() { return externalCalendarId; }
    public UUID getSmartCalendarId() { return smartCalendarId; }
    public void setSmartCalendarId(UUID smartCalendarId) { this.smartCalendarId = smartCalendarId; }
    public SyncStatus getSyncStatus() { return syncStatus; }
    public void setSyncStatus(SyncStatus syncStatus) { this.syncStatus = syncStatus; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
