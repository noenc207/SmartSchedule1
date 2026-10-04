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
        String visionServerUrl,
        String wayjetApiKey,
        String wayjetBaseUrl,
        String wayjetModel,
        String primaryProvider,
        String fallbackOrder,
        int dailyRequestLimit,
        int providerCooldownSeconds,
        int circuitFailureThreshold,
        int maxRetries,
        String groqApiKey,
        String groqBaseUrl,
        String groqModel,
        String thirdProviderApiKey,
        String thirdProviderBaseUrl,
        String thirdProviderModel
) {
    public AiProperties {
        geminiModel = (geminiModel == null || geminiModel.isBlank()) ? "gemini-3.6-flash" : geminiModel;
        maxMessageLength = maxMessageLength <= 0 ? 2000 : maxMessageLength;
        maxOutputTokens = maxOutputTokens <= 0 ? 1024 : maxOutputTokens;
        requestsPerMinute = requestsPerMinute <= 0 ? 5 : requestsPerMinute;
        timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
        visionServerUrl = (visionServerUrl == null || visionServerUrl.isBlank()) ? "http://localhost:8090" : visionServerUrl;

        wayjetBaseUrl = (wayjetBaseUrl == null || wayjetBaseUrl.isBlank()) ? "https://api.xah.io/v1" : wayjetBaseUrl;
        wayjetModel = (wayjetModel == null || wayjetModel.isBlank()) ? "mainnewnol/gpt-5.6-luna" : wayjetModel;

        primaryProvider = (primaryProvider == null || primaryProvider.isBlank()) ? "wayjet" : primaryProvider.trim().toLowerCase();
        fallbackOrder = (fallbackOrder == null || fallbackOrder.isBlank()) ? "gemini,groq,third_fallback" : fallbackOrder;
        dailyRequestLimit = dailyRequestLimit <= 0 ? 20 : dailyRequestLimit;
        providerCooldownSeconds = providerCooldownSeconds <= 0 ? 60 : providerCooldownSeconds;
        circuitFailureThreshold = circuitFailureThreshold <= 0 ? 5 : circuitFailureThreshold;
        maxRetries = maxRetries < 0 ? 1 : maxRetries;

        groqBaseUrl = (groqBaseUrl == null || groqBaseUrl.isBlank()) ? "https://api.groq.com/openai/v1" : groqBaseUrl;
        groqModel = (groqModel == null || groqModel.isBlank()) ? "llama-3.3-70b-versatile" : groqModel;

        thirdProviderBaseUrl = (thirdProviderBaseUrl == null || thirdProviderBaseUrl.isBlank()) ? "https://api.openai.com/v1" : thirdProviderBaseUrl;
        thirdProviderModel = (thirdProviderModel == null || thirdProviderModel.isBlank()) ? "gpt-4o-mini" : thirdProviderModel;
    }

    public AiProperties(
            String geminiApiKey,
            String geminiModel,
            int maxMessageLength,
            int maxOutputTokens,
            int requestsPerMinute,
            int timeoutSeconds,
            String visionServerUrl
    ) {
        this(geminiApiKey, geminiModel, maxMessageLength, maxOutputTokens, requestsPerMinute, timeoutSeconds, visionServerUrl,
                null, null, null, null, null, 20, 60, 5, 1, null, null, null, null, null, null);
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

    public boolean hasGeminiApiKey() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    public boolean hasWayjetApiKey() {
        return wayjetApiKey != null && !wayjetApiKey.isBlank();
    }
}
