package com.smartschedule.notification.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.common.web.PageResponse;
import com.smartschedule.notification.api.NotificationDtos.NotificationResponse;
import com.smartschedule.notification.domain.Notification;
import com.smartschedule.notification.infrastructure.NotificationRepository;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final CurrentUserService currentUser;

    public NotificationService(NotificationRepository notifications, CurrentUserService currentUser) {
        this.notifications = notifications;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(int page, int size, boolean unreadOnly) {
        UUID userId = currentUser.requireUser().getId();
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = unreadOnly
                ? notifications.findByUserIdAndReadAtIsNull(userId, pageable)
                : notifications.findByUserId(userId, pageable);
        return new PageResponse<>(result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public void markRead(UUID id) {
        Notification notification = notifications.findByIdAndUserId(id, currentUser.requireUser().getId())
                .orElseThrow(() -> new DomainException("NOTIFICATION_NOT_FOUND", 404, "Notification not found."));
        notification.markRead();
    }

    @Transactional
    public void markAllRead() {
        UUID userId = currentUser.requireUser().getId();
        notifications.findByUserIdAndReadAtIsNull(userId, PageRequest.of(0, 1000))
                .forEach(Notification::markRead);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getMessage(),
                n.getRelatedEntityType(), n.getRelatedEntityId(), n.getScheduledFor(),
                n.getReadAt(), n.getCreatedAt());
    }
}
