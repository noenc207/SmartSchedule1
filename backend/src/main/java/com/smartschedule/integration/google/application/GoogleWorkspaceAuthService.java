package com.smartschedule.integration.google.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.common.error.ValidationException;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos;
import com.smartschedule.integration.google.domain.GoogleConnection;
import com.smartschedule.integration.google.infrastructure.CredentialEncryptionService;
import com.smartschedule.integration.google.infrastructure.ExternalCalendarLinkRepository;
import com.smartschedule.integration.google.infrastructure.GoogleConnectionRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class GoogleWorkspaceAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleWorkspaceAuthService.class);
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

    private final GoogleConnectionRepository connectionRepository;
    private final ExternalCalendarLinkRepository calendarLinkRepository;
    private final CredentialEncryptionService encryptionService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${smartschedule.auth.google-client-id:${SMARTSCHEDULE_GOOGLE_CLIENT_ID:}}")
    private String googleClientId;

    @Value("${smartschedule.auth.google-client-secret:${SMARTSCHEDULE_GOOGLE_CLIENT_SECRET:}}")
    private String googleClientSecret;

    public GoogleWorkspaceAuthService(GoogleConnectionRepository connectionRepository,
                                      ExternalCalendarLinkRepository calendarLinkRepository,
                                      CredentialEncryptionService encryptionService,
                                      ObjectMapper objectMapper) {
        this.connectionRepository = connectionRepository;
        this.calendarLinkRepository = calendarLinkRepository;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    public record StoredCredential(
            String accessToken,
            String refreshToken,
            long expiresAtMillis,
            String scopes
    ) {}

    @Transactional
    public GoogleWorkspaceDtos.ConnectionStatusResponse connect(User user, GoogleWorkspaceDtos.ConnectWorkspaceRequest req) {
        if (req == null) {
            throw new ValidationException("Connect request payload is required");
        }

        String accessToken = req.accessToken();
        String refreshToken = req.refreshToken();
        long expiresAtMillis = System.currentTimeMillis() + (req.expiresIn() != null ? req.expiresIn() * 1000 : 3600_000L);
        String scopes = req.scopes() != null ? req.scopes() : "";

        // If authorization code provided, exchange code for tokens
        if (req.code() != null && !req.code().isBlank()) {
            Map<String, Object> tokenResponse = exchangeAuthCode(req.code(), req.redirectUri());
            accessToken = (String) tokenResponse.get("access_token");
            if (tokenResponse.containsKey("refresh_token")) {
                refreshToken = (String) tokenResponse.get("refresh_token");
            }
            if (tokenResponse.containsKey("expires_in")) {
                Number exp = (Number) tokenResponse.get("expires_in");
                expiresAtMillis = System.currentTimeMillis() + exp.longValue() * 1000L;
            }
            if (tokenResponse.containsKey("scope")) {
                scopes = (String) tokenResponse.get("scope");
            }
        }

        if (accessToken == null || accessToken.isBlank()) {
            throw new ValidationException("Could not obtain Google Workspace access token");
        }

        StoredCredential cred = new StoredCredential(accessToken, refreshToken, expiresAtMillis, scopes);
        String encrypted = encryptCredential(cred);

        GoogleConnection conn = connectionRepository.findByUserIdAndRevokedAtIsNull(user.getId())
                .orElse(new GoogleConnection(user.getId(), encrypted, scopes));

        conn.setEncryptedCredentials(encrypted);
        conn.setScopes(scopes);
        connectionRepository.save(conn);

        int linksCount = calendarLinkRepository.findAllByUserIdAndProvider(user.getId(), "GOOGLE_CALENDAR").size();

        return new GoogleWorkspaceDtos.ConnectionStatusResponse(
                true,
                "GOOGLE_WORKSPACE",
                conn.getScopes(),
                linksCount,
                conn.getCreatedAt(),
                conn.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public GoogleWorkspaceDtos.ConnectionStatusResponse getConnectionStatus(User user) {
        Optional<GoogleConnection> connOpt = connectionRepository.findByUserIdAndRevokedAtIsNull(user.getId());
        if (connOpt.isEmpty()) {
            return new GoogleWorkspaceDtos.ConnectionStatusResponse(
                    false, "GOOGLE_WORKSPACE", "", 0, null, null
            );
        }
        GoogleConnection conn = connOpt.get();
        int linksCount = calendarLinkRepository.findAllByUserIdAndProvider(user.getId(), "GOOGLE_CALENDAR").size();

        return new GoogleWorkspaceDtos.ConnectionStatusResponse(
                true,
                conn.getProvider(),
                conn.getScopes(),
                linksCount,
                conn.getCreatedAt(),
                conn.getUpdatedAt()
        );
    }

    @Transactional
    public void disconnect(User user) {
        Optional<GoogleConnection> connOpt = connectionRepository.findByUserIdAndRevokedAtIsNull(user.getId());
        if (connOpt.isPresent()) {
            GoogleConnection conn = connOpt.get();
            try {
                StoredCredential cred = decryptCredential(conn.getEncryptedCredentials());
                if (cred != null && cred.accessToken != null) {
                    revokeToken(cred.accessToken);
                }
            } catch (Exception e) {
                log.warn("Could not revoke token with Google during disconnect: {}", e.getMessage());
            }
            conn.revoke();
            connectionRepository.save(conn);
        }
    }

    @Transactional
    public String getValidAccessToken(UUID userId) {
        GoogleConnection conn = connectionRepository.findByUserIdAndRevokedAtIsNull(userId)
                .orElseThrow(() -> new ValidationException("Tài khoản chưa kết nối Google Workspace. Vui lòng cấp quyền trước."));

        StoredCredential cred = decryptCredential(conn.getEncryptedCredentials());
        if (cred == null || cred.accessToken == null || cred.accessToken.isBlank()) {
            throw new ValidationException("Google Workspace credentials không hợp lệ.");
        }

        // Refresh if within 5 minutes of expiring
        long now = System.currentTimeMillis();
        if (cred.expiresAtMillis <= (now + 300_000L) && cred.refreshToken != null && !cred.refreshToken.isBlank()) {
            try {
                StoredCredential refreshed = refreshAccessToken(cred.refreshToken, cred.scopes);
                String updatedEncrypted = encryptCredential(refreshed);
                conn.setEncryptedCredentials(updatedEncrypted);
                connectionRepository.save(conn);
                return refreshed.accessToken;
            } catch (Exception ex) {
                log.warn("Failed to refresh Google access token: {}", ex.getMessage());
            }
        }

        return cred.accessToken;
    }

    public boolean hasWorkspaceConnection(UUID userId) {
        return connectionRepository.findByUserIdAndRevokedAtIsNull(userId).isPresent();
    }

    private Map<String, Object> exchangeAuthCode(String code, String redirectUri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("code", code);
        map.add("client_id", googleClientId);
        map.add("client_secret", googleClientSecret);
        map.add("redirect_uri", redirectUri != null && !redirectUri.isBlank() ? redirectUri : "postmessage");
        map.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(TOKEN_ENDPOINT, request, Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception ex) {
            log.error("Failed to exchange auth code with Google: {}", ex.getMessage());
            throw new ValidationException("Không thể xác thực mã cấp quyền với Google: " + ex.getMessage());
        }
    }

    private StoredCredential refreshAccessToken(String refreshToken, String scopes) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("refresh_token", refreshToken);
        map.add("client_id", googleClientId);
        map.add("client_secret", googleClientSecret);
        map.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(TOKEN_ENDPOINT, request, Map.class);
        Map body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new ValidationException("Google token refresh did not return access token");
        }

        String newAccessToken = (String) body.get("access_token");
        Number exp = (Number) body.getOrDefault("expires_in", 3600);
        long expiresAtMillis = System.currentTimeMillis() + exp.longValue() * 1000L;

        return new StoredCredential(newAccessToken, refreshToken, expiresAtMillis, scopes);
    }

    private void revokeToken(String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
            map.add("token", token);
            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
            restTemplate.postForEntity(REVOKE_ENDPOINT, request, String.class);
        } catch (Exception ex) {
            log.debug("Revoke token error: {}", ex.getMessage());
        }
    }

    private String encryptCredential(StoredCredential cred) {
        try {
            String json = objectMapper.writeValueAsString(cred);
            return encryptionService.encrypt(json);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to serialize and encrypt credential", ex);
        }
    }

    private StoredCredential decryptCredential(String encrypted) {
        try {
            String json = encryptionService.decrypt(encrypted);
            return objectMapper.readValue(json, StoredCredential.class);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to decrypt credential", ex);
        }
    }
}
