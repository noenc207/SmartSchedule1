package com.smartschedule.location;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smartschedule.common.error.DomainException;
import com.smartschedule.location.application.UserLocationService;
import com.smartschedule.location.application.UserLocationService.UserLocationInput;
import com.smartschedule.location.domain.UserLocation;
import com.smartschedule.location.infrastructure.UserLocationRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

class UserLocationServiceTest {
    private UserLocationRepository repository;
    private UserLocationService service;
    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        repository = mock(UserLocationRepository.class);
        service = new UserLocationService(repository);
        userA = new User("userA@example.com", "hash", "User A");
        userB = new User("userB@example.com", "hash", "User B");
    }

    @Test
    void createsUserLocationSuccessfullyWithValidData() {
        UserLocationInput input = new UserLocationInput(
                "My Dorm Room", "HOME", "Room 402, Block C",
                13.7590, 109.2185, 50, "Block C", "402", true
        );

        when(repository.save(any(UserLocation.class))).thenAnswer(inv -> inv.getArgument(0));

        UserLocation created = service.create(userA, input);

        assertThat(created.getName()).isEqualTo("My Dorm Room");
        assertThat(created.getCategory()).isEqualTo("HOME");
        assertThat(created.getLatitude()).isEqualTo(13.7590);
        assertThat(created.getLongitude()).isEqualTo(109.2185);
        assertThat(created.getUser()).isEqualTo(userA);
        assertThat(created.isFavorite()).isTrue();
    }

    @Test
    void rejectsInvalidCoordinates() {
        UserLocationInput invalidLat = new UserLocationInput(
                "Invalid Lat", "CUSTOM", null, 95.0, 109.0, 100, null, null, false
        );
        assertThatThrownBy(() -> service.create(userA, invalidLat))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Latitude");

        UserLocationInput nanLat = new UserLocationInput(
                "NaN Lng", "CUSTOM", null, 13.0, Double.NaN, 100, null, null, false
        );
        assertThatThrownBy(() -> service.create(userA, nanLat))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Longitude");
    }

    @Test
    void rejectsBlankName() {
        UserLocationInput blank = new UserLocationInput(
                "   ", "CUSTOM", null, 13.0, 109.0, 100, null, null, false
        );
        assertThatThrownBy(() -> service.create(userA, blank))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("name cannot be blank");
    }

    @Test
    void userCannotAccessOrUpdateOrDeleteAnotherUsersLocation() {
        UUID locId = UUID.randomUUID();
        UserLocation locOfA = new UserLocation(userA, userA.getId(), "A's Desk", "OFFICE", null, 13.0, 109.0, 100, null, null, false);

        // When user B attempts to get location of user A:
        when(repository.findByIdAndUserId(locId, userB.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getForUser(locId, userB.getId()))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not found");

        UserLocationInput updateInput = new UserLocationInput("Hacked", "OFFICE", null, 13.0, 109.0, 100, null, null, false);
        assertThatThrownBy(() -> service.update(locId, userB, updateInput))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not found");

        assertThatThrownBy(() -> service.delete(locId, userB))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not found");
    }
}
