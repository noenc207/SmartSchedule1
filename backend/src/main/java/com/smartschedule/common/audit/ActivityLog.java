package com.smartschedule.common.audit;

import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_logs")
public class ActivityLog {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(nullable = false, length = 64)
    private String action;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ActivityLog() {}

    public ActivityLog(Schedule schedule, User actor, String action) {
        this.id = UUID.randomUUID();
        this.schedule = schedule;
        this.actor = actor;
        this.action = action;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public User getActor() { return actor; }
    public String getAction() { return action; }
    public Instant getCreatedAt() { return createdAt; }
}
