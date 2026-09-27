package com.smartschedule.task.domain;

import com.smartschedule.category.domain.Category;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "schedule_id") private Schedule schedule;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "owner_id") private User owner;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "estimated_minutes", nullable = false) private int estimatedMinutes;
    @Column(name = "remaining_minutes", nullable = false) private int remainingMinutes;
    @Column(nullable = false, length = 16) private String priority;
    @Column private Instant deadline;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "preferred_start") private LocalTime preferredStart;
    @Column(name = "preferred_end") private LocalTime preferredEnd;
    @Column(name = "minimum_session_minutes", nullable = false) private int minimumSessionMinutes;
    @Column(name = "maximum_session_minutes", nullable = false) private int maximumSessionMinutes;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Task() {}
    public Task(Schedule schedule, User owner, Category category, String title, String description, int estimated, int remaining, String priority,
                Instant deadline, String status, LocalTime preferredStart, LocalTime preferredEnd, int minimum, int maximum) {
        this.id = UUID.randomUUID(); this.schedule = schedule; this.owner = owner; this.category = category; this.title = title; this.description = description;
        this.estimatedMinutes = estimated; this.remainingMinutes = remaining; this.priority = priority; this.deadline = deadline; this.status = status;
        this.preferredStart = preferredStart; this.preferredEnd = preferredEnd; this.minimumSessionMinutes = minimum; this.maximumSessionMinutes = maximum;
    }
    @PrePersist void create() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public UUID getId() { return id; } public Schedule getSchedule() { return schedule; } public User getOwner() { return owner; } public Category getCategory() { return category; }
    public String getTitle() { return title; } public String getDescription() { return description; } public int getEstimatedMinutes() { return estimatedMinutes; } public int getRemainingMinutes() { return remainingMinutes; }
    public String getPriority() { return priority; } public Instant getDeadline() { return deadline; } public String getStatus() { return status; } public LocalTime getPreferredStart() { return preferredStart; } public LocalTime getPreferredEnd() { return preferredEnd; }
    public int getMinimumSessionMinutes() { return minimumSessionMinutes; } public int getMaximumSessionMinutes() { return maximumSessionMinutes; } public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
    public void update(Category category, String title, String description, int estimated, int remaining, String priority, Instant deadline, String status, LocalTime start, LocalTime end, int min, int max) {
        this.category = category; this.title = title; this.description = description; this.estimatedMinutes = estimated; this.remainingMinutes = remaining; this.priority = priority; this.deadline = deadline; this.status = status; this.preferredStart = start; this.preferredEnd = end; this.minimumSessionMinutes = min; this.maximumSessionMinutes = max;
    }
    public void recalculateRemainingMinutes(int scheduledMinutes) {
        this.remainingMinutes = Math.max(0, this.estimatedMinutes - Math.max(0, scheduledMinutes));
    }
    public void setRemainingMinutes(int remainingMinutes) {
        this.remainingMinutes = Math.max(0, remainingMinutes);
    }
}
