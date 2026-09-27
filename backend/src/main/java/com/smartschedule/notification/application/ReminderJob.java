package com.smartschedule.notification.application;

import com.smartschedule.event.application.RecurrenceService;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.notification.domain.Notification;
import com.smartschedule.notification.infrastructure.NotificationRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ReminderJob {
    private final EventRepository events;
    private final NotificationRepository notifications;
    private final RecurrenceService recurrence;

    public ReminderJob(EventRepository events, NotificationRepository notifications,
                       RecurrenceService recurrence) {
        this.events = events;
        this.notifications = notifications;
        this.recurrence = recurrence;
    }

    @Scheduled(fixedDelayString = "${smartschedule.jobs.reminder-delay-ms:60000}")
    @Transactional
    public void createDueEventReminders() {
        Instant now = Instant.now();
        Instant horizon = now.plus(Duration.ofHours(48));
        for (Event event : events.findAll()) {
            if (event.getReminderMinutes() == null || event.getReminderMinutes() < 0
                    || "CANCELLED".equalsIgnoreCase(event.getStatus())) {
                continue;
            }
            List<RecurrenceService.Occurrence> occurrences =
                    recurrence.expand(event, now.minus(Duration.ofMinutes(event.getReminderMinutes())), horizon);
            for (RecurrenceService.Occurrence occurrence : occurrences) {
                Instant scheduledFor = occurrence.startsAt().minus(Duration.ofMinutes(event.getReminderMinutes()));
                // Only create reminders that are due (scheduledFor <= now + 30s) and for events that haven't ended yet
                if (scheduledFor.isAfter(now.plusSeconds(30)) || occurrence.endsAt().isBefore(now)) {
                    continue;
                }
                String key = event.getSchedule().getOwner().getId() + ":" + event.getId() + ":"
                        + occurrence.startsAt() + ":EVENT_REMINDER:" + scheduledFor;
                if (notifications.existsByIdempotencyKey(key)) {
                    continue;
                }
                notifications.save(new Notification(event.getSchedule().getOwner(), "EVENT_REMINDER",
                        event.getTitle(), "Starts at " + occurrence.startsAt().toString(),
                        "EVENT", event.getId(), scheduledFor, key));
            }
        }
    }
}
