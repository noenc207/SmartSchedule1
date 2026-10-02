package com.smartschedule.auth;

import com.smartschedule.auth.api.AuthDtos.SocialAuthRequest;
import com.smartschedule.auth.api.AuthDtos.SocialAuthResponse;
import com.smartschedule.auth.application.AuthException;
import com.smartschedule.auth.application.AuthService;
import com.smartschedule.auth.application.FacebookTokenVerifier;
import com.smartschedule.auth.application.GithubTokenVerifier;
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

public class SocialAuthServiceTest {
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
    private GithubTokenVerifier githubTokenVerifier;
    private FacebookTokenVerifier facebookTokenVerifier;
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
                "231472661796-1iegvpdu3jj9s845cbm46imktk73u5ss.apps.googleusercontent.com",
                "github-client-id",
                "github-client-secret",
                "facebook-app-id",
                "facebook-app-secret"
        );
        planService = new PlanService(new PlanProperties("ALL_PRO"));
        googleTokenVerifier = new GoogleTokenVerifier(properties);
        githubTokenVerifier = new GithubTokenVerifier(properties);
        facebookTokenVerifier = new FacebookTokenVerifier(properties);

        authService = new AuthService(
                users,
                refreshTokens,
                registrationKeys,
                passwordEncoder,
                authenticationManager,
                jwtService,
                tokenHasher,
                properties,
                planService,
                googleTokenVerifier,
                githubTokenVerifier,
                facebookTokenVerifier
        );

        when(jwtService.issueAccessToken(any(), any())).thenReturn("mock-access-token");
        when(jwtService.accessTokenExpiresInSeconds()).thenReturn(900L);
        when(refreshTokens.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void github_new_user_without_key_requires_key() {
        when(users.findByGithubIdAndDeletedAtIsNull("github-sub-100")).thenReturn(Optional.empty());

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                "mock-github-token:github-sub-100:coder@github.com:Pro Coder",
                null,
                null
        );

        AuthService.SocialAuthResult result = authService.authenticateWithGithub(request, "Agent", "127.0.0.1");

        assertTrue(result.requiresKey());
        assertEquals("KEY_REQUIRED", result.response().status());
        assertEquals("GITHUB", result.response().provider());
        assertEquals("coder@github.com", result.response().email());
        assertEquals("Pro Coder", result.response().displayName());
    }

    @Test
    void github_new_user_with_valid_key_authenticates() {
        when(users.findByGithubIdAndDeletedAtIsNull("github-sub-200")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("coder2@github.com")).thenReturn(Optional.empty());

        String key = "GITHUB-DEV-2026";
        String keyHash = tokenHasher.hash(key);
        RegistrationKey regKey = new RegistrationKey(keyHash, null);
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenReturn(Optional.of(regKey));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                "mock-github-token:github-sub-200:coder2@github.com:Pro Coder 2",
                null,
                key
        );

        AuthService.SocialAuthResult result = authService.authenticateWithGithub(request, "Agent", "127.0.0.1");

        assertFalse(result.requiresKey());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("GITHUB", result.response().provider());
        assertEquals("USED", regKey.getStatus());
        verify(registrationKeys).save(regKey);
    }

    @Test
    void github_existing_user_authenticates_directly_without_key() {
        User existingUser = User.createGithubUser("existing.dev@github.com", "Dev User", "github-sub-300", "https://avatar.png");
        when(users.findByGithubIdAndDeletedAtIsNull("github-sub-300")).thenReturn(Optional.of(existingUser));

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                "mock-github-token:github-sub-300:existing.dev@github.com:Dev User",
                null,
                null // NO registration key!
        );

        AuthService.SocialAuthResult result = authService.authenticateWithGithub(request, "Agent", "127.0.0.1");

        assertFalse(result.requiresKey());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("GITHUB", result.response().provider());
        verify(registrationKeys, never()).findByKeyHashForUpdate(any());
    }

    @Test
    void facebook_new_user_without_key_requires_key() {
        when(users.findByFacebookIdAndDeletedAtIsNull("fb-sub-100")).thenReturn(Optional.empty());

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                null,
                "mock-facebook-token:fb-sub-100:fb.user@facebook.com:Facebook Student",
                null
        );

        AuthService.SocialAuthResult result = authService.authenticateWithFacebook(request, "Agent", "127.0.0.1");

        assertTrue(result.requiresKey());
        assertEquals("KEY_REQUIRED", result.response().status());
        assertEquals("FACEBOOK", result.response().provider());
        assertEquals("fb.user@facebook.com", result.response().email());
    }

    @Test
    void facebook_new_user_with_valid_key_authenticates() {
        when(users.findByFacebookIdAndDeletedAtIsNull("fb-sub-200")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("fb2@facebook.com")).thenReturn(Optional.empty());

        String key = "FACEBOOK-DEV-2026";
        String keyHash = tokenHasher.hash(key);
        RegistrationKey regKey = new RegistrationKey(keyHash, null);
        when(registrationKeys.findByKeyHashForUpdate(keyHash)).thenReturn(Optional.of(regKey));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                null,
                "mock-facebook-token:fb-sub-200:fb2@facebook.com:FB User Two",
                key
        );

        AuthService.SocialAuthResult result = authService.authenticateWithFacebook(request, "Agent", "127.0.0.1");

        assertFalse(result.requiresKey());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("FACEBOOK", result.response().provider());
        assertEquals("USED", regKey.getStatus());
        verify(registrationKeys).save(regKey);
    }

    @Test
    void facebook_existing_user_authenticates_directly_without_key() {
        User existingUser = User.createFacebookUser("fb.existing@facebook.com", "Existing FB User", "fb-sub-300", "https://avatar.png");
        when(users.findByFacebookIdAndDeletedAtIsNull("fb-sub-300")).thenReturn(Optional.of(existingUser));

        SocialAuthRequest request = new SocialAuthRequest(
                null,
                null,
                "mock-facebook-token:fb-sub-300:fb.existing@facebook.com:Existing FB User",
                null // NO key!
        );

        AuthService.SocialAuthResult result = authService.authenticateWithFacebook(request, "Agent", "127.0.0.1");

        assertFalse(result.requiresKey());
        assertEquals("AUTHENTICATED", result.response().status());
        assertEquals("FACEBOOK", result.response().provider());
        verify(registrationKeys, never()).findByKeyHashForUpdate(any());
    }
}
