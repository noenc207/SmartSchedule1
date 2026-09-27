package com.smartschedule.location.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "campus_edges")
public class CampusEdge {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_location_id")
    private Location fromLocation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_location_id")
    private Location toLocation;

    @Column(name = "walking_minutes", nullable = false)
    private int walkingMinutes;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(nullable = false)
    private boolean accessible;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CampusEdge() {}

    public CampusEdge(Location fromLocation, Location toLocation, int walkingMinutes, Integer distanceMeters, boolean accessible) {
        this.id = UUID.randomUUID();
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
        this.walkingMinutes = walkingMinutes;
        this.distanceMeters = distanceMeters;
        this.accessible = accessible;
    }

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Location getFromLocation() { return fromLocation; }
    public Location getToLocation() { return toLocation; }
    public int getWalkingMinutes() { return walkingMinutes; }
    public Integer getDistanceMeters() { return distanceMeters; }
    public boolean isAccessible() { return accessible; }
}
