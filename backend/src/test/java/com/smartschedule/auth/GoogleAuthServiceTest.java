package com.smartschedule.auth;

import com.smartschedule.auth.api.AuthDtos.GoogleAuthRequest;
import com.smartschedule.auth.api.AuthDtos.GoogleAuthResponse;
import com.smartschedule.auth.application.AuthException;
import com.smartschedule.auth.application.AuthService;
import com.smartschedule.auth.application.GoogleTokenVerifier;
import com.smartschedule.auth.application.JwtService;
import com.smartschedule.auth.application.TokenHasher;
import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.auth.domain.RefreshToken;
import com.smartschedule.auth.domain.RegistrationKey;
import com.smartschedule.auth.infrastructure.RefreshTokenRepository;
import com.smartschedule.auth.infrastructure.RegistrationKeyRepository;
import com.smartschedule.plan.PlanProperties;
import com.smartschedule.plan.PlanService;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class GoogleAuthServiceTest {
    private UserRepository users;
    private RefreshTokenRepository refreshTokens;
    private RegistrationKeyRepository registrationKeys;
    private PasswordEncoder passwordEncoder;
    private AuthenticationManager authenticationManager;
    private JwtService jwtService;
    private TokenHasher tokenHasher;
    private AuthProperties properties;
    private PlanService planService;
    private GoogleTokenVerifier googleTokenVerifier;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        refreshTokens = mock(RefreshTokenRepository.class);
        registrationKeys = mock(RegistrationKeyRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        authenticationManager = mock(AuthenticationManager.class);
        jwtService = mock(JwtService.class);
        tokenHasher = new TokenHasher();

        properties = new AuthProperties(
                "secret-32-bytes-long-for-testing-only-12345",
                Duration.ofMinutes(15),
                Duration.ofDays(30),
                "smartschedule_refresh",
                false,
                "SMART-MASTER-KEY-2026",
                "test-google-client-id"
        );

        planService = new PlanService(new PlanProperties("ALL_PRO"));
        googleTokenVerifier = new GoogleTokenVerifier(properties);

        authService = new AuthService(
                users, refreshTokens, registrationKeys, passwordEncoder, authenticationManager,
                jwtService, tokenHasher, properties, planService, googleTokenVerifier
        );

        when(jwtService.issueAccessToken(any(), any())).thenReturn("jwt_access_token_123");
        when(jwtService.accessTokenExpiresInSeconds()).thenReturn(900L);
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
        when(registrationKeys.save(any(RegistrationKey.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void newGoogleUser_withoutKey_returnsKeyRequired_andDoesNotCreateUser() {
        String mockToken = "mock-google-token:sub-new-1:newuser@gmail.com:New User:https://example.com/avatar.png";
        when(users.findByGoogleIdAndDeletedAtIsNull("sub-new-1")).thenReturn(Optional.empty());

        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, null);
        AuthService.GoogleAuthResult result = authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1");

        assertTrue(result.keyRequired());
        assertNull(result.rawRefreshToken());
        assertEquals("KEY_REQUIRED", result.response().status());
        assertEquals("newuser@gmail.com", result.response().email());
        assertEquals("New User", result.response().displayName());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void newGoogleUser_withValidKey_createsUserAndConsumesKey() {
        String mockToken = "mock-google-token:sub-new-2:alex@gmail.com:Alex Nguyen:https://example.com/avatar.png";
        when(users.findByGoogleIdAndDeletedAtIsNull("sub-new-2")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("alex@gmail.com")).thenReturn(Optional.empty());

        String validRawKey = "VALID-REG-KEY-2026";
        String keyHash = tokenHasher.hash(validRawKey);
        RegistrationKey activeKey = new RegistrationKey(keyHash, Instant.now().plus(Duration.ofDays(7)));
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenReturn(Optional.of(activeKey));

        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, validRawKey);
        AuthService.GoogleAuthResult result = authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1");

        assertFalse(result.keyRequired());
        assertNotNull(result.rawRefreshToken());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("jwt_access_token_123", result.response().accessToken());
        assertEquals("alex@gmail.com", result.response().user().email());

        // Verify key was marked as USED
        assertEquals("USED", activeKey.getStatus());
        assertNotNull(activeKey.getUsedAt());
        assertNotNull(activeKey.getUsedBy());
        verify(registrationKeys).save(activeKey);
        verify(users).save(any(User.class));
    }

    @Test
    void newGoogleUser_withInvalidKey_throwsException_andKeyNotConsumed() {
        String mockToken = "mock-google-token:sub-new-3:hacker@gmail.com:Hacker:https://example.com/avatar.png";
        when(users.findByGoogleIdAndDeletedAtIsNull("sub-new-3")).thenReturn(Optional.empty());

        String invalidKey = "WRONG-UNKNOWN-KEY";
        String hash = tokenHasher.hash(invalidKey);
        when(registrationKeys.findByKeyHashForUpdate(hash)).thenReturn(Optional.empty());

        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, invalidKey);
        AuthException ex = assertThrows(AuthException.class, () ->
                authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1"));

        assertEquals("INVALID_REGISTRATION_KEY", ex.getCode());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void newGoogleUser_withUsedKey_throwsException() {
        String mockToken = "mock-google-token:sub-new-4:user4@gmail.com:User 4:https://example.com/avatar.png";
        when(users.findByGoogleIdAndDeletedAtIsNull("sub-new-4")).thenReturn(Optional.empty());

        String usedRawKey = "ALREADY-USED-KEY";
        String keyHash = tokenHasher.hash(usedRawKey);
        RegistrationKey usedKey = new RegistrationKey(keyHash, null);
        usedKey.markUsed(null, Instant.now());
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenReturn(Optional.of(usedKey));

        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, usedRawKey);
        AuthException ex = assertThrows(AuthException.class, () ->
                authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1"));

        assertEquals("REGISTRATION_KEY_ALREADY_USED", ex.getCode());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void newGoogleUser_withExpiredKey_throwsException() {
        String mockToken = "mock-google-token:sub-new-5:user5@gmail.com:User 5:https://example.com/avatar.png";
        when(users.findByGoogleIdAndDeletedAtIsNull("sub-new-5")).thenReturn(Optional.empty());

        String expiredRawKey = "EXPIRED-KEY-2025";
        String keyHash = tokenHasher.hash(expiredRawKey);
        RegistrationKey expiredKey = new RegistrationKey(keyHash, Instant.now().minus(Duration.ofDays(1)));
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenReturn(Optional.of(expiredKey));

        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, expiredRawKey);
        AuthException ex = assertThrows(AuthException.class, () ->
                authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1"));

        assertEquals("REGISTRATION_KEY_EXPIRED", ex.getCode());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void existingGoogleUser_authenticatesDirectly_withoutKey() {
        String googleId = "sub-existing-999";
        String mockToken = "mock-google-token:" + googleId + ":existing@fpt.edu.vn:Existing User:https://example.com/avatar.png";

        User existingUser = User.createGoogleUser("existing@fpt.edu.vn", "Existing User", googleId, "https://example.com/avatar.png");
        when(users.findByGoogleIdAndDeletedAtIsNull(googleId)).thenReturn(Optional.of(existingUser));

        // Note: registrationKey is null!
        GoogleAuthRequest request = new GoogleAuthRequest(mockToken, null);
        AuthService.GoogleAuthResult result = authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1");

        assertFalse(result.keyRequired());
        assertNotNull(result.rawRefreshToken());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("jwt_access_token_123", result.response().accessToken());
        assertEquals("existing@fpt.edu.vn", result.response().user().email());

        // Zero registration key queries or updates
        verify(registrationKeys, never()).findByKeyHashForUpdate(any());
        verify(registrationKeys, never()).save(any());
    }

    @Test
    void fakeOrInvalidGoogleToken_throwsException() {
        GoogleAuthRequest request = new GoogleAuthRequest("", "ANY-KEY");
        AuthException ex = assertThrows(AuthException.class, () ->
                authService.authenticateWithGoogle(request, "JUnit", "127.0.0.1"));

        assertEquals("INVALID_GOOGLE_TOKEN", ex.getCode());
    }

    @Test
    void concurrentRequests_withSameKey_onlyOneConsumesKey() {
        String key = "CONCURRENT-KEY-2026";
        String keyHash = tokenHasher.hash(key);
        RegistrationKey regKey = new RegistrationKey(keyHash, null);

        // Atomic row lock ensures the shared DB row is acquired
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenAnswer(inv -> {
            synchronized (regKey) {
                return Optional.of(regKey);
            }
        });

        // Request 1: succeeds, consumes key
        GoogleAuthRequest req1 = new GoogleAuthRequest("mock-google-token:sub-c1:user1@gmail.com:User 1:img", key);
        AuthService.GoogleAuthResult res1 = authService.authenticateWithGoogle(req1, "Agent", "127.0.0.1");
        assertEquals("AUTHENTICATED", res1.response().status());
        assertEquals("USED", regKey.getStatus());

        // Request 2: with the same key now sees status 'USED' and is rejected immediately
        GoogleAuthRequest req2 = new GoogleAuthRequest("mock-google-token:sub-c2:user2@gmail.com:User 2:img", key);
        AuthException ex = assertThrows(AuthException.class, () ->
                authService.authenticateWithGoogle(req2, "Agent", "127.0.0.1"));
        assertEquals("REGISTRATION_KEY_ALREADY_USED", ex.getCode());
    }
}
