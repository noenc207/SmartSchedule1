package com.smartschedule.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartschedule.ai")
public record AiProperties(
        String geminiApiKey,
        String geminiModel,
        int maxMessageLength,
        int maxOutputTokens,
        int requestsPerMinute,
        int timeoutSeconds,
        String visionServerUrl
) {
    public AiProperties {
        if (geminiModel == null || geminiModel.isBlank()) {
            geminiModel = "gemini-1.5-flash";
        }
        if (maxMessageLength <= 0) {
            maxMessageLength = 2000;
        }
        if (maxOutputTokens <= 0) {
            maxOutputTokens = 1024;
        }
        if (requestsPerMinute <= 0) {
            requestsPerMinute = 20;
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 30;
        }
        if (visionServerUrl == null || visionServerUrl.isBlank()) {
            visionServerUrl = "http://localhost:8090";
        }
    }

    public AiProperties(
            String geminiApiKey,
            String geminiModel,
            int maxMessageLength,
            int maxOutputTokens,
            int requestsPerMinute,
            int timeoutSeconds
    ) {
        this(geminiApiKey, geminiModel, maxMessageLength, maxOutputTokens, requestsPerMinute, timeoutSeconds, "http://localhost:8090");
    }

    public boolean hasApiKey() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }
}
