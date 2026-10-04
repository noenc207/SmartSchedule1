package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ai_user_daily_usage", uniqueConstraints = {
        @UniqueConstraint(name = "uq_ai_user_daily_usage", columnNames = {"user_id", "usage_date"})
})
public class AiUserDailyUsage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "usage_date", nullable = false)
    private LocalDate usageDate;

    @Column(name = "request_count", nullable = false)
    private int requestCount = 0;

    @Column(name = "last_request_at", nullable = false)
    private Instant lastRequestAt;

    protected AiUserDailyUsage() {}

    public AiUserDailyUsage(User user, LocalDate usageDate) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.usageDate = usageDate;
        this.requestCount = 0;
        this.lastRequestAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public LocalDate getUsageDate() {
        return usageDate;
    }

    public int getRequestCount() {
        return requestCount;
    }

    public void incrementRequestCount() {
        this.requestCount++;
        this.lastRequestAt = Instant.now();
    }

    public Instant getLastRequestAt() {
        return lastRequestAt;
    }
}
