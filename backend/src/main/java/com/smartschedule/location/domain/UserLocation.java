package com.smartschedule.location.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_locations")
public class UserLocation {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 32)
    private String category;

    @Column(columnDefinition = "text")
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "radius_meters")
    private Integer radiusMeters;

    @Column(length = 100)
    private String building;

    @Column(length = 60)
    private String room;

    @Column(name = "is_favorite")
    private Boolean isFavorite;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserLocation() {}

    public UserLocation(User user, UUID workspaceId, String name, String category,
                        String address, Double latitude, Double longitude,
                        Integer radiusMeters, String building, String room, Boolean isFavorite) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.workspaceId = workspaceId != null ? workspaceId : (user != null ? user.getId() : UUID.randomUUID());
        this.name = name;
        this.category = category != null ? category.toUpperCase() : "CUSTOM";
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.radiusMeters = radiusMeters != null ? radiusMeters : 100;
        this.building = building;
        this.room = room;
        this.isFavorite = isFavorite != null ? isFavorite : false;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(String name, String category, String address, Double latitude, Double longitude,
                       Integer radiusMeters, String building, String room, Boolean isFavorite) {
        this.name = name;
        if (category != null) this.category = category.toUpperCase();
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        if (radiusMeters != null) this.radiusMeters = radiusMeters;
        this.building = building;
        this.room = room;
        if (isFavorite != null) this.isFavorite = isFavorite;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public UUID getWorkspaceId() { return workspaceId; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public Integer getRadiusMeters() { return radiusMeters; }
    public String getBuilding() { return building; }
    public String getRoom() { return room; }
    public Boolean getIsFavorite() { return isFavorite; }
    public boolean isFavorite() { return Boolean.TRUE.equals(isFavorite); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
