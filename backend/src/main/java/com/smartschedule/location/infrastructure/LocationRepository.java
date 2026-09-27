package com.smartschedule.location.infrastructure;

import com.smartschedule.location.domain.Location;
import com.smartschedule.location.domain.LocationType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID> {
    List<Location> findByType(LocationType type);
    List<Location> findByCampusId(String campusId);
    Optional<Location> findByNameIgnoreCase(String name);
}
