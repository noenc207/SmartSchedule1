package com.smartschedule.location.application;

import java.util.UUID;

public record TravelEstimate(
    UUID fromLocationId,
    UUID toLocationId,
    int durationMinutes,
    Integer distanceMeters,
    String mode,
    String source,
    boolean cached
) {
    public static TravelEstimate zero(UUID fromLocationId, UUID toLocationId) {
        return new TravelEstimate(fromLocationId, toLocationId, 0, 0, "WALK", "FAST_PATH", true);
    }
}
