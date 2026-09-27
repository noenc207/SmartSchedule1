package com.smartschedule.notification.infrastructure;

import com.smartschedule.notification.domain.Notification;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserId(UUID userId, Pageable pageable);
    Page<Notification> findByUserIdAndReadAtIsNull(UUID userId, Pageable pageable);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByIdempotencyKey(String idempotencyKey);
    long countByUserIdAndReadAtIsNull(UUID userId);
}
