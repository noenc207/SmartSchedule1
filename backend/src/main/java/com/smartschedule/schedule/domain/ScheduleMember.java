package com.smartschedule.schedule.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_members", uniqueConstraints = @UniqueConstraint(columnNames = {"schedule_id", "user_id"}))
public class ScheduleMember {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 16)
    private String role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ScheduleMember() {}

    public ScheduleMember(Schedule schedule, User user, String role) {
        this.id = UUID.randomUUID();
        this.schedule = schedule;
        this.user = user;
        this.role = role == null ? "VIEWER" : role.toUpperCase();
    }

    @PrePersist
    void create() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (role == null) {
            role = "VIEWER";
        } else {
            role = role.toUpperCase();
        }
    }

    @PreUpdate
    void updateTimestamp() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Schedule getSchedule() { return schedule; }
    public User getUser() { return user; }
    public String getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setRole(String role) {
        this.role = role == null ? "VIEWER" : role.toUpperCase();
    }
}