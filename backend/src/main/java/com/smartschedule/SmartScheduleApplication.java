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

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SmartScheduleApplication {
    private static final Logger log = LoggerFactory.getLogger(SmartScheduleApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(SmartScheduleApplication.class, args);
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
