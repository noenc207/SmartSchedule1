package com.smartschedule.auth;

import com.smartschedule.auth.api.AuthDtos.RegisterRequest;
import com.smartschedule.auth.application.AuthException;
import com.smartschedule.auth.application.AuthService;
import com.smartschedule.auth.application.JwtService;
import com.smartschedule.auth.application.TokenHasher;
import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.auth.config.RateLimitingProperties;
import com.smartschedule.auth.domain.RefreshToken;
import com.smartschedule.auth.infrastructure.RateLimitingFilter;
import com.smartschedule.auth.infrastructure.RefreshTokenRepository;
import com.smartschedule.plan.PlanProperties;
import com.smartschedule.plan.PlanService;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AuthActivationAndRateLimitTest {
    private UserRepository users;
    private RefreshTokenRepository refreshTokens;
    private PasswordEncoder passwordEncoder;
    private AuthenticationManager authenticationManager;
    private JwtService jwtService;
    private TokenHasher tokenHasher;
    private AuthProperties properties;
    private PlanService planService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        refreshTokens = mock(RefreshTokenRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        authenticationManager = mock(AuthenticationManager.class);
        jwtService = mock(JwtService.class);
        tokenHasher = mock(TokenHasher.class);

        properties = new AuthProperties(
                "secret-32-bytes-long-for-testing-only-12345",
                Duration.ofMinutes(15),
                Duration.ofDays(30),
                "smartschedule_refresh",
                false,
                "SECRET-ACTIVATION-KEY-2026"
        );

        planService = new PlanService(new PlanProperties("ALL_PRO"));

        authService = new AuthService(
                users, refreshTokens, passwordEncoder, authenticationManager,
                jwtService, tokenHasher, properties, planService
        );

        when(passwordEncoder.encode(any())).thenReturn("hashed_password");
        when(jwtService.issueAccessToken(any(), any())).thenReturn("jwt_token_mock");
        when(jwtService.accessTokenExpiresInSeconds()).thenReturn(900L);
        when(tokenHasher.hash(any())).thenReturn("token_hash_mock");
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void register_withValidActivationKey_succeeds() {
        RegisterRequest request = new RegisterRequest(
                "Student Tester",
                "student@fpt.edu.vn",
                "StrongPassword123",
                "SECRET-ACTIVATION-KEY-2026"
        );

        AuthService.AuthSession session = authService.register(request, "JUnit", "127.0.0.1");

        assertNotNull(session);
        assertEquals("jwt_token_mock", session.response().accessToken());
        assertEquals("PRO", session.response().user().tier());
        assertEquals("Student Tester", session.response().user().displayName());
    }

    @Test
    void register_withInvalidActivationKey_throwsInvalidActivationKeyException() {
        RegisterRequest request = new RegisterRequest(
                "Attacker",
                "attacker@example.com",
                "StrongPassword123",
                "WRONG-KEY"
        );

        AuthException exception = assertThrows(AuthException.class, () ->
                authService.register(request, "JUnit", "127.0.0.1")
        );

        assertEquals("INVALID_ACTIVATION_KEY", exception.getCode());
        assertTrue(exception.getMessage().contains("Mã kích hoạt không chính xác"));
        verify(users, never()).save(any());
    }

    @Test
    void register_withEmptyActivationKey_throwsInvalidActivationKeyException() {
        RegisterRequest request = new RegisterRequest(
                "Attacker",
                "attacker@example.com",
                "StrongPassword123",
                ""
        );

        AuthException exception = assertThrows(AuthException.class, () ->
                authService.register(request, "JUnit", "127.0.0.1")
        );

        assertEquals("INVALID_ACTIVATION_KEY", exception.getCode());
        verify(users, never()).save(any());
    }

    @Test
    void planService_allProMode_returnsProForAnyUser() {
        PlanService allProService = new PlanService(new PlanProperties("ALL_PRO"));
        User freeUser = new User("free@example.com", "hash", "Free User");
        freeUser.setTier("FREE");

        assertTrue(allProService.isPro(freeUser));
        assertEquals("PRO", allProService.getEffectiveTier(freeUser));
    }

    @Test
    void planService_standardMode_respectsUserDbTier() {
        PlanService standardService = new PlanService(new PlanProperties("STANDARD"));
        User freeUser = new User("free@example.com", "hash", "Free User");
        freeUser.setTier("FREE");

        assertFalse(standardService.isPro(freeUser));
        assertEquals("FREE", standardService.getEffectiveTier(freeUser));

        User proUser = new User("pro@example.com", "hash", "Pro User");
        proUser.setTier("PRO");
        assertTrue(standardService.isPro(proUser));
        assertEquals("PRO", standardService.getEffectiveTier(proUser));
    }

    @Test
    void rateLimitingFilter_exceedingLimit_returns429TooManyRequests() throws Exception {
        RateLimitingProperties rateProps = new RateLimitingProperties(true, 2, 5, 10);
        RateLimitingFilter filter = new RateLimitingFilter(rateProps);

        HttpServletRequest req = mock(HttpServletRequest.class);
        HttpServletResponse res = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        when(req.getMethod()).thenReturn("POST");
        when(req.getRequestURI()).thenReturn("/api/v1/auth/register");
        when(req.getRemoteAddr()).thenReturn("203.0.113.195");

        StringWriter responseBody = new StringWriter();
        PrintWriter printWriter = new PrintWriter(responseBody);
        when(res.getWriter()).thenReturn(printWriter);

        // 1st request -> allowed
        filter.doFilter(req, res, chain);
        verify(chain, times(1)).doFilter(req, res);

        // 2nd request -> allowed
        filter.doFilter(req, res, chain);
        verify(chain, times(2)).doFilter(req, res);

        // 3rd request -> exceeds limit of 2 per minute -> 429
        filter.doFilter(req, res, chain);
        verify(chain, times(2)).doFilter(req, res); // not called again
        verify(res).setStatus(429);
        verify(res).setHeader("Retry-After", "60");
        assertTrue(responseBody.toString().contains("TOO_MANY_REQUESTS"));
    }
}
