package com.smartschedule.portal.application;

import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.portal.api.PortalDtos.*;
import com.smartschedule.portal.domain.ScheduleImport;
import com.smartschedule.portal.infrastructure.ScheduleImportRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortalImportService {
    private static final int MAX_IMPORT_ITEMS = 500;

    private final EventRepository eventRepository;
    private final ScheduleImportRepository importRepository;
    private final AuthorizationService authorization;
    private final UserRepository userRepository;

    public PortalImportService(EventRepository eventRepository,
                               ScheduleImportRepository importRepository,
                               AuthorizationService authorization,
                               UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.importRepository = importRepository;
        this.authorization = authorization;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PortalImportPreviewResponse preview(UUID scheduleId, PortalImportPreviewRequest request, UUID userId) {
        authorization.requireEditor(scheduleId, userId);
        if (request == null || request.items() == null) {
            throw new DomainException("INVALID_IMPORT_PAYLOAD", 422, "Import payload is empty.");
        }

        List<PortalImportItem> items = request.items();
        if (items.size() > MAX_IMPORT_ITEMS) {
            throw new DomainException("IMPORT_LIMIT_EXCEEDED", 422, "Import cannot exceed " + MAX_IMPORT_ITEMS + " items.");
        }

        List<PortalImportItem> validItems = new ArrayList<>();
        List<ConflictedItemDto> conflictedItems = new ArrayList<>();
        Set<String> seenExternalIds = new HashSet<>();
        int duplicates = 0;

        for (PortalImportItem item : items) {
            if (item == null || item.title() == null || item.title().isBlank()) continue;
            if (item.startsAt() == null || item.endsAt() == null || !item.startsAt().isBefore(item.endsAt())) continue;

            if (item.externalId() != null) {
                if (seenExternalIds.contains(item.externalId())) {
                    duplicates++;
                    continue;
                }
                seenExternalIds.add(item.externalId());
            }

            validItems.add(item);

            // Check conflict with existing events in schedule
            List<Event> overlaps = eventRepository.search(scheduleId, item.startsAt(), item.endsAt(), null, null, null);
            if (!overlaps.isEmpty()) {
                Event firstConflict = overlaps.get(0);
                conflictedItems.add(new ConflictedItemDto(
                        item,
                        firstConflict.getTitle(),
                        firstConflict.getStartsAt(),
                        firstConflict.getEndsAt()
                ));
            }
        }

        return new PortalImportPreviewResponse(
                items.size(),
                validItems.size(),
                conflictedItems.size(),
                duplicates,
                validItems,
                conflictedItems
        );
    }

    @Transactional
    public PortalImportSubmitResponse importSchedule(UUID scheduleId, PortalImportSubmitRequest request, UUID userId) {
        Schedule schedule = authorization.requireEditor(scheduleId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("USER_NOT_FOUND", 404, "User not found."));

        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new DomainException("EMPTY_IMPORT_REQUEST", 422, "No items provided for import.");
        }

        if (request.items().size() > MAX_IMPORT_ITEMS) {
            throw new DomainException("IMPORT_LIMIT_EXCEEDED", 422, "Import exceeds maximum allowable sessions.");
        }

        // Collect existing externalIds for idempotency
        List<String> incomingExternalIds = request.items().stream()
                .map(PortalImportItem::externalId)
                .filter(Objects::nonNull)
                .toList();

        Set<String> existingExternalIds = new HashSet<>();
        if (!incomingExternalIds.isEmpty()) {
            List<Event> existingEvents = eventRepository.findAllByScheduleIdAndExternalIdIn(scheduleId, incomingExternalIds);
            existingEvents.forEach(e -> {
                if (e.getExternalId() != null) existingExternalIds.add(e.getExternalId());
            });
        }

        int importedCount = 0;
        int duplicateCount = 0;
        int conflictCount = 0;

        for (PortalImportItem item : request.items()) {
            if (item == null || item.title() == null || !item.startsAt().isBefore(item.endsAt())) {
                continue;
            }

            // 1. Idempotent check
            if (item.externalId() != null && existingExternalIds.contains(item.externalId())) {
                duplicateCount++;
                continue;
            }

            // 2. Conflict check
            List<Event> overlaps = eventRepository.search(scheduleId, item.startsAt(), item.endsAt(), null, null, null);
            if (!overlaps.isEmpty()) {
                conflictCount++;
                if (request.skipConflicts()) {
                    continue;
                }
            }

            // 3. Create Event
            String desc = item.description();
            if (desc == null && item.courseCode() != null) {
                desc = "Mã môn: " + item.courseCode() + (item.teacher() != null ? " | GV: " + item.teacher() : "");
            }

            Event event = new Event(
                    schedule,
                    null,
                    item.title().trim(),
                    desc,
                    item.startsAt(),
                    item.endsAt(),
                    item.location(),
                    "MEDIUM",
                    "CONFIRMED",
                    null,
                    null,
                    null,
                    true,  // Fixed
                    true   // Locked
            );
            event.setExternalId(item.externalId());
            event.setSource(request.source());

            eventRepository.save(event);
            if (item.externalId() != null) {
                existingExternalIds.add(item.externalId());
            }
            importedCount++;
        }

        schedule.incrementVersion();

        // 4. Save import history record
        ScheduleImport history = new ScheduleImport(
                schedule,
                user,
                request.source(),
                request.ruleId(),
                request.ruleVersion(),
                request.items().size(),
                importedCount,
                duplicateCount,
                conflictCount
        );
        importRepository.save(history);

        return new PortalImportSubmitResponse(
                scheduleId,
                request.source(),
                request.items().size(),
                importedCount,
                duplicateCount,
                conflictCount,
                history.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<PortalImportHistoryResponse> getImportHistory(UUID scheduleId, UUID userId) {
        authorization.requireViewer(scheduleId, userId);
        return importRepository.findTop10ByScheduleIdOrderByCreatedAtDesc(scheduleId)
                .stream()
                .map(h -> new PortalImportHistoryResponse(
                        h.getId(),
                        h.getSchedule().getId(),
                        h.getSource(),
                        h.getRuleId(),
                        h.getRuleVersion(),
                        h.getTotalDetected(),
                        h.getImportedCount(),
                        h.getDuplicateCount(),
                        h.getConflictCount(),
                        h.getCreatedAt()
                ))
                .toList();
    }
}
