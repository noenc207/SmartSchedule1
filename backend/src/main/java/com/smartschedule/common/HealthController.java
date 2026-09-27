package com.smartschedule.common;

import com.zaxxer.hikari.HikariDataSource;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {
    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "UP");
        res.put("service", "smartschedule-api");
        res.put("timestamp", Instant.now());
        if (dataSource instanceof HikariDataSource hikari) {
            Map<String, Object> pool = new LinkedHashMap<>();
            pool.put("poolName", hikari.getPoolName());
            pool.put("maximumPoolSize", hikari.getMaximumPoolSize());
            pool.put("minimumIdle", hikari.getMinimumIdle());
            pool.put("connectionTimeout", hikari.getConnectionTimeout());
            pool.put("idleTimeout", hikari.getIdleTimeout());
            pool.put("maxLifetime", hikari.getMaxLifetime());
            if (hikari.getHikariPoolMXBean() != null) {
                pool.put("activeConnections", hikari.getHikariPoolMXBean().getActiveConnections());
                pool.put("idleConnections", hikari.getHikariPoolMXBean().getIdleConnections());
                pool.put("totalConnections", hikari.getHikariPoolMXBean().getTotalConnections());
                pool.put("threadsAwaitingConnection", hikari.getHikariPoolMXBean().getThreadsAwaitingConnection());
            }
            res.put("hikariPool", pool);
        }
        return res;
    }

    @GetMapping("/pool")
    public Map<String, Object> poolMetrics() {
        Map<String, Object> metrics = new LinkedHashMap<>();
        if (dataSource instanceof HikariDataSource hikari) {
            metrics.put("poolName", hikari.getPoolName());
            metrics.put("maximumPoolSize", hikari.getMaximumPoolSize());
            metrics.put("minimumIdle", hikari.getMinimumIdle());
            metrics.put("connectionTimeout", hikari.getConnectionTimeout());
            metrics.put("idleTimeout", hikari.getIdleTimeout());
            metrics.put("maxLifetime", hikari.getMaxLifetime());
            if (hikari.getHikariPoolMXBean() != null) {
                metrics.put("activeConnections", hikari.getHikariPoolMXBean().getActiveConnections());
                metrics.put("idleConnections", hikari.getHikariPoolMXBean().getIdleConnections());
                metrics.put("totalConnections", hikari.getHikariPoolMXBean().getTotalConnections());
                metrics.put("threadsAwaitingConnection", hikari.getHikariPoolMXBean().getThreadsAwaitingConnection());
            }
        } else {
            metrics.put("dataSourceType", dataSource != null ? dataSource.getClass().getName() : "null");
        }
        return metrics;
    }
}
