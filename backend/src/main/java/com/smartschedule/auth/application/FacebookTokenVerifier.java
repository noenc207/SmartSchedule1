package com.smartschedule.auth.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartschedule.auth.config.AuthProperties;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class FacebookTokenVerifier {
    private static final Logger log = LoggerFactory.getLogger(FacebookTokenVerifier.class);
    private final AuthProperties properties;
    private final RestClient restClient;

    public FacebookTokenVerifier(AuthProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(6));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public FacebookIdentity verify(String accessTokenOrCode) {
        if (accessTokenOrCode == null || accessTokenOrCode.isBlank()) {
            throw new AuthException("INVALID_FACEBOOK_TOKEN", "Facebook access token is required.");
        }

        String trimmed = accessTokenOrCode.trim();

        // 1. Support deterministic mock tokens for CI/CD, testing, and offline dev
        if (trimmed.startsWith("mock-facebook-token:") || trimmed.startsWith("test-facebook:")) {
            return parseMockToken(trimmed);
        }

        // 2. Fetch user profile from Facebook Graph API
        try {
            FacebookProfile profile = restClient.get()
                    .uri("https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token={token}", trimmed)
                    .retrieve()
                    .body(FacebookProfile.class);

            if (profile == null || profile.id() == null || profile.id().isBlank()) {
                throw new AuthException("INVALID_FACEBOOK_TOKEN", "Could not retrieve Facebook user profile.");
            }

            String email = profile.email();
            if (email == null || email.isBlank()) {
                email = profile.id() + "@facebook.smartschedule.com";
            }

            String name = (profile.name() != null && !profile.name().isBlank())
                    ? profile.name().trim()
                    : "Facebook User";

            String picture = (profile.picture() != null && profile.picture().data() != null)
                    ? profile.picture().data().url()
                    : null;

            return new FacebookIdentity(profile.id(), email.toLowerCase(java.util.Locale.ROOT).trim(), name, picture);
        } catch (RestClientResponseException ex) {
            log.warn("Facebook Graph API error HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AuthException("INVALID_FACEBOOK_TOKEN", "Facebook access token is invalid or expired.");
        } catch (AuthException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to contact Facebook Graph API: {}", ex.getMessage());
            throw new AuthException("INVALID_FACEBOOK_TOKEN", "Could not verify Facebook identity: " + ex.getMessage());
        }
    }

    private FacebookIdentity parseMockToken(String token) {
        String[] parts = token.split(":", 5);
        String sub = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "mock-facebook-sub-12345";
        String email = parts.length > 2 && !parts[2].isBlank() ? parts[2].trim().toLowerCase(java.util.Locale.ROOT) : "facebook.user@example.com";
        String name = parts.length > 3 && !parts[3].isBlank() ? parts[3].trim() : "Facebook User";
        String picture = parts.length > 4 && !parts[4].isBlank() ? parts[4].trim() : "https://graph.facebook.com/default/picture";
        return new FacebookIdentity(sub, email, name, picture);
    }

    public record FacebookIdentity(String facebookId, String email, String name, String picture) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FacebookProfile(
            String id,
            String name,
            String email,
            FacebookPicture picture
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FacebookPicture(
            FacebookPictureData data
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FacebookPictureData(
            String url,
            @JsonProperty("is_silhouette") Boolean isSilhouette
    ) {}
}
