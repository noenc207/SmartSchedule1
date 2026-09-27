package com.smartschedule.schedule.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "schedules")
public class Schedule {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 64)
    private String timezone = "UTC";

    @Column(nullable = false, length = 16)
    private String visibility = "PRIVATE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(nullable = false)
    private long version;

    protected Schedule() {}

    public Schedule(User owner, String name, String description, String timezone, String visibility) {
        this.id = UUID.randomUUID();
        this.owner = owner;
        this.name = name;
        this.description = description;
        this.timezone = timezone;
        this.visibility = visibility;
    }

    @jakarta.persistence.PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public User getOwner() { return owner; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getTimezone() { return timezone; }
    public String getVisibility() { return visibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
    public void incrementVersion() { version++; }
    public void update(String name, String description, String timezone, String visibility) {
        this.name = name; this.description = description; this.timezone = timezone; this.visibility = visibility;
    }
}
