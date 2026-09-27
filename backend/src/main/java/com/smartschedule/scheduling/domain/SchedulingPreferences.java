package com.smartschedule.scheduling.domain;

import com.smartschedule.schedule.domain.Schedule;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "scheduling_preferences")
public class SchedulingPreferences {
    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false, unique = true)
    private Schedule schedule;

    @Column(name = "max_daily_minutes", nullable = false)
    private int maxDailyMinutes;

    @Column(name = "min_break_minutes", nullable = false)
    private int minBreakMinutes;

    @Column(name = "preferred_start")
    private LocalTime preferredStart;

    @Column(name = "preferred_end")
    private LocalTime preferredEnd;

    @Column(name = "maximum_session_minutes", nullable = false)
    private int maximumSessionMinutes;

    @Column(name = "minimum_session_minutes", nullable = false)
    private int minimumSessionMinutes;

    @Column(name = "workload_balance_weight", nullable = false)
    private double workloadBalanceWeight;

    @Column(name = "deadline_weight", nullable = false)
    private double deadlineWeight;

    @Column(name = "priority_weight", nullable = false)
    private double priorityWeight;

    @Column(name = "preference_weight", nullable = false)
    private double preferenceWeight;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SchedulingPreferences() {}

    public SchedulingPreferences(Schedule schedule, int maxDailyMinutes, int minBreakMinutes, LocalTime preferredStart,
                                LocalTime preferredEnd, int maximumSessionMinutes, int minimumSessionMinutes,
                                double workloadBalanceWeight, double deadlineWeight, double priorityWeight,
                                double preferenceWeight) {
        this.id = UUID.randomUUID();
        this.schedule = schedule;
        this.maxDailyMinutes = maxDailyMinutes;
        this.minBreakMinutes = minBreakMinutes;
        this.preferredStart = preferredStart;
        this.preferredEnd = preferredEnd;
        this.maximumSessionMinutes = maximumSessionMinutes;
        this.minimumSessionMinutes = minimumSessionMinutes;
        this.workloadBalanceWeight = workloadBalanceWeight;
        this.deadlineWeight = deadlineWeight;
        this.priorityWeight = priorityWeight;
        this.preferenceWeight = preferenceWeight;
    }

    public static SchedulingPreferences defaultPreferences(Schedule schedule) {
        return new SchedulingPreferences(schedule, 480, 30, LocalTime.of(18, 0), LocalTime.of(21, 0), 120, 30,
                0.15, 0.30, 0.30, 0.15);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Schedule getSchedule() { return schedule; }
    public int getMaxDailyMinutes() { return maxDailyMinutes; }
    public int getMinBreakMinutes() { return minBreakMinutes; }
    public LocalTime getPreferredStart() { return preferredStart; }
    public LocalTime getPreferredEnd() { return preferredEnd; }
    public int getMaximumSessionMinutes() { return maximumSessionMinutes; }
    public int getMinimumSessionMinutes() { return minimumSessionMinutes; }
    public double getWorkloadBalanceWeight() { return workloadBalanceWeight; }
    public double getDeadlineWeight() { return deadlineWeight; }
    public double getPriorityWeight() { return priorityWeight; }
    public double getPreferenceWeight() { return preferenceWeight; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(int maxDailyMinutes, int minBreakMinutes, LocalTime preferredStart, LocalTime preferredEnd,
                       int maximumSessionMinutes, int minimumSessionMinutes, double workloadBalanceWeight, double deadlineWeight,
                       double priorityWeight, double preferenceWeight) {
        this.maxDailyMinutes = maxDailyMinutes;
        this.minBreakMinutes = minBreakMinutes;
        this.preferredStart = preferredStart;
        this.preferredEnd = preferredEnd;
        this.maximumSessionMinutes = maximumSessionMinutes;
        this.minimumSessionMinutes = minimumSessionMinutes;
        this.workloadBalanceWeight = workloadBalanceWeight;
        this.deadlineWeight = deadlineWeight;
        this.priorityWeight = priorityWeight;
        this.preferenceWeight = preferenceWeight;
    }
}
