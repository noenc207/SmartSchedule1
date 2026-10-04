package com.smartschedule.ai;

import com.smartschedule.ai.config.AiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class AiPropertiesContextTest {

    @Configuration
    @EnableConfigurationProperties(AiProperties.class)
    static class TestConfig {}

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(PropertyPlaceholderAutoConfiguration.class))
            .withUserConfiguration(TestConfig.class);

    @Test
    void testContextLoadsAiProperties() {
        contextRunner
                .withPropertyValues(
                        "smartschedule.ai.wayjet-api-key=test-key",
                        "smartschedule.ai.primary-provider=wayjet"
                )
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    AiProperties props = context.getBean(AiProperties.class);
                    assertThat(props).isNotNull();
                    assertThat(props.wayjetApiKey()).isEqualTo("test-key");
                    assertThat(props.primaryProvider()).isEqualTo("wayjet");
                });
    }
}
