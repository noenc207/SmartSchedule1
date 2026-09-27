package com.smartschedule.auth.application;

import com.smartschedule.auth.config.AuthProperties;
import com.smartschedule.user.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final AuthProperties properties;
    private final SecretKey signingKey;

    public JwtService(AuthProperties properties) {
        this.properties = properties;
        byte[] secret = properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("SMARTSCHEDULE_JWT_SECRET must be at least 32 bytes");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret);
    }

    public String issueAccessToken(User user, Instant now) {
        Instant expiresAt = now.plus(properties.accessTokenTtl());
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();
    }

    public Claims parseAccessToken(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
        if (!"access".equals(claims.get("type", String.class))) {
            throw new IllegalArgumentException("Invalid token type");
        }
        return claims;
    }

    public UUID userId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public long accessTokenExpiresInSeconds() {
        return properties.accessTokenTtl().toSeconds();
    }
}
