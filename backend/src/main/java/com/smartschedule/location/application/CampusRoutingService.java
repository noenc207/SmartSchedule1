package com.smartschedule.location.application;

import com.smartschedule.location.domain.CampusEdge;
import com.smartschedule.location.domain.Location;
import com.smartschedule.location.infrastructure.CampusEdgeRepository;
import com.smartschedule.location.infrastructure.LocationRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CampusRoutingService {
    private final CampusEdgeRepository edgeRepository;
    private final LocationRepository locationRepository;
    private final OsmRoutingProvider osmRoutingProvider;

    // In-memory travel cache: "fromId:toId:mode" -> TravelEstimate
    private final Map<String, TravelEstimate> travelCache = new ConcurrentHashMap<>();

    public CampusRoutingService(CampusEdgeRepository edgeRepository,
                                LocationRepository locationRepository,
                                OsmRoutingProvider osmRoutingProvider) {
        this.edgeRepository = edgeRepository;
        this.locationRepository = locationRepository;
        this.osmRoutingProvider = osmRoutingProvider;
    }

    public Optional<TravelEstimate> getTravelEstimate(Location from, Location to) {
        if (from == null || to == null) return Optional.empty();

        // 1. Same physical location fast path
        if (from.getId().equals(to.getId())) {
            return Optional.of(TravelEstimate.zero(from.getId(), to.getId()));
        }

        // Fast path for non-physical locations
        if (from.isOnline() || to.isOnline() || from.getType().name().equals("TBD") || to.getType().name().equals("TBD")) {
            return Optional.of(TravelEstimate.zero(from.getId(), to.getId()));
        }

        String cacheKey = from.getId() + ":" + to.getId() + ":WALK";
        TravelEstimate cached = travelCache.get(cacheKey);
        if (cached != null) {
            return Optional.of(new TravelEstimate(
                cached.fromLocationId(),
                cached.toLocationId(),
                cached.durationMinutes(),
                cached.distanceMeters(),
                cached.mode(),
                cached.source(),
                true
            ));
        }

        // 2. Campus graph shortest path (Dijkstra)
        Optional<TravelEstimate> campusEstimate = computeCampusShortestPath(from, to);
        if (campusEstimate.isPresent()) {
            travelCache.put(cacheKey, campusEstimate.get());
            return campusEstimate;
        }

        // 3. Fallback to OSM / external provider
        Optional<TravelEstimate> externalEstimate = osmRoutingProvider.getTravelEstimate(from, to);
        externalEstimate.ifPresent(estimate -> travelCache.put(cacheKey, estimate));
        return externalEstimate;
    }

    public Optional<TravelEstimate> getTravelEstimate(UUID fromLocationId, UUID toLocationId) {
        if (fromLocationId == null || toLocationId == null) return Optional.empty();
        if (fromLocationId.equals(toLocationId)) {
            return Optional.of(TravelEstimate.zero(fromLocationId, toLocationId));
        }
        Location from = locationRepository.findById(fromLocationId).orElse(null);
        Location to = locationRepository.findById(toLocationId).orElse(null);
        return getTravelEstimate(from, to);
    }

    private Optional<TravelEstimate> computeCampusShortestPath(Location from, Location to) {
        List<CampusEdge> edges = edgeRepository.findAllWithLocations();
        if (edges.isEmpty()) return Optional.empty();

        // Build adjacency list: node -> list of (neighbor, walkingMinutes, distanceMeters)
        Map<UUID, List<EdgeTarget>> graph = new HashMap<>();
        for (CampusEdge edge : edges) {
            UUID u = edge.getFromLocation().getId();
            UUID v = edge.getToLocation().getId();
            int mins = edge.getWalkingMinutes();
            int dist = edge.getDistanceMeters() != null ? edge.getDistanceMeters() : mins * 60;

            graph.computeIfAbsent(u, k -> new ArrayList<>()).add(new EdgeTarget(v, mins, dist));
            // Ensure bidirectional if not already in graph
            graph.computeIfAbsent(v, k -> new ArrayList<>()).add(new EdgeTarget(u, mins, dist));
        }

        UUID start = from.getId();
        UUID goal = to.getId();

        if (!graph.containsKey(start) || !graph.containsKey(goal)) {
            return Optional.empty();
        }

        // Dijkstra's algorithm
        Map<UUID, Integer> dist = new HashMap<>();
        Map<UUID, Integer> metersDist = new HashMap<>();
        PriorityQueue<PathNode> pq = new PriorityQueue<>(Comparator.comparingInt(PathNode::cost));

        dist.put(start, 0);
        metersDist.put(start, 0);
        pq.add(new PathNode(start, 0));

        while (!pq.isEmpty()) {
            PathNode curr = pq.poll();
            if (curr.id().equals(goal)) {
                return Optional.of(new TravelEstimate(
                    start,
                    goal,
                    dist.get(goal),
                    metersDist.get(goal),
                    "WALK",
                    "CAMPUS_GRAPH",
                    false
                ));
            }
            if (curr.cost() > dist.getOrDefault(curr.id(), Integer.MAX_VALUE)) continue;

            for (EdgeTarget edge : graph.getOrDefault(curr.id(), Collections.emptyList())) {
                int newDist = curr.cost() + edge.minutes();
                if (newDist < dist.getOrDefault(edge.neighbor(), Integer.MAX_VALUE)) {
                    dist.put(edge.neighbor(), newDist);
                    metersDist.put(edge.neighbor(), metersDist.getOrDefault(curr.id(), 0) + edge.meters());
                    pq.add(new PathNode(edge.neighbor(), newDist));
                }
            }
        }

        return Optional.empty();
    }

    private record EdgeTarget(UUID neighbor, int minutes, int meters) {}
    private record PathNode(UUID id, int cost) {}
}
