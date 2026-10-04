package com.smartschedule.ai.application;

import com.smartschedule.ai.config.AiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe Circuit Breaker per AI Provider.
 * Prevents cascading failure by temporarily short-circuiting failing providers.
 */
@Component
public class AiCircuitBreaker {

    private static final Logger log = LoggerFactory.getLogger(AiCircuitBreaker.class);

    public enum State {
        CLOSED,     // Healthy: traffic allowed
        OPEN,       // Failing: traffic rejected and short-circuited to fallback
        HALF_OPEN   // Probing: 1 probe request allowed to test recovery
    }

    private static class CircuitState {
        State state = State.CLOSED;
        int failureCount = 0;
        Instant openedAt = null;
    }

    private final Map<String, CircuitState> states = new ConcurrentHashMap<>();
    private final int failureThreshold;
    private final Duration cooldownDuration;

    @Autowired
    public AiCircuitBreaker(AiProperties properties) {
        this(
                properties.circuitFailureThreshold(),
                Duration.ofSeconds(properties.providerCooldownSeconds())
        );
    }

    public AiCircuitBreaker(int failureThreshold, Duration cooldownDuration) {
        this.failureThreshold = failureThreshold <= 0 ? 5 : failureThreshold;
        this.cooldownDuration = (cooldownDuration != null) ? cooldownDuration : Duration.ofSeconds(60);
    }

    public synchronized boolean canExecute(String provider) {
        if (provider == null) return true;
        CircuitState cs = states.computeIfAbsent(provider.toLowerCase(), k -> new CircuitState());

        if (cs.state == State.CLOSED) {
            return true;
        }

        if (cs.state == State.OPEN) {
            if (cs.openedAt != null && Instant.now().isAfter(cs.openedAt.plus(cooldownDuration))) {
                cs.state = State.HALF_OPEN;
                log.info("Circuit breaker for provider '{}' transitioned to HALF_OPEN (probing)", provider);
                return true;
            }
            return false;
        }

        // HALF_OPEN
        return true;
    }

    public synchronized void recordSuccess(String provider) {
        if (provider == null) return;
        CircuitState cs = states.computeIfAbsent(provider.toLowerCase(), k -> new CircuitState());
        if (cs.state != State.CLOSED) {
            log.info("Circuit breaker for provider '{}' recovered and CLOSED", provider);
        }
        cs.state = State.CLOSED;
        cs.failureCount = 0;
        cs.openedAt = null;
    }

    public synchronized void recordFailure(String provider, Throwable error) {
        if (provider == null) return;
        CircuitState cs = states.computeIfAbsent(provider.toLowerCase(), k -> new CircuitState());
        cs.failureCount++;
        log.warn("Circuit breaker for provider '{}': failure count={}/{}", provider, cs.failureCount, failureThreshold);

        if (cs.failureCount >= failureThreshold || cs.state == State.HALF_OPEN) {
            cs.state = State.OPEN;
            cs.openedAt = Instant.now();
            log.error("Circuit breaker for provider '{}' tripped to OPEN! Cooldown: {}s. Reason: {}",
                    provider, cooldownDuration.toSeconds(), error != null ? error.getMessage() : "unknown");
        }
    }

    public synchronized State getState(String provider) {
        if (provider == null) return State.CLOSED;
        CircuitState cs = states.get(provider.toLowerCase());
        return cs != null ? cs.state : State.CLOSED;
    }

    public synchronized int getFailureCount(String provider) {
        if (provider == null) return 0;
        CircuitState cs = states.get(provider.toLowerCase());
        return cs != null ? cs.failureCount : 0;
    }

    public synchronized void reset(String provider) {
        if (provider != null) {
            states.remove(provider.toLowerCase());
        }
    }
}
