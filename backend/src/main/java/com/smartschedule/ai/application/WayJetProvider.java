package com.smartschedule.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.config.AiProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * WayJet Primary AI Provider.
 * OpenAI-compatible multi-model gateway connecting to WayJet API.
 */
@Component
public class WayJetProvider extends OpenAiCompatibleProvider {

    private final AiProperties properties;

    @Autowired
    public WayJetProvider(AiProperties properties, ObjectMapper objectMapper, AiToolRegistry toolRegistry) {
        super(objectMapper, toolRegistry);
        this.properties = properties;
    }

    public WayJetProvider(AiProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, new AiToolRegistry());
    }

    @Override
    public String getName() {
        return "wayjet";
    }

    @Override
    public String getApiKey() {
        return properties.wayjetApiKey();
    }

    @Override
    public String getBaseUrl() {
        return properties.wayjetBaseUrl();
    }

    @Override
    public String getModel() {
        return properties.wayjetModel();
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
