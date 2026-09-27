package com.smartschedule.location.infrastructure;

import com.smartschedule.location.domain.CampusEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface CampusEdgeRepository extends JpaRepository<CampusEdge, UUID> {
    @Query("SELECT e FROM CampusEdge e JOIN FETCH e.fromLocation JOIN FETCH e.toLocation")
    List<CampusEdge> findAllWithLocations();
}
