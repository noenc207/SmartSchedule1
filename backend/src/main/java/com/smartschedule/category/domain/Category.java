package com.smartschedule.category.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "owner_id") private User owner;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, length = 32) private String color;
    @Column(length = 80) private String icon;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Category() {}
    public Category(User owner, String name, String color, String icon) { this.id = UUID.randomUUID(); this.owner = owner; this.name = name; this.color = color; this.icon = icon; }
    @PrePersist void create() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public UUID getId() { return id; } public User getOwner() { return owner; } public String getName() { return name; }
    public String getColor() { return color; } public String getIcon() { return icon; } public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
    public void update(String name, String color, String icon) { this.name = name; this.color = color; this.icon = icon; }
}
