package com.smartschedule.ai.application;

import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.AiProviderTelemetry;
import com.smartschedule.ai.domain.AiUserDailyUsage;
import com.smartschedule.ai.infrastructure.AiProviderTelemetryRepository;
import com.smartschedule.ai.infrastructure.AiUserDailyUsageRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiUsageService {
    private static final Logger log = LoggerFactory.getLogger(AiUsageService.class);

    private final AiUserDailyUsageRepository dailyUsageRepository;
    private final AiProviderTelemetryRepository telemetryRepository;
    private final AiProperties properties;

    // In-memory sliding window burst rate limiter: User ID -> List of timestamps (epoch ms)
    private final Map<UUID, List<Long>> burstLimits = new ConcurrentHashMap<>();

    @Autowired
    public AiUsageService(
            AiUserDailyUsageRepository dailyUsageRepository,
            AiProviderTelemetryRepository telemetryRepository,
            AiProperties properties
    ) {
        this.dailyUsageRepository = dailyUsageRepository;
        this.telemetryRepository = telemetryRepository;
        this.properties = properties;
    }

    /**
     * Checks both burst limit (5 req/min) and daily account limit (20 req/day).
     * Atomically increments if within quota.
     * 1 user turn = 1 quota unit.
     */
    @Transactional
    public void checkAndConsumeQuota(User user) {
        if (user == null) {
            return;
        }

        // 1. Check in-memory burst rate limit
        checkBurstLimit(user.getId());

        // 2. Check and increment daily quota in database
        checkAndIncrementDailyQuota(user);
    }

    public synchronized void checkBurstLimit(UUID userId) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L;
        int maxPerMin = properties.requestsPerMinute();

        List<Long> timestamps = burstLimits.computeIfAbsent(userId, k -> new ArrayList<>());
        timestamps.removeIf(ts -> ts < windowStart);

        if (timestamps.size() >= maxPerMin) {
            log.warn("User {} exceeded AI burst rate limit ({}/min)", userId, maxPerMin);
            throw new AiException("RATE_LIMIT_EXCEEDED",
                    "Bạn đang gửi yêu cầu quá nhanh (tối đa " + maxPerMin + " lượt/phút). Vui lòng đợi một lát trước khi tiếp tục.");
        }

        timestamps.add(now);
    }

    public void checkAndIncrementDailyQuota(User user) {
        LocalDate today = LocalDate.now();
        int dailyLimit = properties.dailyRequestLimit();

        AiUserDailyUsage usage = dailyUsageRepository.findByUserIdAndUsageDate(user.getId(), today)
                .orElseGet(() -> new AiUserDailyUsage(user, today));

        if (usage.getRequestCount() >= dailyLimit) {
            log.warn("User {} exceeded daily AI request quota ({}/{})", user.getId(), usage.getRequestCount(), dailyLimit);
            throw new AiException("DAILY_QUOTA_EXCEEDED",
                    "Bạn đã sử dụng hết hạn mức " + dailyLimit + " lượt AI trong ngày hôm nay. Hạn mức sẽ được làm mới vào ngày mai (00:00).");
        }

        usage.incrementRequestCount();
        dailyUsageRepository.save(usage);
        log.debug("User {} AI daily usage incremented: {}/{}", user.getId(), usage.getRequestCount(), dailyLimit);
    }

    @Transactional(readOnly = true)
    public int getRemainingDailyQuota(UUID userId) {
        LocalDate today = LocalDate.now();
        int dailyLimit = properties.dailyRequestLimit();
        return dailyUsageRepository.findByUserIdAndUsageDate(userId, today)
                .map(u -> Math.max(0, dailyLimit - u.getRequestCount()))
                .orElse(dailyLimit);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordTelemetry(
            User user,
            AiConversation conversation,
            String requestId,
            String clientMessageId,
            String provider,
            String model,
            long latencyMs,
            Integer tokensUsed,
            String status,
            String fallbackReason
    ) {
        try {
            AiProviderTelemetry telemetry = new AiProviderTelemetry(
                    user,
                    conversation,
                    requestId,
                    clientMessageId,
                    provider != null ? provider : "unknown",
                    model != null ? model : "unknown",
                    latencyMs,
                    tokensUsed,
                    status != null ? status : "SUCCESS",
                    fallbackReason
            );
            telemetryRepository.save(telemetry);
        } catch (Exception ex) {
            log.warn("Failed to record AI telemetry: {}", ex.getMessage());
        }
    }
}
