package com.smartschedule.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartschedule.auth.application.JwtService;
import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.user.domain.User;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class JwtServiceTest {
    private final JwtService jwt = new JwtService(new AuthProperties(
            "01234567890123456789012345678901",
            Duration.ofMinutes(15), Duration.ofDays(30), "refresh", false));

    @Test
    void issuesAndParsesAccessToken() {
        User user = new User("person@example.com", new BCryptPasswordEncoder().encode("Password1"), "Person");

        String token = jwt.issueAccessToken(user, Instant.now());

        assertThat(jwt.userId(jwt.parseAccessToken(token))).isEqualTo(user.getId());
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        User user = new User("person@example.com", "hash", "Person");
        String token = jwt.issueAccessToken(user, Instant.now());
        JwtService other = new JwtService(new AuthProperties(
                "98765432109876543210987654321098",
                Duration.ofMinutes(15), Duration.ofDays(30), "refresh", false));

        assertThatThrownBy(() -> other.parseAccessToken(token)).isInstanceOf(RuntimeException.class);
    }
}
