package com.smartschedule.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.config.AiProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Third Generic Fallback AI Provider (OpenAI, OpenRouter, Together, etc.).
 */
@Component
public class ThirdFallbackProvider extends OpenAiCompatibleProvider {

    private final AiProperties properties;

    @Autowired
    public ThirdFallbackProvider(AiProperties properties, ObjectMapper objectMapper, AiToolRegistry toolRegistry) {
        super(objectMapper, toolRegistry);
        this.properties = properties;
    }

    public ThirdFallbackProvider(AiProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, new AiToolRegistry());
    }

    @Override
    public String getName() {
        return "third_fallback";
    }

    @Override
    public String getApiKey() {
        return properties.thirdProviderApiKey();
    }

    @Override
    public String getBaseUrl() {
        return properties.thirdProviderBaseUrl();
    }

    @Override
    public String getModel() {
        return properties.thirdProviderModel();
    }

    @Override
    public int getTimeoutSeconds() {
        return properties.timeoutSeconds();
    }

    @Override
    public int getMaxOutputTokens() {
        return properties.maxOutputTokens();
    }
}
