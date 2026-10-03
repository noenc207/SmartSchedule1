package com.smartschedule.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.GeminiProvider;
import com.smartschedule.ai.config.AiProperties;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

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

    @Test
    void testGeminiFunctionDeclarations_allArraysHaveItems() {
        com.smartschedule.ai.application.AiToolRegistry registry = new com.smartschedule.ai.application.AiToolRegistry();
        List<Map<String, Object>> declarations = registry.getGeminiFunctionDeclarations();
        assertThat(declarations).isNotEmpty();

        for (Map<String, Object> decl : declarations) {
            String name = (String) decl.get("name");
            assertThat(name).isNotBlank();
            assertThat(decl.get("description")).isNotNull();

            Map<String, Object> params = (Map<String, Object>) decl.get("parameters");
            assertThat(params).isNotNull();
            assertThat(params.get("type")).isEqualTo("OBJECT");

            Map<String, Object> props = (Map<String, Object>) params.get("properties");
            if (props != null) {
                for (Map.Entry<String, Object> entry : props.entrySet()) {
                    String propName = entry.getKey();
                    Map<String, Object> propDef = (Map<String, Object>) entry.getValue();
                    String type = (String) propDef.get("type");
                    assertThat(type).withFailMessage("Tool %s, property %s has no type", name, propName).isNotNull();

                    if ("ARRAY".equalsIgnoreCase(type)) {
                        assertThat(propDef.get("items"))
                                .withFailMessage("Tool %s, array property %s must define 'items' for Gemini schema", name, propName)
                                .isNotNull();
                        Map<String, Object> items = (Map<String, Object>) propDef.get("items");
                        assertThat(items.get("type")).isNotNull();
                    }
                }
            }
        }
    }

    @Test
    void testMultiKeyParsing_andFiltering() {
        AiProperties properties = new AiProperties("key1, key2; key3\nkey4,  key1", "gemini-1.5-flash", 1500, 1024, 20, 30);
        GeminiProvider provider = new GeminiProvider(properties, new ObjectMapper());

        assertThat(provider.hasApiKey()).isTrue();
        List<String> keys = provider.getApiKeys();
        assertThat(keys).containsExactly("key1", "key2", "key3", "key4");
    }

    @Test
    void testHasApiKey_whenEmptyOrBlank() {
        AiProperties blankProps = new AiProperties("   ,  ;  ", "gemini-1.5-flash", 1500, 1024, 20, 30);
        GeminiProvider blankProvider = new GeminiProvider(blankProps, new ObjectMapper());
        assertThat(blankProvider.hasApiKey()).isFalse();
        assertThat(blankProvider.getApiKeys()).isEmpty();
    }
}
