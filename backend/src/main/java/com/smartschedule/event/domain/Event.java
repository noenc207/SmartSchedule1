package com.smartschedule.event.domain;

import com.smartschedule.category.domain.Category;
import com.smartschedule.schedule.domain.Schedule;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "events")
public class Event {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "schedule_id") private Schedule schedule;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "starts_at", nullable = false) private Instant startsAt;
    @Column(name = "ends_at", nullable = false) private Instant endsAt;
    @Column(length = 255) private String location;
    @Column(name = "location_id") private UUID locationId;
    @Column(nullable = false, length = 16) private String priority;
    @Column(nullable = false, length = 16) private String status;
    @Column(name = "recurrence_rule", length = 1000) private String recurrenceRule;
    @Column(name = "reminder_minutes") private Integer reminderMinutes;
    @Column(columnDefinition = "text") private String notes;
    @Column(nullable = false) private boolean fixed;
    @Column(nullable = false) private boolean locked;
    @Column(name = "generated_plan_id") private UUID generatedPlanId;
    @Column(name = "source_task_id") private UUID sourceTaskId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Event() {}
    public Event(Schedule schedule, Category category, String title, String description, Instant startsAt, Instant endsAt,
                 String location, String priority, String status, String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked) {
        this(schedule, category, title, description, startsAt, endsAt, location, null, priority, status, recurrenceRule, reminderMinutes, notes, fixed, locked);
    }
    public Event(Schedule schedule, Category category, String title, String description, Instant startsAt, Instant endsAt,
                 String location, UUID locationId, String priority, String status, String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked) {
        this.id = UUID.randomUUID(); this.schedule = schedule; this.category = category; this.title = title; this.description = description;
        this.startsAt = startsAt; this.endsAt = endsAt; this.location = location; this.locationId = locationId; this.priority = priority; this.status = status;
        this.recurrenceRule = recurrenceRule; this.reminderMinutes = reminderMinutes; this.notes = notes; this.fixed = fixed; this.locked = locked;
    }
    public Event(Schedule schedule, Category category, String title, String description, Instant startsAt, Instant endsAt,
                 String location, String priority, String status, String notes, boolean fixed, boolean locked,
                 UUID generatedPlanId, UUID sourceTaskId) {
        this(schedule, category, title, description, startsAt, endsAt, location, null, priority, status, null, null, notes, fixed, locked);
        this.generatedPlanId = generatedPlanId;
        this.sourceTaskId = sourceTaskId;
    }
    public Event(Schedule schedule, Category category, String title, String description, Instant startsAt, Instant endsAt,
                 String location, String priority, String status, String recurrenceRule, Integer reminderMinutes,
                 String notes, boolean fixed, boolean locked, UUID generatedPlanId, UUID sourceTaskId) {
        this(schedule, category, title, description, startsAt, endsAt, location, null, priority, status,
                recurrenceRule, reminderMinutes, notes, fixed, locked);
        this.generatedPlanId = generatedPlanId;
        this.sourceTaskId = sourceTaskId;
    }
    @PrePersist void create() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public UUID getId() { return id; } public Schedule getSchedule() { return schedule; } public Category getCategory() { return category; }
    public String getTitle() { return title; } public String getDescription() { return description; } public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; } public String getLocation() { return location; } public UUID getLocationId() { return locationId; } public String getPriority() { return priority; }
    public String getStatus() { return status; } public String getRecurrenceRule() { return recurrenceRule; } public Integer getReminderMinutes() { return reminderMinutes; }
    public String getNotes() { return notes; } public boolean isFixed() { return fixed; } public boolean isLocked() { return locked; }
    public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
    public UUID getGeneratedPlanId() { return generatedPlanId; } public UUID getSourceTaskId() { return sourceTaskId; }
    public void setSourceTaskId(UUID sourceTaskId) { this.sourceTaskId = sourceTaskId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }
    public void update(Category category, String title, String description, Instant startsAt, Instant endsAt, String location, String priority,
                       String status, String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked) {
        update(category, this.sourceTaskId, title, description, startsAt, endsAt, location, this.locationId, priority, status, recurrenceRule, reminderMinutes, notes, fixed, locked);
    }
    public void update(Category category, String title, String description, Instant startsAt, Instant endsAt, String location, UUID locationId, String priority,
                       String status, String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked) {
        update(category, this.sourceTaskId, title, description, startsAt, endsAt, location, locationId, priority, status, recurrenceRule, reminderMinutes, notes, fixed, locked);
    }
    public void update(Category category, UUID sourceTaskId, String title, String description, Instant startsAt, Instant endsAt, String location, UUID locationId, String priority,
                       String status, String recurrenceRule, Integer reminderMinutes, String notes, boolean fixed, boolean locked) {
        this.category = category; this.sourceTaskId = sourceTaskId; this.title = title; this.description = description; this.startsAt = startsAt; this.endsAt = endsAt;
        this.location = location; this.locationId = locationId; this.priority = priority; this.status = status; this.recurrenceRule = recurrenceRule; this.reminderMinutes = reminderMinutes;
        this.notes = notes; this.fixed = fixed; this.locked = locked;
    }
}
