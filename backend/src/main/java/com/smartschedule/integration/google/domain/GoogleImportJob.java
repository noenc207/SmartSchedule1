package com.smartschedule.integration.google.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "google_import_jobs")
public class GoogleImportJob {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "source_type", nullable = false, length = 32)
    private String sourceType;

    @Column(name = "source_id", nullable = false, length = 255)
    private String sourceId;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "COMPLETED";

    @Column(name = "rows_processed", nullable = false)
    private int rowsProcessed;

    @Column(name = "events_detected", nullable = false)
    private int eventsDetected;

    @Column(name = "events_created", nullable = false)
    private int eventsCreated;

    @Column(name = "conflicts", nullable = false)
    private int conflicts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected GoogleImportJob() {}

    public GoogleImportJob(UUID userId, String sourceType, String sourceId,
                           int rowsProcessed, int eventsDetected, int eventsCreated, int conflicts) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.status = "COMPLETED";
        this.rowsProcessed = rowsProcessed;
        this.eventsDetected = eventsDetected;
        this.eventsCreated = eventsCreated;
        this.conflicts = conflicts;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getSourceType() { return sourceType; }
    public String getSourceId() { return sourceId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getRowsProcessed() { return rowsProcessed; }
    public int getEventsDetected() { return eventsDetected; }
    public int getEventsCreated() { return eventsCreated; }
    public int getConflicts() { return conflicts; }
    public Instant getCreatedAt() { return createdAt; }
}
