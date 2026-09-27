package com.smartschedule.location.infrastructure;

import com.smartschedule.location.domain.UserLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLocationRepository extends JpaRepository<UserLocation, UUID> {
    List<UserLocation> findAllByUserIdOrderByNameAsc(UUID userId);
    Optional<UserLocation> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByIdAndUserId(UUID id, UUID userId);
}
