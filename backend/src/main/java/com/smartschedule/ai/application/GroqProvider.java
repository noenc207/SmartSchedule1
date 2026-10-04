package com.smartschedule.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.config.AiProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Groq Fallback AI Provider.
 * High-speed inference for Llama / Mixtral models.
 */
@Component
public class GroqProvider extends OpenAiCompatibleProvider {

    private final AiProperties properties;

    @Autowired
    public GroqProvider(AiProperties properties, ObjectMapper objectMapper, AiToolRegistry toolRegistry) {
        super(objectMapper, toolRegistry);
        this.properties = properties;
    }

    public GroqProvider(AiProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, new AiToolRegistry());
    }

    @Override
    public String getName() {
        return "groq";
    }

    @Override
    public String getApiKey() {
        return properties.groqApiKey();
    }

    @Override
    public String getBaseUrl() {
        return properties.groqBaseUrl();
    }

    @Override
    public String getModel() {
        return properties.groqModel();
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
