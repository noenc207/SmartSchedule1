package com.smartschedule.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

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
    @ConstructorBinding
    public AiProperties(
            String geminiApiKey,
            String geminiModel,
            int maxMessageLength,
            int maxOutputTokens,
            int requestsPerMinute,
            int timeoutSeconds,
            String visionServerUrl
    ) {
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = (geminiModel == null || geminiModel.isBlank()) ? "gemini-3.7-flash" : geminiModel;
        this.maxMessageLength = maxMessageLength <= 0 ? 2000 : maxMessageLength;
        this.maxOutputTokens = maxOutputTokens <= 0 ? 1024 : maxOutputTokens;
        this.requestsPerMinute = requestsPerMinute <= 0 ? 20 : requestsPerMinute;
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
        this.visionServerUrl = (visionServerUrl == null || visionServerUrl.isBlank()) ? "http://localhost:8090" : visionServerUrl;
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
