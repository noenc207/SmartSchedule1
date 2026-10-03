package com.smartschedule.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.GeminiProvider;
import com.smartschedule.ai.config.AiProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiProviderTest {

    @Test
    void testMissingApiKey_throwsException() {
        AiProperties properties = new AiProperties("", "gemini-3.8-flash", 1500, 1024, 20, 30);
        GeminiProvider provider = new GeminiProvider(properties, new ObjectMapper());

        assertThatThrownBy(() -> provider.generateResponse("sys", List.of(), "hello"))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("chưa được cấu hình");
    }

    @Test
    void testStreamResponse_whenApiKeyMissing_callsOnError() {
        AiProperties properties = new AiProperties("", "gemini-3.8-flash", 1500, 1024, 20, 30);
        GeminiProvider provider = new GeminiProvider(properties, new ObjectMapper());

        assertThatThrownBy(() -> provider.streamResponse("sys", List.of(), "hello",
                chunk -> {},
                tools -> {},
                err -> {
                    assertThat(err).isInstanceOf(AiException.class);
                }))
                .isInstanceOf(AiException.class);
    }

    @Test
    void testSpringContext_canInstantiateGeminiProvider() {
        org.springframework.context.annotation.AnnotationConfigApplicationContext context =
                new org.springframework.context.annotation.AnnotationConfigApplicationContext();
        context.registerBean(AiProperties.class, () -> new AiProperties("", "gemini-3.8-flash", 1500, 1024, 20, 30));
        context.registerBean(ObjectMapper.class, () -> new ObjectMapper());
        context.registerBean(com.smartschedule.ai.application.AiToolRegistry.class, () -> new com.smartschedule.ai.application.AiToolRegistry());
        context.register(GeminiProvider.class);
        context.refresh();

        GeminiProvider provider = context.getBean(GeminiProvider.class);
        assertThat(provider).isNotNull();
        context.close();
    }
}
