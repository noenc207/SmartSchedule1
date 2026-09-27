package com.smartschedule.location.api;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.location.application.CampusRoutingService;
import com.smartschedule.location.application.MobilityCheckService;
import com.smartschedule.location.application.MobilityCheckService.MobilityEvaluation;
import com.smartschedule.location.application.TravelEstimate;
import com.smartschedule.location.application.UserLocationService;
import com.smartschedule.location.application.UserLocationService.UserLocationInput;
import com.smartschedule.location.domain.Location;
import com.smartschedule.location.domain.UserLocation;
import com.smartschedule.location.infrastructure.LocationRepository;
import com.smartschedule.user.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class LocationController {
    private final LocationRepository locationRepository;
    private final UserLocationService userLocationService;
    private final CampusRoutingService routingService;
    private final MobilityCheckService mobilityService;
    private final CurrentUserService currentUser;
    private final EventRepository eventRepository;

    public LocationController(LocationRepository locationRepository,
                              UserLocationService userLocationService,
                              CampusRoutingService routingService,
                              MobilityCheckService mobilityService,
                              CurrentUserService currentUser,
                              EventRepository eventRepository) {
        this.locationRepository = locationRepository;
        this.userLocationService = userLocationService;
        this.routingService = routingService;
        this.mobilityService = mobilityService;
        this.currentUser = currentUser;
        this.eventRepository = eventRepository;
    }

    public record LocationResponse(
            UUID id,
            String name,
            String type,
            String category,
            String address,
            String building,
            String room,
            Double latitude,
            Double longitude,
            Integer radiusMeters,
            Boolean isFavorite,
            String campusId,
            Boolean isCustom,
            UUID userId,
            UUID workspaceId,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record AcknowledgeRequest(String signature, UUID fromEventId, UUID toEventId) {}

    public record CandidateMobilityRequest(
        UUID scheduleId,
        Instant startsAt,
        Instant endsAt,
        String title,
        UUID locationId,
        String location,
        UUID excludeEventId
    ) {}

    @GetMapping("/locations")
    public List<LocationResponse> listLocations() {
        User user = currentUser.requireUser();
        List<LocationResponse> result = new ArrayList<>();

        // 1. Campus locations (shared / public)
        locationRepository.findAll().forEach(l ->
            result.add(toResponse(l))
        );

        // 2. Authenticated user's private custom locations
        userLocationService.listForUser(user.getId()).forEach(ul ->
            result.add(toResponse(ul))
        );

        return result;
    }

    @PostMapping("/locations")
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse createLocation(@Valid @RequestBody UserLocationInput input) {
        User user = currentUser.requireUser();
        UserLocation created = userLocationService.create(user, input);
        return toResponse(created);
    }

    @GetMapping("/locations/{id}")
    public ResponseEntity<LocationResponse> getLocation(@PathVariable UUID id) {
        User user = currentUser.requireUser();

        // 1. Check user locations first
        try {
            UserLocation ul = userLocationService.getForUser(id, user.getId());
            return ResponseEntity.ok(toResponse(ul));
        } catch (DomainException ignored) {}

        // 2. Check campus locations
        return locationRepository.findById(id)
            .map(l -> ResponseEntity.ok(toResponse(l)))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/locations/{id}")
    public LocationResponse updateLocation(@PathVariable UUID id, @Valid @RequestBody UserLocationInput input) {
        User user = currentUser.requireUser();
        UserLocation updated = userLocationService.update(id, user, input);
        return toResponse(updated);
    }

    @DeleteMapping("/locations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLocation(@PathVariable UUID id) {
        User user = currentUser.requireUser();
        userLocationService.delete(id, user);
    }

    @GetMapping("/travel/estimate")
    public ResponseEntity<TravelEstimate> getTravelEstimate(@RequestParam UUID from, @RequestParam UUID to) {
        Optional<TravelEstimate> estimate = routingService.getTravelEstimate(from, to);
        return estimate.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/mobility/acknowledge")
    public ResponseEntity<Void> acknowledgeWarning(@RequestBody AcknowledgeRequest request) {
        User user = currentUser.requireUser();
        mobilityService.acknowledgeWarning(user, request.signature(), request.fromEventId(), request.toEventId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/events/check-mobility")
    public ResponseEntity<MobilityEvaluation> checkCandidateMobility(@RequestBody CandidateMobilityRequest req) {
        User user = currentUser.requireUser();
        Instant dayStart = req.startsAt().minusSeconds(12 * 3600);
        Instant dayEnd = req.endsAt().plusSeconds(12 * 3600);

        List<Event> dayEvents = eventRepository.search(req.scheduleId(), dayStart, dayEnd, null, null, null);
        MobilityEvaluation evaluation = mobilityService.evaluateCandidate(
            user.getId(),
            req.startsAt(),
            req.endsAt(),
            req.title(),
            req.locationId(),
            req.location(),
            dayEvents,
            req.excludeEventId()
        );
        return ResponseEntity.ok(evaluation);
    }

    private LocationResponse toResponse(Location l) {
        return new LocationResponse(
                l.getId(),
                l.getName(),
                l.getType() != null ? l.getType().name() : "CAMPUS",
                l.getType() != null ? l.getType().name() : "CAMPUS",
                null,
                l.getBuilding(),
                l.getRoom(),
                l.getLatitude(),
                l.getLongitude(),
                100,
                false,
                l.getCampusId(),
                false,
                null,
                null,
                l.getCreatedAt(),
                l.getUpdatedAt()
        );
    }

    private LocationResponse toResponse(UserLocation ul) {
        return new LocationResponse(
                ul.getId(),
                ul.getName(),
                ul.getCategory(),
                ul.getCategory(),
                ul.getAddress(),
                ul.getBuilding(),
                ul.getRoom(),
                ul.getLatitude(),
                ul.getLongitude(),
                ul.getRadiusMeters(),
                ul.isFavorite(),
                null,
                true,
                ul.getUser().getId(),
                ul.getWorkspaceId(),
                ul.getCreatedAt(),
                ul.getUpdatedAt()
        );
    }
}
