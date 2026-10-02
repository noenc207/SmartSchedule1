package com.smartschedule;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SmartScheduleApplication {
    private static final Logger log = LoggerFactory.getLogger(SmartScheduleApplication.class);

    public static void main(String[] args) {
        loadDotenvIfPresent();
        SpringApplication.run(SmartScheduleApplication.class, args);
    }

    private static void loadDotenvIfPresent() {
        Path[] searchPaths = new Path[]{
            Path.of(".env"),
            Path.of("../.env"),
            Path.of("backend/.env")
        };
        for (Path p : searchPaths) {
            if (Files.isRegularFile(p)) {
                try {
                    List<String> lines = Files.readAllLines(p);
                    int loaded = 0;
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                        int eq = trimmed.indexOf('=');
                        if (eq > 0) {
                            String key = trimmed.substring(0, eq).trim();
                            String val = trimmed.substring(eq + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) ||
                                (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                                loaded++;
                            }
                        }
                    }
                    log.info("[ENV_LOADER] Successfully loaded {} properties from {}", loaded, p.toAbsolutePath());
                    break;
                } catch (IOException e) {
                    log.warn("[ENV_LOADER] Failed reading {}: {}", p, e.getMessage());
                }
            }
        }
    }

    @Bean
    public ApplicationRunner logHikariConfig(DataSource dataSource) {
        return args -> {
            if (dataSource instanceof HikariDataSource hikari) {
                log.info(
                    "[HIKARI_RUNTIME_VERIFIED] poolName={}, maximumPoolSize={}, minimumIdle={}, connectionTimeout={}ms, idleTimeout={}ms, maxLifetime={}ms",
                    hikari.getPoolName(),
                    hikari.getMaximumPoolSize(),
                    hikari.getMinimumIdle(),
                    hikari.getConnectionTimeout(),
                    hikari.getIdleTimeout(),
                    hikari.getMaxLifetime()
                );
            }
        };
    }
}
