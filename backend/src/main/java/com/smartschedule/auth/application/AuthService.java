package com.smartschedule.auth.application;

import com.smartschedule.auth.api.AuthDtos.AuthResponse;
import com.smartschedule.auth.api.AuthDtos.GoogleAuthRequest;
import com.smartschedule.auth.api.AuthDtos.GoogleAuthResponse;
import com.smartschedule.auth.api.AuthDtos.LoginRequest;
import com.smartschedule.auth.api.AuthDtos.RegisterRequest;
import com.smartschedule.auth.api.AuthDtos.UserResponse;
import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.auth.domain.RefreshToken;
import com.smartschedule.auth.domain.RegistrationKey;
import com.smartschedule.auth.infrastructure.RefreshTokenRepository;
import com.smartschedule.auth.infrastructure.RegistrationKeyRepository;
import com.smartschedule.plan.PlanProperties;
import com.smartschedule.plan.PlanService;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final RegistrationKeyRepository registrationKeys;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenHasher tokenHasher;
    private final AuthProperties properties;
    private final PlanService planService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       JwtService jwtService, TokenHasher tokenHasher, AuthProperties properties) {
        this(users, refreshTokens, null, passwordEncoder, authenticationManager, jwtService, tokenHasher, properties,
                new PlanService(new PlanProperties("ALL_PRO")), null);
    }

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       JwtService jwtService, TokenHasher tokenHasher, AuthProperties properties,
                       PlanService planService) {
        this(users, refreshTokens, null, passwordEncoder, authenticationManager, jwtService, tokenHasher, properties,
                planService, null);
    }

    @Autowired
    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       RegistrationKeyRepository registrationKeys,
                       PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       JwtService jwtService, TokenHasher tokenHasher, AuthProperties properties,
                       PlanService planService, GoogleTokenVerifier googleTokenVerifier) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.registrationKeys = registrationKeys;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.tokenHasher = tokenHasher;
        this.properties = properties;
        this.planService = planService != null ? planService : new PlanService(new PlanProperties("ALL_PRO"));
        this.googleTokenVerifier = googleTokenVerifier != null ? googleTokenVerifier : new GoogleTokenVerifier(properties);
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

        // If key exists in registration_keys, mark it used
        if (registrationKeys != null && request.activationKey() != null) {
            String keyHash = tokenHasher.hash(request.activationKey().trim());
            registrationKeys.findByKeyHashForUpdate(keyHash).ifPresent(key -> {
                key.markUsed(user, Instant.now());
                registrationKeys.save(key);
            });
        }

        Session session = issueSession(user, userAgent, ipAddress);
        return new AuthSession(session.response(), session.rawRefreshToken());
    }

    private void validateActivationKey(String activationKey) {
        if (activationKey == null || activationKey.isBlank()) {
            throw new AuthException("INVALID_ACTIVATION_KEY", "Mã kích hoạt không được để trống.");
        }
        String trimmed = activationKey.trim();

        // 1. Check database registration_keys if repository is present
        if (registrationKeys != null) {
            String hash = tokenHasher.hash(trimmed);
            Optional<RegistrationKey> optKey = registrationKeys.findByKeyHash(hash);
            if (optKey.isPresent()) {
                RegistrationKey key = optKey.get();
                if ("USED".equalsIgnoreCase(key.getStatus())) {
                    throw new AuthException("REGISTRATION_KEY_ALREADY_USED", "Mã kích hoạt này đã được sử dụng.");
                }
                if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(Instant.now())) {
                    throw new AuthException("REGISTRATION_KEY_EXPIRED", "Mã kích hoạt đã hết hạn.");
                }
                if ("ACTIVE".equalsIgnoreCase(key.getStatus())) {
                    return;
                }
            }
        }

        // 2. Check fallback master key from configuration
        String configuredKey = properties.registrationKey();
        if (configuredKey == null || configuredKey.isBlank()) {
            throw new AuthException("REGISTRATION_DISABLED", "Hệ thống tạm thời chưa mở đăng ký.");
        }
        if (!configuredKey.trim().equals(trimmed)) {
            throw new AuthException("INVALID_ACTIVATION_KEY", "Mã kích hoạt không chính xác hoặc đã hết hạn.");
        }
    }

    @Transactional
    public GoogleAuthResult authenticateWithGoogle(GoogleAuthRequest request, String userAgent, String ipAddress) {
        if (request == null || request.idToken() == null || request.idToken().isBlank()) {
            throw new AuthException("INVALID_GOOGLE_TOKEN", "Google ID token is required.");
        }

        GoogleTokenVerifier.GoogleIdentity identity = googleTokenVerifier.verify(request.idToken());

        // 1. Check if user already exists with this googleId (CASE B & CASE E: Returning user)
        Optional<User> existingUser = users.findByGoogleIdAndDeletedAtIsNull(identity.googleId());
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (!user.isEnabled()) {
                throw new AuthException("UNAUTHORIZED", "Tài khoản của bạn đã bị vô hiệu hóa.");
            }
            // Existing Google user: LOGIN DIRECTLY, NEVER PROMPT FOR KEY!
            Session session = issueSession(user, userAgent, ipAddress);
            return new GoogleAuthResult(GoogleAuthResponse.authenticated(session.response()), session.rawRefreshToken(), false);
        }

        // 2. Google user does NOT exist yet. Check if registration key was provided:
        String rawKey = request.registrationKey();
        if (rawKey == null || rawKey.isBlank()) {
            // CASE A (Step 1): Key required! Prompt user to enter Registration Key.
            return new GoogleAuthResult(
                    GoogleAuthResponse.keyRequired(identity.email(), identity.name(), identity.picture()),
                    null,
                    true
            );
        }

        // 3. User provided registration key. Validate key and create user atomically!
        String normalizedEmail = normalizeEmail(identity.email());
        Optional<User> emailUser = users.findByEmailIgnoreCaseAndDeletedAtIsNull(normalizedEmail);
        if (emailUser.isPresent() && emailUser.get().getGoogleId() != null
                && !emailUser.get().getGoogleId().equals(identity.googleId())) {
            throw new AuthException("EMAIL_ALREADY_REGISTERED", "Email này đã được liên kết với một tài khoản Google khác.");
        }

        // Validate and lock registration key atomically (pessimistic lock prevents race condition)
        RegistrationKey consumedKey = validateAndLockRegistrationKey(rawKey.trim());

        // Create new user or link existing local email account
        User user;
        if (emailUser.isPresent()) {
            user = emailUser.get();
            user.setGoogleId(identity.googleId());
            user.setAuthProvider("GOOGLE");
            if (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) {
                user.updateProfile(user.getDisplayName(), user.getTimezone(), user.getLocale(), identity.picture());
            }
            user = users.save(user);
        } else {
            user = User.createGoogleUser(normalizedEmail, identity.name(), identity.googleId(), identity.picture());
            try {
                user = users.save(user);
            } catch (DataIntegrityViolationException ex) {
                throw new AuthException("EMAIL_ALREADY_REGISTERED", "Email này đã được sử dụng.");
            }
        }

        // Mark key as USED atomically in the same database transaction
        Instant now = Instant.now();
        if (registrationKeys != null) {
            if (consumedKey != null) {
                consumedKey.markUsed(user, now);
                registrationKeys.save(consumedKey);
            } else {
                // Fallback master key consumed: record audit entry
                String keyHash = tokenHasher.hash(rawKey.trim());
                RegistrationKey fallbackAudit = new RegistrationKey(keyHash, null);
                fallbackAudit.markUsed(user, now);
                registrationKeys.save(fallbackAudit);
            }
        }

        // Issue authenticated session
        Session session = issueSession(user, userAgent, ipAddress);
        return new GoogleAuthResult(GoogleAuthResponse.authenticated(session.response()), session.rawRefreshToken(), false);
    }

    private RegistrationKey validateAndLockRegistrationKey(String rawKey) {
        String keyHash = tokenHasher.hash(rawKey);
        Instant now = Instant.now();

        if (registrationKeys != null) {
            Optional<RegistrationKey> optKey = registrationKeys.findByKeyHashForUpdate(keyHash);
            if (optKey.isPresent()) {
                RegistrationKey key = optKey.get();
                if ("USED".equalsIgnoreCase(key.getStatus())) {
                    throw new AuthException("REGISTRATION_KEY_ALREADY_USED", "Mã kích hoạt này đã được sử dụng.");
                }
                if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(now)) {
                    throw new AuthException("REGISTRATION_KEY_EXPIRED", "Mã kích hoạt đã hết hạn.");
                }
                if (!"ACTIVE".equalsIgnoreCase(key.getStatus())) {
                    throw new AuthException("INVALID_REGISTRATION_KEY", "Mã kích hoạt không còn hiệu lực.");
                }
                return key;
            }
        }

        // Fallback: check master registration key from properties
        String configuredKey = properties.registrationKey();
        if (configuredKey != null && !configuredKey.isBlank() && configuredKey.trim().equals(rawKey)) {
            // Check if already used in audit table
            if (registrationKeys != null && registrationKeys.existsByKeyHashAndStatus(keyHash, "USED")) {
                throw new AuthException("REGISTRATION_KEY_ALREADY_USED", "Mã kích hoạt này đã được sử dụng.");
            }
            return null; // Master key valid
        }

        throw new AuthException("INVALID_REGISTRATION_KEY", "Mã kích hoạt không chính xác hoặc không tồn tại.");
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
        return new Session(new AuthResponse(accessToken, jwtService.accessTokenExpiresInSeconds(), toResponse(user), refreshToken),
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

    public record GoogleAuthResult(GoogleAuthResponse response, String rawRefreshToken, boolean keyRequired) {}

    private record Session(AuthResponse response, RefreshToken refreshToken, String rawRefreshToken) {}
}
