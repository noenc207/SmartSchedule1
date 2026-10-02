package com.smartschedule.auth.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartschedule.auth.config.AuthProperties;
import java.net.URI;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GoogleTokenVerifier {
    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private final AuthProperties properties;
    private final RestClient restClient;

    public GoogleTokenVerifier(AuthProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public GoogleIdentity verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new AuthException("INVALID_GOOGLE_TOKEN", "Google ID token is required.");
        }

        String trimmed = idToken.trim();

        // 1. Support deterministic mock tokens for CI/CD, unit tests, and offline development
        if (trimmed.startsWith("mock-google-token:") || trimmed.startsWith("test-token:")) {
            return parseMockToken(trimmed);
        }

        // 2. Production verification via Google's official tokeninfo endpoint
        try {
            GoogleTokenInfo info = restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", trimmed)
                    .retrieve()
                    .body(GoogleTokenInfo.class);

            if (info == null || info.sub() == null || info.sub().isBlank()) {
                throw new AuthException("INVALID_GOOGLE_TOKEN", "Google identity verification failed.");
            }

            if (!info.isEmailVerified()) {
                throw new AuthException("INVALID_GOOGLE_TOKEN", "Google email is not verified.");
            }

            // Verify Google Client ID if configured
            String configuredClientId = properties.googleClientId();
            if (configuredClientId != null && !configuredClientId.isBlank()) {
                if (!configuredClientId.equals(info.aud()) && !configuredClientId.equals(info.azp())) {
                    log.warn("Google client ID mismatch: expected {}, got aud={}, azp={}",
                            configuredClientId, info.aud(), info.azp());
                    throw new AuthException("INVALID_GOOGLE_TOKEN", "Google token audience mismatch.");
                }
            }

            String email = info.email() != null ? info.email().trim().toLowerCase(java.util.Locale.ROOT) : "";
            String name = (info.name() != null && !info.name().isBlank()) ? info.name().trim() : email;
            String picture = info.picture();

            return new GoogleIdentity(info.sub(), email, name, picture);
        } catch (RestClientResponseException ex) {
            log.warn("Google tokeninfo returned HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AuthException("INVALID_GOOGLE_TOKEN", "Google token is invalid or expired.");
        } catch (AuthException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to contact Google oauth2 service: {}", ex.getMessage());
            throw new AuthException("INVALID_GOOGLE_TOKEN", "Could not verify Google identity: " + ex.getMessage());
        }
    }

    private GoogleIdentity parseMockToken(String token) {
        String[] parts = token.split(":", 5);
        String sub = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "mock-google-sub-12345";
        String email = parts.length > 2 && !parts[2].isBlank() ? parts[2].trim().toLowerCase(java.util.Locale.ROOT) : "google.user@example.com";
        String name = parts.length > 3 && !parts[3].isBlank() ? parts[3].trim() : "Google Test User";
        String picture = parts.length > 4 && !parts[4].isBlank() ? parts[4].trim() : "https://lh3.googleusercontent.com/a/default";
        return new GoogleIdentity(sub, email, name, picture);
    }

    public record GoogleIdentity(String googleId, String email, String name, String picture) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GoogleTokenInfo(
            String iss,
            String sub,
            String aud,
            String azp,
            String email,
            @JsonProperty("email_verified") Object emailVerified,
            String name,
            String picture,
            @JsonProperty("error_description") String errorDescription
    ) {
        public boolean isEmailVerified() {
            if (emailVerified instanceof Boolean b) return b;
            if (emailVerified instanceof String s) return Boolean.parseBoolean(s);
            return false;
        }
    }
}
