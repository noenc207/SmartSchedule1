package com.smartschedule.notification.api;

import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos() {}

    public record NotificationResponse(UUID id, String type, String title, String message,
                                       String relatedEntityType, UUID relatedEntityId,
                                       Instant scheduledFor, Instant readAt, Instant createdAt) {}
}
