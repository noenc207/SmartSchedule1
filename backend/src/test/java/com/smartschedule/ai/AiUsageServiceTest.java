package com.smartschedule.ai;

import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.AiUsageService;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiUserDailyUsage;
import com.smartschedule.ai.infrastructure.AiProviderTelemetryRepository;
import com.smartschedule.ai.infrastructure.AiUserDailyUsageRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiUsageServiceTest {

    @Mock
    private AiUserDailyUsageRepository dailyUsageRepository;

    @Mock
    private AiProviderTelemetryRepository telemetryRepository;

    private AiProperties properties;
    private AiUsageService usageService;
    private User testUser;

    @BeforeEach
    void setUp() {
        properties = new AiProperties(
                "mock-gemini-key", "gemini-3.6-flash", 2000, 1024, 5, 30, "http://localhost:8090",
                "mock-wayjet-key", "https://api.xah.io/v1", "mainnewnol/gpt-5.6-luna",
                "wayjet", "gemini,groq",
                20, 60, 5, 1,
                null, null, null, null, null, null
        );

        usageService = new AiUsageService(dailyUsageRepository, telemetryRepository, properties);
        testUser = new User("test@domain.com", "pass", "Test User");
    }

    @Test
    void testDailyQuota_allowsUpToLimitAndIncrements() {
        when(dailyUsageRepository.findByUserIdAndUsageDate(eq(testUser.getId()), eq(LocalDate.now())))
                .thenReturn(Optional.empty());

        usageService.checkAndConsumeQuota(testUser);

        verify(dailyUsageRepository, times(1)).save(any(AiUserDailyUsage.class));
    }

    @Test
    void testDailyQuota_exceededLimitThrowsAiException() {
        AiUserDailyUsage usage = new AiUserDailyUsage(testUser, LocalDate.now());
        for (int i = 0; i < 20; i++) {
            usage.incrementRequestCount();
        }
        assertThat(usage.getRequestCount()).isEqualTo(20);

        when(dailyUsageRepository.findByUserIdAndUsageDate(eq(testUser.getId()), eq(LocalDate.now())))
                .thenReturn(Optional.of(usage));

        assertThatThrownBy(() -> usageService.checkAndConsumeQuota(testUser))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("hết hạn mức 20 lượt AI trong ngày hôm nay");

        verify(dailyUsageRepository, never()).save(any());
    }

    @Test
    void testBurstLimit_exceedingBurstRateThrowsRateLimitExceeded() {
        // 5 requests allowed in 1 minute
        for (int i = 0; i < 5; i++) {
            usageService.checkBurstLimit(testUser.getId());
        }

        // 6th request should trip burst limit
        assertThatThrownBy(() -> usageService.checkBurstLimit(testUser.getId()))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("quá nhanh")
                .hasFieldOrPropertyWithValue("code", "RATE_LIMIT_EXCEEDED");
    }
}
