package com.smartschedule.location.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "locations")
public class Location {
    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private LocationType type;

    @Column(length = 100)
    private String building;

    @Column(length = 60)
    private String room;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "campus_id", length = 64)
    private String campusId;

    @Column(columnDefinition = "text")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Location() {}

    public Location(UUID id, String name, LocationType type, String building, String room,
                    Double latitude, Double longitude, String campusId, String metadata) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.type = type != null ? type : LocationType.CAMPUS;
        this.building = building;
        this.room = room;
        this.latitude = latitude;
        this.longitude = longitude;
        this.campusId = campusId;
        this.metadata = metadata;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) id = UUID.randomUUID();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public LocationType getType() { return type; }
    public String getBuilding() { return building; }
    public String getRoom() { return room; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getCampusId() { return campusId; }
    public String getMetadata() { return metadata; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public boolean isPhysical() {
        return type == LocationType.CAMPUS || type == LocationType.EXTERNAL;
    }

    public boolean isOnline() {
        return type == LocationType.ONLINE;
    }
}
