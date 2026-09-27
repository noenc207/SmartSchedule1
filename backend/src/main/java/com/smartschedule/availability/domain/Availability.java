package com.smartschedule.availability.domain;

import com.smartschedule.schedule.domain.Schedule;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "availabilities")
public class Availability {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "schedule_id") private Schedule schedule;
    @Column private Short weekday;
    @Column(name = "specific_date") private LocalDate specificDate;
    @Column(name = "starts_at", nullable = false) private LocalTime startsAt;
    @Column(name = "ends_at", nullable = false) private LocalTime endsAt;
    @Column(nullable = false) private boolean available;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Availability() {}
    public Availability(Schedule schedule, int weekday, LocalTime startsAt, LocalTime endsAt, boolean available) { this.id = UUID.randomUUID(); this.schedule = schedule; this.weekday = (short) weekday; this.startsAt = startsAt; this.endsAt = endsAt; this.available = available; }
    @PrePersist void create() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public UUID getId() { return id; } public Schedule getSchedule() { return schedule; } public Integer getWeekday() { return weekday == null ? null : weekday.intValue(); } public LocalDate getSpecificDate() { return specificDate; } public LocalTime getStartsAt() { return startsAt; } public LocalTime getEndsAt() { return endsAt; } public boolean isAvailable() { return available; } public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
    public void update(int dayOfWeek, LocalTime start, LocalTime end, boolean enabled) { weekday = (short) dayOfWeek; startsAt = start; endsAt = end; available = enabled; }
}
