package com.smartschedule.location;

import com.smartschedule.location.application.CampusRoutingService;
import com.smartschedule.location.application.MobilityCheckService;
import com.smartschedule.location.application.OsmRoutingProvider;
import com.smartschedule.location.domain.CampusEdge;
import com.smartschedule.location.domain.Location;
import com.smartschedule.location.domain.LocationType;
import com.smartschedule.location.infrastructure.CampusEdgeRepository;
import com.smartschedule.location.infrastructure.LocationRepository;
import com.smartschedule.location.infrastructure.MobilityAcknowledgementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class MobilityRoutingTest {
    private CampusEdgeRepository edgeRepository;
    private LocationRepository locationRepository;
    private MobilityAcknowledgementRepository acknowledgementRepository;
    private CampusRoutingService routingService;
    private MobilityCheckService mobilityCheckService;

    private Location buildingA;
    private Location centralHall;
    private Location lab;
    private Location online;

    @BeforeEach
    void setUp() {
        edgeRepository = Mockito.mock(CampusEdgeRepository.class);
        locationRepository = Mockito.mock(LocationRepository.class);
        acknowledgementRepository = Mockito.mock(MobilityAcknowledgementRepository.class);
        OsmRoutingProvider osmProvider = new OsmRoutingProvider();

        routingService = new CampusRoutingService(edgeRepository, locationRepository, osmProvider);
        mobilityCheckService = new MobilityCheckService(routingService, locationRepository, acknowledgementRepository);

        buildingA = new Location(UUID.randomUUID(), "Campus Building A", LocationType.CAMPUS, "Building A", "A101", null, null, "fptu-qn", null);
        centralHall = new Location(UUID.randomUUID(), "Central Hall", LocationType.CAMPUS, "Central Hall", "H1", null, null, "fptu-qn", null);
        lab = new Location(UUID.randomUUID(), "Campus Lab", LocationType.CAMPUS, "Tech Wing", "L302", null, null, "fptu-qn", null);
        online = new Location(UUID.randomUUID(), "Online", LocationType.ONLINE, null, null, null, null, null, null);

        // Building A <-> Central Hall = 4 min
        CampusEdge edge1 = new CampusEdge(buildingA, centralHall, 4, 240, true);
        CampusEdge edge2 = new CampusEdge(centralHall, buildingA, 4, 240, true);
        // Central Hall <-> Lab = 5 min
        CampusEdge edge3 = new CampusEdge(centralHall, lab, 5, 300, true);
        CampusEdge edge4 = new CampusEdge(lab, centralHall, 5, 300, true);

        when(edgeRepository.findAllWithLocations()).thenReturn(List.of(edge1, edge2, edge3, edge4));
    }

    @Test
    void computesShortestPathBetweenCampusBuildingsViaDijkstra() {
        // Building A -> Lab via Central Hall = 4 + 5 = 9 min
        var estimate = routingService.getTravelEstimate(buildingA, lab);
        assertThat(estimate).isPresent();
        assertThat(estimate.get().durationMinutes()).isEqualTo(9);
        assertThat(estimate.get().distanceMeters()).isEqualTo(540);
        assertThat(estimate.get().mode()).isEqualTo("WALK");
    }

    @Test
    void fastPathForSameLocationReturnsZeroMinutesWithoutRouting() {
        var estimate = routingService.getTravelEstimate(buildingA, buildingA);
        assertThat(estimate).isPresent();
        assertThat(estimate.get().durationMinutes()).isEqualTo(0);
    }

    @Test
    void fastPathForOnlineLocationReturnsZeroMinutes() {
        var estimate = routingService.getTravelEstimate(buildingA, online);
        assertThat(estimate).isPresent();
        assertThat(estimate.get().durationMinutes()).isEqualTo(0);
    }

    @Test
    void detectsTightTransitionAsSoftWarningWhenAvailableLessThanTravelPlusBuffer() {
        UUID userId = UUID.randomUUID();
        Instant fromStart = Instant.parse("2026-09-22T09:00:00Z");
        Instant fromEnd = Instant.parse("2026-09-22T11:00:00Z");
        // 10 minutes available: travel is 9 min, buffer is 5 min -> required 14 min -> 10m is tight!
        Instant toStart = Instant.parse("2026-09-22T11:10:00Z");
        Instant toEnd = Instant.parse("2026-09-22T13:00:00Z");

        var eval = mobilityCheckService.evaluateTransition(
            userId, "ev1", "ev2", "Database", "Machine Learning",
            fromStart, fromEnd, toStart, toEnd, buildingA, lab, 5
        );

        assertThat(eval.hasWarning()).isTrue();
        assertThat(eval.isHardConflict()).isFalse();
        assertThat(eval.travelMinutes()).isEqualTo(9);
        assertThat(eval.availableMinutes()).isEqualTo(10);
        assertThat(eval.signature()).contains("ack:ev1:ev2");
    }

    @Test
    void detectsHardConflictWhenAvailableTimeIsLessThanTravelTime() {
        UUID userId = UUID.randomUUID();
        Instant fromStart = Instant.parse("2026-09-22T09:00:00Z");
        Instant fromEnd = Instant.parse("2026-09-22T11:00:00Z");
        // 5 minutes available for 9 min walk -> impossible!
        Instant toStart = Instant.parse("2026-09-22T11:05:00Z");
        Instant toEnd = Instant.parse("2026-09-22T13:00:00Z");

        var eval = mobilityCheckService.evaluateTransition(
            userId, "ev1", "ev2", "Database", "Machine Learning",
            fromStart, fromEnd, toStart, toEnd, buildingA, lab, 5
        );

        assertThat(eval.isHardConflict()).isTrue();
        assertThat(eval.hasWarning()).isFalse();
        assertThat(eval.travelMinutes()).isEqualTo(9);
        assertThat(eval.availableMinutes()).isEqualTo(5);
    }

    @Test
    void materialTimeChangeInvalidatesSignature() {
        UUID locA = UUID.randomUUID();
        UUID locB = UUID.randomUUID();
        String sig1 = mobilityCheckService.buildSignature("ev1", "ev2",
            Instant.parse("2026-09-22T09:00:00Z"), Instant.parse("2026-09-22T11:00:00Z"),
            Instant.parse("2026-09-22T11:05:00Z"), Instant.parse("2026-09-22T13:00:00Z"),
            locA, locB, 9, 5);

        String sig2 = mobilityCheckService.buildSignature("ev1", "ev2",
            Instant.parse("2026-09-22T09:00:00Z"), Instant.parse("2026-09-22T11:00:00Z"),
            Instant.parse("2026-09-22T11:30:00Z"), Instant.parse("2026-09-22T13:00:00Z"),
            locA, locB, 9, 5);

        assertThat(sig1).isNotEqualTo(sig2);
    }
}
