package com.smartschedule.notification.api;

import com.smartschedule.common.web.PageResponse;
import com.smartschedule.notification.api.NotificationDtos.NotificationResponse;
import com.smartschedule.notification.application.NotificationService;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<NotificationResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return service.list(page, size, unreadOnly);
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable UUID id) {
        service.markRead(id);
    }

    @PostMapping("/read-all")
    public void markAllRead() {
        service.markAllRead();
    }
}
