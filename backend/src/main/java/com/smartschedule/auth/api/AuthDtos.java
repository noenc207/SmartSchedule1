package com.smartschedule.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank(message = "Mã kích hoạt không được để trống.") String activationKey) {

        public RegisterRequest(String displayName, String email, String password) {
            this(displayName, email, password, "");
        }
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank String password) {}

    public record RefreshRequest(String refreshToken) {}

    public record LogoutRequest(String refreshToken) {}

    public record UserResponse(
            UUID id, String email, String displayName, String avatarUrl,
            boolean enabled, String timezone, String locale, Instant createdAt, String tier) {
        public UserResponse(UUID id, String email, String displayName, String avatarUrl,
                            boolean enabled, String timezone, String locale, Instant createdAt) {
            this(id, email, displayName, avatarUrl, enabled, timezone, locale, createdAt, "PRO");
        }
    }

    public record AuthResponse(String accessToken, long expiresIn, UserResponse user, String refreshToken) {
        public AuthResponse(String accessToken, long expiresIn, UserResponse user) {
            this(accessToken, expiresIn, user, null);
        }
    }
}
