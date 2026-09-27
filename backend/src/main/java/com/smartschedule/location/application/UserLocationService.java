package com.smartschedule.location.application;

import com.smartschedule.common.error.DomainException;
import com.smartschedule.location.domain.UserLocation;
import com.smartschedule.location.infrastructure.UserLocationRepository;
import com.smartschedule.user.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UserLocationService {
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "HOME", "OFFICE", "CAFE", "CAMPUS", "GYM", "ONLINE", "CUSTOM", "TBD"
    );

    private final UserLocationRepository repository;

    public UserLocationService(UserLocationRepository repository) {
        this.repository = repository;
    }

    public record UserLocationDto(
            UUID id,
            UUID userId,
            UUID workspaceId,
            String name,
            String category,
            String address,
            Double latitude,
            Double longitude,
            Integer radiusMeters,
            String building,
            String room,
            Boolean isFavorite
    ) {}

    public record UserLocationInput(
            String name,
            String category,
            String address,
            Double latitude,
            Double longitude,
            Integer radiusMeters,
            String building,
            String room,
            Boolean isFavorite
    ) {}

    @Transactional(readOnly = true)
    public List<UserLocation> listForUser(UUID userId) {
        return repository.findAllByUserIdOrderByNameAsc(userId);
    }

    @Transactional(readOnly = true)
    public UserLocation getForUser(UUID id, UUID userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new DomainException("LOCATION_NOT_FOUND", 404, "User location not found."));
    }

    @Transactional
    public UserLocation create(User user, UserLocationInput input) {
        validateInput(input);
        UserLocation location = new UserLocation(
                user,
                user.getId(), // Default workspace_id to user_id (Option B)
                input.name().trim(),
                input.category() != null ? input.category().trim().toUpperCase() : "CUSTOM",
                input.address(),
                input.latitude(),
                input.longitude(),
                input.radiusMeters() != null ? input.radiusMeters() : 100,
                input.building(),
                input.room(),
                input.isFavorite() != null ? input.isFavorite() : false
        );
        return repository.save(location);
    }

    @Transactional
    public UserLocation update(UUID id, User user, UserLocationInput input) {
        UserLocation location = getForUser(id, user.getId());
        validateInput(input);
        location.update(
                input.name().trim(),
                input.category() != null ? input.category().trim().toUpperCase() : "CUSTOM",
                input.address(),
                input.latitude(),
                input.longitude(),
                input.radiusMeters() != null ? input.radiusMeters() : 100,
                input.building(),
                input.room(),
                input.isFavorite() != null ? input.isFavorite() : false
        );
        return repository.save(location);
    }

    @Transactional
    public void delete(UUID id, User user) {
        UserLocation location = getForUser(id, user.getId());
        repository.delete(location);
    }

    private void validateInput(UserLocationInput input) {
        if (input == null) {
            throw new DomainException("INVALID_LOCATION", 422, "Location payload cannot be null.");
        }
        if (input.name() == null || input.name().trim().isBlank()) {
            throw new DomainException("INVALID_LOCATION_NAME", 422, "Location name cannot be blank.");
        }
        if (input.name().trim().length() > 160) {
            throw new DomainException("INVALID_LOCATION_NAME", 422, "Location name cannot exceed 160 characters.");
        }
        if (input.category() != null && !input.category().isBlank()) {
            String upper = input.category().trim().toUpperCase();
            if (!ALLOWED_CATEGORIES.contains(upper)) {
                throw new DomainException("INVALID_LOCATION_CATEGORY", 422,
                        "Category must be one of: " + ALLOWED_CATEGORIES);
            }
        }
        if (input.latitude() == null || Double.isNaN(input.latitude()) || Double.isInfinite(input.latitude())
                || input.latitude() < -90.0 || input.latitude() > 90.0) {
            throw new DomainException("INVALID_COORDINATES", 422, "Latitude must be a valid number between -90 and 90.");
        }
        if (input.longitude() == null || Double.isNaN(input.longitude()) || Double.isInfinite(input.longitude())
                || input.longitude() < -180.0 || input.longitude() > 180.0) {
            throw new DomainException("INVALID_COORDINATES", 422, "Longitude must be a valid number between -180 and 180.");
        }
        if (input.radiusMeters() != null && (input.radiusMeters() < 0 || input.radiusMeters() > 50000)) {
            throw new DomainException("INVALID_RADIUS", 422, "Radius meters must be between 0 and 50000.");
        }
    }
}
