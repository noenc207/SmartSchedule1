package com.smartschedule.location.application;

import com.smartschedule.location.domain.Location;
import java.util.Optional;

public interface RoutingProvider {
    Optional<TravelEstimate> getTravelEstimate(Location from, Location to);
}
