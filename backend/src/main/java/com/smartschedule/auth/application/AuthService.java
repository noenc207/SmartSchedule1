package com.smartschedule.auth.application;

import com.smartschedule.auth.api.AuthDtos.AuthResponse;
import com.smartschedule.auth.api.AuthDtos.LoginRequest;
import com.smartschedule.auth.api.AuthDtos.RegisterRequest;
import com.smartschedule.auth.api.AuthDtos.UserResponse;
import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.auth.domain.RefreshToken;
import com.smartschedule.auth.infrastructure.RefreshTokenRepository;
import com.smartschedule.plan.PlanProperties;
import com.smartschedule.plan.PlanService;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenHasher tokenHasher;
    private final AuthProperties properties;
    private final PlanService planService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       JwtService jwtService, TokenHasher tokenHasher, AuthProperties properties) {
        this(users, refreshTokens, passwordEncoder, authenticationManager, jwtService, tokenHasher, properties,
                new PlanService(new PlanProperties("ALL_PRO")));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       JwtService jwtService, TokenHasher tokenHasher, AuthProperties properties,
                       PlanService planService) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.tokenHasher = tokenHasher;
        this.properties = properties;
        this.planService = planService != null ? planService : new PlanService(new PlanProperties("ALL_PRO"));
    }

    @Transactional
    public AuthSession register(RegisterRequest request, String userAgent, String ipAddress) {
        validateActivationKey(request.activationKey());
        String email = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCaseAndDeletedAtIsNull(email)) {
            throw new AuthException("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
        }
        User user;
        try {
            user = users.save(new User(email, passwordEncoder.encode(request.password()), request.displayName().trim()));
        } catch (DataIntegrityViolationException exception) {
            throw new AuthException("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
        }
        Session session = issueSession(user, userAgent, ipAddress);
        return new AuthSession(session.response(), session.rawRefreshToken());
    }

    private void validateActivationKey(String activationKey) {
        String configuredKey = properties.registrationKey();
        if (configuredKey == null || configuredKey.isBlank()) {
            throw new AuthException("REGISTRATION_DISABLED", "Hệ thống tạm thời chưa mở đăng ký.");
        }
        if (activationKey == null || activationKey.isBlank() || !configuredKey.trim().equals(activationKey.trim())) {
            throw new AuthException("INVALID_ACTIVATION_KEY", "Mã kích hoạt không chính xác hoặc đã hết hạn.");
        }
    }

    @Transactional
    public AuthSession login(LoginRequest request, String userAgent, String ipAddress) {
        String email = normalizeEmail(request.email());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password()));
        UserDetails details = (UserDetails) authentication.getPrincipal();
        User user = users.findByEmailIgnoreCaseAndDeletedAtIsNull(details.getUsername())
                .orElseThrow(() -> new AuthException("UNAUTHORIZED", "Invalid email or password."));
        Session session = issueSession(user, userAgent, ipAddress);
        return new AuthSession(session.response(), session.rawRefreshToken());
    }

    @Transactional
    public AuthSession refresh(String rawToken, String userAgent, String ipAddress) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
        }
        RefreshToken current = refreshTokens.findByTokenHash(tokenHasher.hash(rawToken))
                .orElseThrow(() -> new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired."));
        Instant now = Instant.now();
        if (!current.isUsable(now) || !current.getUser().isEnabled()) {
            throw new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
        }
        Session session = issueSession(current.getUser(), userAgent, ipAddress);
        current.revoke(now, session.refreshToken().getId());
        return new AuthSession(session.response(), session.rawRefreshToken());
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokens.findByTokenHash(tokenHasher.hash(rawToken))
                .ifPresent(token -> token.revoke(Instant.now(), null));
    }

    public UserResponse currentUser(User user) {
        return toResponse(user);
    }

    private Session issueSession(User user, String userAgent, String ipAddress) {
        Instant now = Instant.now();
        String accessToken = jwtService.issueAccessToken(user, now);
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshToken persistedRefreshToken = refreshTokens.save(new RefreshToken(user, tokenHasher.hash(refreshToken),
                now.plus(properties.refreshTokenTtl()), userAgent, ipAddress));
        return new Session(new AuthResponse(accessToken, jwtService.accessTokenExpiresInSeconds(), toResponse(user)),
                persistedRefreshToken, refreshToken);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getAvatarUrl(),
                user.isEnabled(), user.getTimezone(), user.getLocale(), user.getCreatedAt(), planService.getEffectiveTier(user));
    }

    public record AuthSession(AuthResponse response, String rawRefreshToken) {}

    private record Session(AuthResponse response, RefreshToken refreshToken, String rawRefreshToken) {}
}
