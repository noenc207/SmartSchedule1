package com.smartschedule.location.application;

import com.smartschedule.location.domain.Location;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class OsmRoutingProvider implements RoutingProvider {
    private static final Logger log = LoggerFactory.getLogger(OsmRoutingProvider.class);

    @Override
    public Optional<TravelEstimate> getTravelEstimate(Location from, Location to) {
        if (from == null || to == null) return Optional.empty();
        if (from.getId().equals(to.getId())) {
            return Optional.of(TravelEstimate.zero(from.getId(), to.getId()));
        }

        Double lat1 = from.getLatitude();
        Double lon1 = from.getLongitude();
        Double lat2 = to.getLatitude();
        Double lon2 = to.getLongitude();

        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return Optional.empty();
        }

        // Haversine formula calculation for geodesic distance (in meters)
        double earthRadius = 6371000; // meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        int distanceMeters = (int) Math.round(earthRadius * c);

        // Routing estimation: < 2km walk (~5km/h), >= 2km drive (~30km/h in city traffic)
        int durationMinutes;
        String mode;
        if (distanceMeters < 2000) {
            mode = "WALK";
            durationMinutes = Math.max(1, (int) Math.ceil((distanceMeters / 1000.0) / 5.0 * 60.0) + 2);
        } else {
            mode = "DRIVE";
            durationMinutes = Math.max(5, (int) Math.ceil((distanceMeters / 1000.0) / 30.0 * 60.0) + 4);
        }

        return Optional.of(new TravelEstimate(
            from.getId(),
            to.getId(),
            durationMinutes,
            distanceMeters,
            mode,
            "OSM_ESTIMATE",
            false
        ));
    }
}
