package com.smartschedule.ai.application;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Single Canonical Source of Truth for SmartSchedule AI Date & Time calculations.
 * Ensures consistent timezone handling (Asia/Ho_Chi_Minh, UTC+7) across AI proposal,
 * validation, confirmation, database mutation, and calendar rendering.
 */
public final class AiDateTimeUtils {
    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    public static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    public static final DateTimeFormatter VI_DATE_FMT = DateTimeFormatter.ofPattern("EEEE, dd/MM", Locale.forLanguageTag("vi-VN"));

    private AiDateTimeUtils() {}

    public record TimeRange(
            LocalDate startDate,
            LocalTime startTime,
            LocalDate endDate,
            LocalTime endTime,
            int durationMinutes,
            Instant startsAt,
            Instant endsAt
    ) {
        public String formatSummary(String title) {
            ZonedDateTime sLocal = startsAt.atZone(DEFAULT_ZONE);
            ZonedDateTime eLocal = endsAt.atZone(DEFAULT_ZONE);
            return String.format("%s vào %s (%s–%s)",
                    title, sLocal.format(VI_DATE_FMT), sLocal.format(TIME_FMT), eLocal.format(TIME_FMT));
        }
    }

    /**
     * Calculates canonical start and end times given date, start time, and either end time or duration.
     * Enforces that endsAt > startsAt and handles midnight/cross-day duration cleanly.
     */
    public static TimeRange calculateTimeRange(
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            Integer durationMinutes,
            ZoneId zoneId
    ) {
        if (date == null) {
            throw new IllegalArgumentException("Ngày (date) không được để trống.");
        }
        if (startTime == null) {
            throw new IllegalArgumentException("Giờ bắt đầu (start_time) không được để trống.");
        }
        ZoneId zone = (zoneId != null) ? zoneId : DEFAULT_ZONE;

        ZonedDateTime startZdt = date.atTime(startTime).atZone(zone);
        ZonedDateTime endZdt;
        int computedDuration;

        if (endTime != null) {
            LocalDate endDate = endTime.isBefore(startTime) ? date.plusDays(1) : date;
            endZdt = endDate.atTime(endTime).atZone(zone);
            long diffMinutes = Duration.between(startZdt, endZdt).toMinutes();
            if (diffMinutes <= 0) {
                throw new IllegalArgumentException("Giờ kết thúc phải sau giờ bắt đầu.");
            }
            computedDuration = (int) diffMinutes;
        } else if (durationMinutes != null && durationMinutes > 0) {
            computedDuration = durationMinutes;
            endZdt = startZdt.plusMinutes(durationMinutes);
        } else {
            throw new IllegalArgumentException("Phải cung cấp thời lượng (duration_minutes) hoặc giờ kết thúc (end_time).");
        }

        return new TimeRange(
                startZdt.toLocalDate(),
                startZdt.toLocalTime(),
                endZdt.toLocalDate(),
                endZdt.toLocalTime(),
                computedDuration,
                startZdt.toInstant(),
                endZdt.toInstant()
        );
    }

    /**
     * Parses time string in various formats: "08:00", "8:00", "8h", "8h30", "2026-10-04T08:00:00"
     */
    public static LocalTime parseLocalTime(Object raw) {
        if (raw == null) return null;
        String str = raw.toString().trim();
        if (str.isEmpty()) return null;

        // Try standard ISO LocalTime: HH:mm or HH:mm:ss
        try {
            if (str.contains("T")) {
                str = str.substring(str.indexOf('T') + 1);
            }
            if (str.contains("Z")) {
                str = str.replace("Z", "");
            }
            if (str.contains("+")) {
                str = str.substring(0, str.indexOf('+'));
            }
            if (str.contains(":")) {
                String[] parts = str.split(":");
                int h = Integer.parseInt(parts[0].trim());
                int m = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
                return LocalTime.of(h, m);
            }
        } catch (Exception ignored) {}

        // Vietnamese format like "8h", "8h30", "8g"
        try {
            String lower = str.toLowerCase();
            if (lower.contains("h") || lower.contains("g")) {
                String[] parts = lower.split("[hg]");
                int h = Integer.parseInt(parts[0].trim());
                int m = parts.length > 1 && !parts[1].isBlank() ? Integer.parseInt(parts[1].trim()) : 0;
                return LocalTime.of(h, m);
            }
        } catch (Exception ignored) {}

        return null;
    }

    /**
     * Parses duration in minutes from integer or string ("90", "90 phút", "1.5h", "2 tiếng")
     */
    public static Integer parseDurationMinutes(Object raw) {
        if (raw == null) return null;
        String str = raw.toString().trim();
        if (str.isEmpty()) return null;

        try {
            return Integer.parseInt(str);
        } catch (NumberFormatException ignored) {}

        try {
            String lower = str.toLowerCase();

            boolean hasRuoi = lower.contains("rưỡi") || lower.contains("ruoi");
            boolean isNuaTieng = lower.contains("nửa tiếng") || lower.contains("nua tieng") || lower.contains("nửa giờ") || lower.contains("nua gio");
            if (isNuaTieng) {
                return 30;
            }

            // Check minute units first: "phút", "min", "m"
            if (lower.contains("phút") || lower.contains("min") || (lower.contains("p") && !lower.contains("tiếng") && !lower.contains("giờ"))) {
                String numPart = lower.replaceAll("[^0-9]", "").trim();
                if (!numPart.isEmpty()) {
                    return Integer.parseInt(numPart);
                }
            }

            // Check hour units: "tiếng", "giờ", or ending with "h"
            if (lower.contains("tiếng") || lower.contains("giờ") || lower.matches(".*\\d+(\\.\\d+)?\\s*h.*")) {
                String numPart = lower.replaceAll("[^0-9.]", "").trim();
                if (!numPart.isEmpty()) {
                    double hours = Double.parseDouble(numPart);
                    if (hasRuoi) {
                        hours += 0.5;
                    }
                    return (int) Math.round(hours * 60);
                } else if (hasRuoi) {
                    return 30;
                }
            }
        } catch (Exception ignored) {}

        return null;
    }
}
