package com.smartschedule.user.api;

import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record UserResponse(UUID id, String name, String email, String avatarUrl,
                               String timezone, String locale, Instant createdAt, String tier) {
        public UserResponse(UUID id, String name, String email, String avatarUrl,
                            String timezone, String locale, Instant createdAt) {
            this(id, name, email, avatarUrl, timezone, locale, createdAt, "PRO");
        }
    }

    public record UpdateUserRequest(@Size(min = 2, max = 120) String name,
                                    @Size(max = 500) String avatarUrl,
                                    @Size(max = 64) String timezone,
                                    @Size(max = 16) String locale) {}
}
