package com.smartschedule.auth.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartschedule.auth.config.AuthProperties;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GithubTokenVerifier {
    private static final Logger log = LoggerFactory.getLogger(GithubTokenVerifier.class);
    private final AuthProperties properties;
    private final RestClient restClient;

    public GithubTokenVerifier(AuthProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(6));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public GithubIdentity verify(String codeOrToken) {
        if (codeOrToken == null || codeOrToken.isBlank()) {
            throw new AuthException("INVALID_GITHUB_TOKEN", "GitHub authentication code or access token is required.");
        }

        String trimmed = codeOrToken.trim();

        // 1. Support deterministic mock tokens for CI/CD, testing, and offline dev
        if (trimmed.startsWith("mock-github-token:") || trimmed.startsWith("mock-github-code:") || trimmed.startsWith("test-github:")) {
            return parseMockToken(trimmed);
        }

        // 2. Exchange authorization code for access token if an authorization code was passed
        String accessToken = trimmed;
        if (!trimmed.startsWith("gho_") && !trimmed.startsWith("ghp_") && !trimmed.startsWith("bearer_")) {
            accessToken = exchangeCodeForAccessToken(trimmed);
        }

        // 3. Fetch user profile from GitHub API
        try {
            GithubUserProfile profile = restClient.get()
                    .uri("https://api.github.com/user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .retrieve()
                    .body(GithubUserProfile.class);

            if (profile == null || profile.id() == null) {
                throw new AuthException("INVALID_GITHUB_TOKEN", "Could not retrieve GitHub user profile.");
            }

            String githubId = String.valueOf(profile.id());
            String email = profile.email();

            // If primary email is private on GitHub profile, query user/emails endpoint
            if (email == null || email.isBlank()) {
                email = fetchPrimaryEmail(accessToken);
            }

            if (email == null || email.isBlank()) {
                email = profile.login() + "@users.noreply.github.com";
            }

            String displayName = (profile.name() != null && !profile.name().isBlank())
                    ? profile.name().trim()
                    : profile.login();

            return new GithubIdentity(githubId, email.toLowerCase(java.util.Locale.ROOT).trim(), displayName, profile.avatarUrl());
        } catch (RestClientResponseException ex) {
            log.warn("GitHub API error HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AuthException("INVALID_GITHUB_TOKEN", "GitHub token is invalid or expired.");
        } catch (AuthException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to contact GitHub API: {}", ex.getMessage());
            throw new AuthException("INVALID_GITHUB_TOKEN", "Could not verify GitHub identity: " + ex.getMessage());
        }
    }

    private String exchangeCodeForAccessToken(String code) {
        String clientId = properties.githubClientId();
        String clientSecret = properties.githubClientSecret();

        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            // If client secret is not configured, treat code as raw token fallback
            return code;
        }

        try {
            Map<String, String> body = Map.of(
                    "client_id", clientId.trim(),
                    "client_secret", clientSecret.trim(),
                    "code", code.trim()
            );

            GithubTokenResponse response = restClient.post()
                    .uri("https://github.com/login/oauth/access_token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(GithubTokenResponse.class);

            if (response != null && response.accessToken() != null && !response.accessToken().isBlank()) {
                return response.accessToken();
            }
            throw new AuthException("INVALID_GITHUB_CODE", "Could not exchange GitHub code for access token.");
        } catch (Exception ex) {
            log.warn("GitHub code exchange failed: {}", ex.getMessage());
            // Fallback to trying code as access token directly
            return code;
        }
    }

    private String fetchPrimaryEmail(String accessToken) {
        try {
            List<GithubEmailItem> emails = restClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<GithubEmailItem>>() {});

            if (emails != null) {
                // Priority: verified & primary email
                for (GithubEmailItem item : emails) {
                    if (item.verified() && item.primary()) {
                        return item.email();
                    }
                }
                // Secondary: any verified email
                for (GithubEmailItem item : emails) {
                    if (item.verified()) {
                        return item.email();
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Could not fetch user/emails from GitHub: {}", ex.getMessage());
        }
        return null;
    }

    private GithubIdentity parseMockToken(String token) {
        String[] parts = token.split(":", 5);
        String sub = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "mock-github-sub-12345";
        String email = parts.length > 2 && !parts[2].isBlank() ? parts[2].trim().toLowerCase(java.util.Locale.ROOT) : "github.developer@example.com";
        String name = parts.length > 3 && !parts[3].isBlank() ? parts[3].trim() : "GitHub Developer";
        String picture = parts.length > 4 && !parts[4].isBlank() ? parts[4].trim() : "https://avatars.githubusercontent.com/u/9919?v=4";
        return new GithubIdentity(sub, email, name, picture);
    }

    public record GithubIdentity(String githubId, String email, String name, String picture) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GithubUserProfile(
            Long id,
            String login,
            String name,
            String email,
            @JsonProperty("avatar_url") String avatarUrl
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GithubEmailItem(
            String email,
            boolean primary,
            boolean verified
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GithubTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("token_type") String tokenType,
            String scope,
            String error,
            @JsonProperty("error_description") String errorDescription
    ) {}
}
