package com.smartschedule.auth.infrastructure;

import com.smartschedule.auth.config.RateLimitingProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class RateLimitingFilter extends OncePerRequestFilter {
    private final RateLimitingProperties properties;
    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();

    public RateLimitingFilter(RateLimitingProperties properties) {
        this.properties = properties != null ? properties : new RateLimitingProperties();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!properties.isEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            int limit = resolveLimit(path);
            if (limit > 0) {
                String clientIp = extractClientIp(request);
                String actionKey = clientIp + ":" + normalizePath(path);

                if (isRateLimited(actionKey, limit)) {
                    sendRateLimitResponse(request, response);
                    return;
                }
            }
        }

        chain.doFilter(request, response);
    }

    private int resolveLimit(String path) {
        if (path.endsWith("/api/v1/auth/register")) {
            return properties.getRegisterPerMinute();
        }
        if (path.endsWith("/api/v1/auth/login") || path.endsWith("/api/v1/auth/google")) {
            return properties.getLoginPerMinute();
        }
        if (path.endsWith("/api/v1/auth/refresh")) {
            return properties.getRefreshPerMinute();
        }
        return 0;
    }

    private String normalizePath(String path) {
        if (path.contains("/register")) return "register";
        if (path.contains("/login") || path.contains("/google")) return "login";
        if (path.contains("/refresh")) return "refresh";
        return path;
    }

    private boolean isRateLimited(String key, int maxRequestsPerMinute) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L;

        Deque<Long> timestamps = requestLog.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequestsPerMinute) {
                return true;
            }
            timestamps.addLast(now);
            return false;
        }
    }

    private void sendRateLimitResponse(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Retry-After", "60");

        String body = String.format(
                "{\"timestamp\":\"%s\",\"status\":429,\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"Quá nhiều yêu cầu từ địa chỉ IP của bạn. Vui lòng thử lại sau 1 phút.\",\"path\":\"%s\",\"fields\":{}}",
                Instant.now(),
                request.getRequestURI()
        );
        response.getWriter().write(body);
    }

    private String extractClientIp(HttpServletRequest request) {
        // 1. Trust X-Real-IP set by edge reverse proxy (Nginx) from physical remote_addr
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        // 2. Fallback to X-Forwarded-For
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] parts = xForwardedFor.split(",");
            if (parts.length > 0 && !parts[0].isBlank()) {
                return parts[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    @Scheduled(fixedRate = 300_000)
    public void cleanupStaleEntries() {
        long windowStart = System.currentTimeMillis() - 60_000L;
        requestLog.entrySet().removeIf(entry -> {
            Deque<Long> deque = entry.getValue();
            synchronized (deque) {
                while (!deque.isEmpty() && deque.peekFirst() < windowStart) {
                    deque.pollFirst();
                }
                return deque.isEmpty();
            }
        });
    }

    // Visible for testing
    void clearLog() {
        requestLog.clear();
    }
}
