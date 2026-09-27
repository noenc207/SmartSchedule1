package com.smartschedule.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "smartschedule.auth")
public record AuthProperties(
        String jwtSecret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl,
        String refreshCookieName,
        boolean secureCookie,
        String registrationKey) {

    @ConstructorBinding
    public AuthProperties(String jwtSecret, Duration accessTokenTtl, Duration refreshTokenTtl,
                          String refreshCookieName, boolean secureCookie, String registrationKey) {
        this.jwtSecret = jwtSecret;
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
        this.refreshCookieName = refreshCookieName;
        this.secureCookie = secureCookie;
        this.registrationKey = registrationKey;
    }

    public AuthProperties(String jwtSecret, Duration accessTokenTtl, Duration refreshTokenTtl,
                          String refreshCookieName, boolean secureCookie) {
        this(jwtSecret, accessTokenTtl, refreshTokenTtl, refreshCookieName, secureCookie, "SMART-DEPLOY-2026");
    }
}

