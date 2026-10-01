package com.smartschedule.auth.api;

import com.smartschedule.auth.api.AuthDtos.LoginRequest;
import com.smartschedule.auth.api.AuthDtos.RegisterRequest;
import com.smartschedule.auth.application.AuthService;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.auth.config.AuthProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final AuthProperties properties;

    public AuthController(AuthService authService, CurrentUserService currentUserService, AuthProperties properties) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.properties = properties;
    }

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody RegisterRequest request,
                                 HttpServletRequest httpRequest, HttpServletResponse response) {
        AuthService.AuthSession session = authService.register(request, userAgent(httpRequest), httpRequest.getRemoteAddr());
        setRefreshCookie(response, session.rawRefreshToken());
        return session.response();
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest httpRequest, HttpServletResponse response) {
        AuthService.AuthSession session = authService.login(request, userAgent(httpRequest), httpRequest.getRemoteAddr());
        setRefreshCookie(response, session.rawRefreshToken());
        return session.response();
    }

    @PostMapping("/refresh")
    public AuthDtos.AuthResponse refresh(@RequestBody(required = false) AuthDtos.RefreshRequest body,
                                         HttpServletRequest request, HttpServletResponse response) {
        String token = (body != null && body.refreshToken() != null && !body.refreshToken().isBlank())
                ? body.refreshToken()
                : refreshCookie(request);
        AuthService.AuthSession session = authService.refresh(token, userAgent(request), request.getRemoteAddr());
        setRefreshCookie(response, session.rawRefreshToken());
        return session.response();
    }

    @PostMapping("/logout")
    public void logout(@RequestBody(required = false) AuthDtos.LogoutRequest body,
                       HttpServletRequest request, HttpServletResponse response) {
        String token = (body != null && body.refreshToken() != null && !body.refreshToken().isBlank())
                ? body.refreshToken()
                : refreshCookie(request);
        authService.logout(token);
        clearRefreshCookie(response);
    }

    @GetMapping("/me")
    public AuthDtos.UserResponse me() {
        return authService.currentUser(currentUserService.requireUser());
    }

    private String refreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (properties.refreshCookieName().equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(properties.refreshCookieName(), "")
                .httpOnly(true).secure(properties.secureCookie()).sameSite("Lax").path("/api/v1/auth")
                .maxAge(Duration.ZERO).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = ResponseCookie.from(properties.refreshCookieName(), rawToken)
                .httpOnly(true).secure(properties.secureCookie()).sameSite("Lax").path("/api/v1/auth")
                .maxAge(properties.refreshTokenTtl()).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
