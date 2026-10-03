package com.smartschedule.ai;

import com.smartschedule.ai.application.AiDateTimeUtils;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiDateTimeUtilsTest {
    private final ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");

    @Test
    void testCalculateTimeRange_startPlusDuration() {
        LocalDate date = LocalDate.of(2026, 10, 4);
        LocalTime startTime = LocalTime.of(8, 0);

        AiDateTimeUtils.TimeRange tr = AiDateTimeUtils.calculateTimeRange(date, startTime, null, 90, vnZone);

        assertThat(tr.startDate()).isEqualTo(date);
        assertThat(tr.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(tr.endTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(tr.durationMinutes()).isEqualTo(90);

        // In Asia/Ho_Chi_Minh (UTC+7), 08:00 is 01:00 UTC, 09:30 is 02:30 UTC
        assertThat(tr.startsAt()).isEqualTo(Instant.parse("2026-10-04T01:00:00Z"));
        assertThat(tr.endsAt()).isEqualTo(Instant.parse("2026-10-04T02:30:00Z"));
    }

    @Test
    void testCalculateTimeRange_startAndEnd() {
        LocalDate date = LocalDate.of(2026, 10, 4);
        LocalTime startTime = LocalTime.of(8, 0);
        LocalTime endTime = LocalTime.of(9, 30);

        AiDateTimeUtils.TimeRange tr = AiDateTimeUtils.calculateTimeRange(date, startTime, endTime, null, vnZone);

        assertThat(tr.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(tr.endTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(tr.durationMinutes()).isEqualTo(90);
        assertThat(tr.startsAt()).isEqualTo(Instant.parse("2026-10-04T01:00:00Z"));
        assertThat(tr.endsAt()).isEqualTo(Instant.parse("2026-10-04T02:30:00Z"));
    }

    @Test
    void testCalculateTimeRange_crossMidnight() {
        LocalDate date = LocalDate.of(2026, 10, 4);
        LocalTime startTime = LocalTime.of(23, 0);

        AiDateTimeUtils.TimeRange tr = AiDateTimeUtils.calculateTimeRange(date, startTime, null, 120, vnZone);

        assertThat(tr.startTime()).isEqualTo(LocalTime.of(23, 0));
        assertThat(tr.endTime()).isEqualTo(LocalTime.of(1, 0));
        assertThat(tr.endDate()).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(tr.durationMinutes()).isEqualTo(120);
    }

    @Test
    void testCalculateTimeRange_missingRequired_throwsException() {
        LocalDate date = LocalDate.of(2026, 10, 4);
        LocalTime startTime = LocalTime.of(8, 0);

        assertThatThrownBy(() -> AiDateTimeUtils.calculateTimeRange(null, startTime, null, 60, vnZone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ngày (date) không được để trống");

        assertThatThrownBy(() -> AiDateTimeUtils.calculateTimeRange(date, null, null, 60, vnZone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Giờ bắt đầu (start_time) không được để trống");

        assertThatThrownBy(() -> AiDateTimeUtils.calculateTimeRange(date, startTime, null, null, vnZone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Phải cung cấp thời lượng");
    }

    @Test
    void testParseLocalTime_variousFormats() {
        assertThat(AiDateTimeUtils.parseLocalTime("08:00")).isEqualTo(LocalTime.of(8, 0));
        assertThat(AiDateTimeUtils.parseLocalTime("8:30")).isEqualTo(LocalTime.of(8, 30));
        assertThat(AiDateTimeUtils.parseLocalTime("8h")).isEqualTo(LocalTime.of(8, 0));
        assertThat(AiDateTimeUtils.parseLocalTime("8h30")).isEqualTo(LocalTime.of(8, 30));
        assertThat(AiDateTimeUtils.parseLocalTime("14:00")).isEqualTo(LocalTime.of(14, 0));
        assertThat(AiDateTimeUtils.parseLocalTime("2026-10-04T08:00:00")).isEqualTo(LocalTime.of(8, 0));
    }

    @Test
    void testParseDurationMinutes_variousFormats() {
        assertThat(AiDateTimeUtils.parseDurationMinutes("90")).isEqualTo(90);
        assertThat(AiDateTimeUtils.parseDurationMinutes(90)).isEqualTo(90);
        assertThat(AiDateTimeUtils.parseDurationMinutes("90 phút")).isEqualTo(90);
        assertThat(AiDateTimeUtils.parseDurationMinutes("2 tiếng")).isEqualTo(120);
        assertThat(AiDateTimeUtils.parseDurationMinutes("1.5h")).isEqualTo(90);
    }
}
