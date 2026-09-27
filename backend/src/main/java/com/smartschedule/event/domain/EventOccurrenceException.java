package com.smartschedule.event.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_occurrence_exceptions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "occurrence_start"}))
public class EventOccurrenceException {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "occurrence_start", nullable = false)
    private Instant occurrenceStart;

    @Column(nullable = false, length = 16)
    private String action;

    @Column(name = "override_start")
    private Instant overrideStart;

    @Column(name = "override_end")
    private Instant overrideEnd;

    @Column(name = "override_title", length = 200)
    private String overrideTitle;

    @Column(name = "override_location", length = 255)
    private String overrideLocation;

    @Column(name = "override_notes", columnDefinition = "text")
    private String overrideNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected EventOccurrenceException() {}

    public EventOccurrenceException(Event event, Instant occurrenceStart, String action,
                                    Instant overrideStart, Instant overrideEnd,
                                    String overrideTitle, String overrideLocation,
                                    String overrideNotes) {
        this.id = UUID.randomUUID();
        this.event = event;
        this.occurrenceStart = occurrenceStart;
        this.action = action;
        this.overrideStart = overrideStart;
        this.overrideEnd = overrideEnd;
        this.overrideTitle = overrideTitle;
        this.overrideLocation = overrideLocation;
        this.overrideNotes = overrideNotes;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public Instant getOccurrenceStart() { return occurrenceStart; }
    public String getAction() { return action; }
    public Instant getOverrideStart() { return overrideStart; }
    public Instant getOverrideEnd() { return overrideEnd; }
    public String getOverrideTitle() { return overrideTitle; }
    public String getOverrideLocation() { return overrideLocation; }
    public String getOverrideNotes() { return overrideNotes; }
    public void update(String action, Instant overrideStart, Instant overrideEnd,
                       String overrideTitle, String overrideLocation, String overrideNotes) {
        this.action = action;
        this.overrideStart = overrideStart;
        this.overrideEnd = overrideEnd;
        this.overrideTitle = overrideTitle;
        this.overrideLocation = overrideLocation;
        this.overrideNotes = overrideNotes;
    }
}
