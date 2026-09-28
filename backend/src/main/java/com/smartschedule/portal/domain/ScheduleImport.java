package com.smartschedule.portal.domain;

import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_imports")
public class ScheduleImport {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "rule_id", length = 64)
    private String ruleId;

    @Column(name = "rule_version")
    private Integer ruleVersion;

    @Column(name = "total_detected", nullable = false)
    private int totalDetected;

    @Column(name = "imported_count", nullable = false)
    private int importedCount;

    @Column(name = "duplicate_count", nullable = false)
    private int duplicateCount;

    @Column(name = "conflict_count", nullable = false)
    private int conflictCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ScheduleImport() {}

    public ScheduleImport(Schedule schedule, User user, String source, String ruleId, Integer ruleVersion,
                          int totalDetected, int importedCount, int duplicateCount, int conflictCount) {
        this.id = UUID.randomUUID();
        this.schedule = schedule;
        this.user = user;
        this.source = source;
        this.ruleId = ruleId;
        this.ruleVersion = ruleVersion;
        this.totalDetected = totalDetected;
        this.importedCount = importedCount;
        this.duplicateCount = duplicateCount;
        this.conflictCount = conflictCount;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Schedule getSchedule() { return schedule; }
    public User getUser() { return user; }
    public String getSource() { return source; }
    public String getRuleId() { return ruleId; }
    public Integer getRuleVersion() { return ruleVersion; }
    public int getTotalDetected() { return totalDetected; }
    public int getImportedCount() { return importedCount; }
    public int getDuplicateCount() { return duplicateCount; }
    public int getConflictCount() { return conflictCount; }
    public Instant getCreatedAt() { return createdAt; }
}
