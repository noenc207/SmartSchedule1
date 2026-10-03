package com.smartschedule.integration.google.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_event_links")
public class ExternalEventLink {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "provider", nullable = false, length = 32)
    private String provider = "GOOGLE_CALENDAR";

    @Column(name = "external_calendar_id", nullable = false, length = 255)
    private String externalCalendarId;

    @Column(name = "external_event_id", nullable = false, length = 255)
    private String externalEventId;

    @Column(name = "smart_event_id")
    private UUID smartEventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false, length = 32)
    private SyncStatus syncStatus = SyncStatus.SYNCED;

    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt;

    protected ExternalEventLink() {}

    public ExternalEventLink(UUID userId, String externalCalendarId, String externalEventId, UUID smartEventId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.provider = "GOOGLE_CALENDAR";
        this.externalCalendarId = externalCalendarId;
        this.externalEventId = externalEventId;
        this.smartEventId = smartEventId;
        this.syncStatus = SyncStatus.SYNCED;
        this.lastSyncedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (lastSyncedAt == null) lastSyncedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getExternalCalendarId() { return externalCalendarId; }
    public String getExternalEventId() { return externalEventId; }
    public UUID getSmartEventId() { return smartEventId; }
    public void setSmartEventId(UUID smartEventId) { this.smartEventId = smartEventId; }
    public SyncStatus getSyncStatus() { return syncStatus; }
    public void setSyncStatus(SyncStatus syncStatus) { this.syncStatus = syncStatus; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
}
