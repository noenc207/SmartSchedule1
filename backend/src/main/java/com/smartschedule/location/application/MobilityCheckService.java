package com.smartschedule.location.application;

import com.smartschedule.user.domain.User;
import com.smartschedule.event.domain.Event;
import com.smartschedule.location.domain.Location;
import com.smartschedule.location.domain.MobilityAcknowledgement;
import com.smartschedule.location.infrastructure.LocationRepository;
import com.smartschedule.location.infrastructure.MobilityAcknowledgementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class MobilityCheckService {
    private final CampusRoutingService routingService;
    private final LocationRepository locationRepository;
    private final MobilityAcknowledgementRepository acknowledgementRepository;

    private static final int DEFAULT_BUFFER_MINUTES = 5;

    public MobilityCheckService(CampusRoutingService routingService,
                                LocationRepository locationRepository,
                                MobilityAcknowledgementRepository acknowledgementRepository) {
        this.routingService = routingService;
        this.locationRepository = locationRepository;
        this.acknowledgementRepository = acknowledgementRepository;
    }

    public record MobilityEvaluation(
        String status, // "NORMAL", "MOBILITY_WARNING", "MOBILITY_CONFLICT"
        boolean hasWarning,
        boolean isHardConflict,
        boolean isAcknowledged,
        String fromTitle,
        String toTitle,
        String fromLocationName,
        String toLocationName,
        int travelMinutes,
        int availableMinutes,
        int bufferMinutes,
        String signature,
        String message
    ) {
        public static MobilityEvaluation normal() {
            return new MobilityEvaluation("NORMAL", false, false, false, null, null, null, null, 0, 0, 0, null, null);
        }
    }

    /**
     * Strict Adjacency Evaluation for a single candidate/updated event relative to its neighboring events.
     */
    public MobilityEvaluation evaluateCandidate(UUID userId,
                                                Instant candidateStart,
                                                Instant candidateEnd,
                                                String candidateTitle,
                                                UUID candidateLocationId,
                                                String candidateLocationName,
                                                List<Event> chronologicalDayEvents,
                                                UUID excludeEventId) {
        // Fast path: Candidate has no physical location -> Skip entirely
        Location candidateLoc = resolvePhysicalLocation(candidateLocationId, candidateLocationName);
        if (candidateLoc == null || !candidateLoc.isPhysical()) {
            return MobilityEvaluation.normal();
        }

        // Filter chronological events for same day, ignoring the event being edited
        List<Event> sorted = chronologicalDayEvents.stream()
            .filter(e -> excludeEventId == null || !e.getId().equals(excludeEventId))
            .sorted(Comparator.comparing(Event::getStartsAt))
            .toList();

        // 1. Check directly adjacent previous event
        Event prev = null;
        for (Event e : sorted) {
            if (!e.getEndsAt().isAfter(candidateStart)) {
                prev = e;
            } else {
                break;
            }
        }

        if (prev != null) {
            Location prevLoc = resolvePhysicalLocation(prev.getLocationId(), prev.getLocation());
            // Strict Adjacency Rule: ONLY evaluate if immediately prior event also has a physical location
            if (prevLoc != null && prevLoc.isPhysical()) {
                MobilityEvaluation eval = evaluateTransition(
                    userId,
                    prev.getId() != null ? prev.getId().toString() : "prev",
                    "candidate",
                    prev.getTitle(),
                    candidateTitle,
                    prev.getStartsAt(),
                    prev.getEndsAt(),
                    candidateStart,
                    candidateEnd,
                    prevLoc,
                    candidateLoc,
                    DEFAULT_BUFFER_MINUTES
                );
                if (eval.hasWarning() || eval.isHardConflict()) {
                    return eval;
                }
            }
        }

        // 2. Check directly adjacent next event
        Event next = null;
        for (Event e : sorted) {
            if (!e.getStartsAt().isBefore(candidateEnd)) {
                next = e;
                break;
            }
        }

        if (next != null) {
            Location nextLoc = resolvePhysicalLocation(next.getLocationId(), next.getLocation());
            // Strict Adjacency Rule: ONLY evaluate if immediately following event also has a physical location
            if (nextLoc != null && nextLoc.isPhysical()) {
                MobilityEvaluation eval = evaluateTransition(
                    userId,
                    "candidate",
                    next.getId() != null ? next.getId().toString() : "next",
                    candidateTitle,
                    next.getTitle(),
                    candidateStart,
                    candidateEnd,
                    next.getStartsAt(),
                    next.getEndsAt(),
                    candidateLoc,
                    nextLoc,
                    DEFAULT_BUFFER_MINUTES
                );
                if (eval.hasWarning() || eval.isHardConflict()) {
                    return eval;
                }
            }
        }

        return MobilityEvaluation.normal();
    }

    public MobilityEvaluation evaluateTransition(UUID userId,
                                                 String fromId,
                                                 String toId,
                                                 String fromTitle,
                                                 String toTitle,
                                                 Instant fromStart,
                                                 Instant fromEnd,
                                                 Instant toStart,
                                                 Instant toEnd,
                                                 Location fromLoc,
                                                 Location toLoc,
                                                 int bufferMinutes) {
        // Fast path: Same location -> 0 travel minutes
        if (fromLoc.getId().equals(toLoc.getId())) {
            return MobilityEvaluation.normal();
        }

        Optional<TravelEstimate> estimateOpt = routingService.getTravelEstimate(fromLoc, toLoc);
        if (estimateOpt.isEmpty()) {
            return MobilityEvaluation.normal();
        }

        int travelMinutes = estimateOpt.get().durationMinutes();
        int availableMinutes = (int) Duration.between(fromEnd, toStart).toMinutes();

        String signature = buildSignature(fromId, toId, fromStart, fromEnd, toStart, toEnd,
                                          fromLoc.getId(), toLoc.getId(), travelMinutes, bufferMinutes);

        // Check if user has acknowledged this exact transition signature
        boolean acknowledged = userId != null && acknowledgementRepository.existsByUserIdAndSignature(userId, signature);

        // Hard conflict: physically impossible
        if (availableMinutes < travelMinutes) {
            String msg = String.format("Không đủ thời gian di chuyển từ %s đến %s (Cần %d phút, chỉ có %d phút trống)",
                                       fromLoc.getName(), toLoc.getName(), travelMinutes, availableMinutes);
            return new MobilityEvaluation("MOBILITY_CONFLICT", false, true, acknowledged,
                                          fromTitle, toTitle, fromLoc.getName(), toLoc.getName(),
                                          travelMinutes, availableMinutes, bufferMinutes, signature, msg);
        }

        // Soft warning: feasible but uncomfortably tight
        if (availableMinutes < travelMinutes + bufferMinutes) {
            String msg = String.format("Thời gian chuyển tiếp khá sát giữa %s và %s (Di chuyển ước tính: %d phút, trống: %d phút)",
                                       fromLoc.getName(), toLoc.getName(), travelMinutes, availableMinutes);
            return new MobilityEvaluation("MOBILITY_WARNING", true, false, acknowledged,
                                          fromTitle, toTitle, fromLoc.getName(), toLoc.getName(),
                                          travelMinutes, availableMinutes, bufferMinutes, signature, msg);
        }

        return MobilityEvaluation.normal();
    }

    @Transactional
    public void acknowledgeWarning(User user, String signature, UUID fromEventId, UUID toEventId) {
        if (user == null || signature == null || signature.isBlank()) return;
        if (!acknowledgementRepository.existsByUserIdAndSignature(user.getId(), signature)) {
            acknowledgementRepository.save(new MobilityAcknowledgement(user, fromEventId, toEventId, signature));
        }
    }

    public String buildSignature(String fromId, String toId,
                                 Instant fromStart, Instant fromEnd,
                                 Instant toStart, Instant toEnd,
                                 UUID fromLocId, UUID toLocId,
                                 int travelMinutes, int bufferMinutes) {
        return String.format("ack:%s:%s:%s:%s:%s:%s:%s:%s:%d:%d",
                             fromId, toId, fromStart, fromEnd, toStart, toEnd,
                             fromLocId, toLocId, travelMinutes, bufferMinutes);
    }

    private Location resolvePhysicalLocation(UUID locationId, String locationName) {
        if (locationId != null) {
            Location loc = locationRepository.findById(locationId).orElse(null);
            if (loc != null) return loc;
        }
        if (locationName != null && !locationName.trim().isEmpty()) {
            return locationRepository.findByNameIgnoreCase(locationName.trim()).orElse(null);
        }
        return null;
    }
}
