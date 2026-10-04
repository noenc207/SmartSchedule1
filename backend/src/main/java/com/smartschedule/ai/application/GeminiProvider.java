package com.smartschedule.ai.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.config.AiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.function.Consumer;

@Component
public class GeminiProvider implements AiProvider {
    private static final Logger log = LoggerFactory.getLogger(GeminiProvider.class);
    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AiToolRegistry toolRegistry;

    public GeminiProvider(AiProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, new AiToolRegistry());
    }

    @Autowired
    public GeminiProvider(AiProperties properties, ObjectMapper objectMapper, AiToolRegistry toolRegistry) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.toolRegistry = toolRegistry != null ? toolRegistry : new AiToolRegistry();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(properties.timeoutSeconds()));
        factory.setReadTimeout(Duration.ofSeconds(properties.timeoutSeconds()));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    private final java.util.concurrent.atomic.AtomicInteger keyIndexCounter = new java.util.concurrent.atomic.AtomicInteger(0);

    public boolean hasApiKey() {
        return !getApiKeys().isEmpty();
    }

    @Override
    public String getName() {
        return "gemini";
    }

    @Override
    public String getModel() {
        return properties.geminiModel();
    }

    @Override
    public boolean supportsTools() {
        return true;
    }

    @Override
    public boolean supportsStructuredOutput() {
        return true;
    }

    @Override
    public ProviderHealth healthCheck() {
        if (!hasApiKey()) {
            return new ProviderHealth(HealthStatus.UNAVAILABLE, "Gemini API key is not configured", 0);
        }
        return new ProviderHealth(HealthStatus.AVAILABLE, "Gemini configured with " + getApiKeys().size() + " key(s)", 0);
    }

    public List<String> getApiKeys() {
        String raw = properties.geminiApiKey();
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split("[,;\\s]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }

    private List<String> getOrderedApiKeys() {
        List<String> keys = getApiKeys();
        if (keys.isEmpty()) return List.of();
        if (keys.size() == 1) return keys;

        int startIdx = Math.abs(keyIndexCounter.getAndIncrement() % keys.size());
        List<String> ordered = new ArrayList<>(keys.size());
        for (int i = 0; i < keys.size(); i++) {
            ordered.add(keys.get((startIdx + i) % keys.size()));
        }
        return ordered;
    }

    @Override
    public ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage) {
        ensureApiKeyConfigured();

        List<String> candidateKeys = getOrderedApiKeys();
        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, true);
        List<String> candidateModels = getCandidateModels();

        Throwable lastException = null;

        for (int keyIdx = 0; keyIdx < candidateKeys.size(); keyIdx++) {
            String apiKey = candidateKeys.get(keyIdx);
            boolean keyFailed = false;

            for (int modelIndex = 0; modelIndex < candidateModels.size(); modelIndex++) {
                String model = candidateModels.get(modelIndex);
                int maxAttempts = (modelIndex == 0) ? 2 : 1;

                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                            model, apiKey);
                    try {
                        GeminiResponse response = restClient.post()
                                .uri(url)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(requestPayload)
                                .retrieve()
                                .body(GeminiResponse.class);

                        if (response == null || response.candidates == null || response.candidates.isEmpty()) {
                            throw new AiException("EMPTY_RESPONSE", "Gemini không trả về câu trả lời.");
                        }

                        GeminiCandidate candidate = response.candidates.getFirst();
                        if (candidate.content == null || candidate.content.parts == null || candidate.content.parts.isEmpty()) {
                            throw new AiException("EMPTY_RESPONSE", "Nội dung phản hồi từ Gemini bị trống.");
                        }

                        StringBuilder textBuilder = new StringBuilder();
                        List<ToolCall> toolCalls = new ArrayList<>();

                        for (GeminiPart part : candidate.content.parts) {
                            if (part.text != null) {
                                textBuilder.append(part.text);
                            }
                            if (part.functionCall != null) {
                                toolCalls.add(new ToolCall(part.functionCall.name, part.functionCall.args));
                            }
                        }

                        Integer tokensUsed = (response.usageMetadata != null) ? response.usageMetadata.totalTokenCount : null;
                        return new ProviderResponse(textBuilder.toString().trim(), toolCalls, tokensUsed);

                    } catch (RestClientResponseException ex) {
                        int status = ex.getStatusCode().value();
                        String body = ex.getResponseBodyAsString();
                        log.warn("Gemini generateContent error (key#={}/{}, model={}, attempt={}/{}): HTTP {}: {}",
                                keyIdx + 1, candidateKeys.size(), model, attempt, maxAttempts, status, body);

                        boolean isRetriable = isRetriableStatus(status);
                        boolean isModelNotFound = (status == 404);
                        boolean isQuota = (status == 429);
                        boolean isAuthError = (status == 401 || status == 403 || (status == 400 && body != null && body.contains("API_KEY_INVALID")));

                        if ((isQuota || isAuthError) && keyIdx < candidateKeys.size() - 1) {
                            log.info("Gemini key #{} hit status {} (quota/auth error), switching to next key in pool",
                                    keyIdx + 1, status);
                            keyFailed = true;
                            lastException = mapHttpResponseToAiException(status, body);
                            break;
                        }

                        boolean hasMoreModels = modelIndex < candidateModels.size() - 1;
                        if (isRetriable && !isQuota && attempt < maxAttempts) {
                            sleepWithBackoff(attempt);
                            continue;
                        }

                        if (hasMoreModels && (isRetriable || isModelNotFound || isQuota)) {
                            lastException = mapHttpResponseToAiException(status, body);
                            log.info("Gemini model {} failed with HTTP {}, switching to next candidate model", model, status);
                            break;
                        }

                        lastException = mapHttpResponseToAiException(status, body);
                        if (!isRetriable && !isModelNotFound) {
                            break;
                        }
                    } catch (AiException ex) {
                        if ("EMPTY_RESPONSE".equals(ex.getCode()) && (attempt < maxAttempts || modelIndex < candidateModels.size() - 1)) {
                            sleepWithBackoff(attempt);
                            continue;
                        }
                        lastException = ex;
                    } catch (Exception ex) {
                        log.warn("Gemini generateContent connection error (key#={}/{}, model={}): {}",
                                keyIdx + 1, candidateKeys.size(), model, ex.getMessage());
                        if (attempt < maxAttempts || modelIndex < candidateModels.size() - 1) {
                            sleepWithBackoff(attempt);
                            continue;
                        }
                        lastException = ex;
                    }
                }

                if (keyFailed) {
                    break;
                }
            }
        }

        if (lastException instanceof AiException aiEx) {
            throw aiEx;
        }
        log.error("All Gemini generateContent retry attempts, keys and fallback models exhausted. Last error: {}",
                lastException != null ? lastException.getMessage() : "Unknown");
        throw new AiException("SERVER_OVERLOADED",
                "Máy chủ Google AI đang tạm thời quá tải hoặc bận trong giây lát. Bạn vui lòng thử lại sau ít giây nhé!");
    }

    @Override
    public void streamResponse(String systemInstruction, List<ChatMessage> history, String userMessage,
                               Consumer<String> onChunk,
                               Consumer<List<ToolCall>> onCompleteWithTools,
                               Consumer<Throwable> onError) {
        ensureApiKeyConfigured();

        List<String> candidateKeys = getOrderedApiKeys();
        List<String> candidateModels = getCandidateModels();
        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, true);

        Throwable lastException = null;

        for (int keyIdx = 0; keyIdx < candidateKeys.size(); keyIdx++) {
            String apiKey = candidateKeys.get(keyIdx);
            boolean keyFailed = false;

            for (int modelIndex = 0; modelIndex < candidateModels.size(); modelIndex++) {
                String model = candidateModels.get(modelIndex);
                int maxAttempts = (modelIndex == 0) ? 2 : 1;

                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    HttpURLConnection conn = null;
                    try {
                        String urlString = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse",
                                model, apiKey);
                        URL url = URI.create(urlString).toURL();
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setDoOutput(true);
                        conn.setRequestProperty(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
                        conn.setRequestProperty(HttpHeaders.ACCEPT, "text/event-stream");
                        conn.setConnectTimeout(properties.timeoutSeconds() * 1000);
                        conn.setReadTimeout(properties.timeoutSeconds() * 1000);

                        byte[] jsonBytes = objectMapper.writeValueAsBytes(requestPayload);
                        try (var os = conn.getOutputStream()) {
                            os.write(jsonBytes);
                            os.flush();
                        }

                        int responseCode = conn.getResponseCode();
                        if (responseCode >= 400) {
                            String errorBody = "";
                            try (InputStream es = conn.getErrorStream()) {
                                if (es != null) {
                                    errorBody = new String(es.readAllBytes(), StandardCharsets.UTF_8);
                                }
                            }
                            log.warn("Gemini stream error (key#={}/{}, model={}, attempt={}/{}): HTTP {}: {}",
                                    keyIdx + 1, candidateKeys.size(), model, attempt, maxAttempts, responseCode, errorBody);

                            boolean isRetriable = isRetriableStatus(responseCode);
                            boolean isModelNotFound = (responseCode == 404);
                            boolean isQuota = (responseCode == 429);
                            boolean isAuthError = (responseCode == 401 || responseCode == 403 || (responseCode == 400 && errorBody.contains("API_KEY_INVALID")));

                            if ((isQuota || isAuthError) && keyIdx < candidateKeys.size() - 1) {
                                log.info("Gemini stream key #{} hit status {} (quota/auth error), switching to next key in pool",
                                        keyIdx + 1, responseCode);
                                keyFailed = true;
                                lastException = mapHttpResponseToAiException(responseCode, errorBody);
                                break;
                            }

                            boolean hasMoreModels = modelIndex < candidateModels.size() - 1;
                            if (isRetriable && !isQuota && attempt < maxAttempts) {
                                sleepWithBackoff(attempt);
                                continue;
                            }

                            if (hasMoreModels && (isRetriable || isModelNotFound || isQuota)) {
                                lastException = mapHttpResponseToAiException(responseCode, errorBody);
                                log.info("Gemini stream model {} failed with HTTP {}, switching to next candidate model", model, responseCode);
                                break;
                            }

                            AiException mapped = mapHttpResponseToAiException(responseCode, errorBody);
                            if (!isRetriable && !isModelNotFound && keyIdx >= candidateKeys.size() - 1) {
                                onError.accept(mapped);
                                return;
                            }
                            lastException = mapped;
                            break;
                        }

                        List<ToolCall> streamedToolCalls = new ArrayList<>();
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                if (line.startsWith("data: ")) {
                                    String jsonChunk = line.substring(6).trim();
                                    if ("[DONE]".equalsIgnoreCase(jsonChunk)) {
                                        break;
                                    }
                                    try {
                                        GeminiResponse chunkResponse = objectMapper.readValue(jsonChunk, GeminiResponse.class);
                                        if (chunkResponse != null && chunkResponse.candidates != null && !chunkResponse.candidates.isEmpty()) {
                                            GeminiCandidate candidate = chunkResponse.candidates.getFirst();
                                            if (candidate.content != null && candidate.content.parts != null) {
                                                for (GeminiPart part : candidate.content.parts) {
                                                    if (part.text != null && !part.text.isEmpty()) {
                                                        onChunk.accept(part.text);
                                                    }
                                                    if (part.functionCall != null) {
                                                        streamedToolCalls.add(new ToolCall(part.functionCall.name, part.functionCall.args));
                                                    }
                                                }
                                            }
                                        }
                                    } catch (Exception parseEx) {
                                        log.debug("Could not parse SSE chunk: {}", parseEx.getMessage());
                                    }
                                }
                            }
                        }

                        onCompleteWithTools.accept(streamedToolCalls);
                        return;

                    } catch (AiException ex) {
                        lastException = ex;
                        boolean isTransient = "SERVER_OVERLOADED".equals(ex.getCode())
                                || "SERVER_ERROR".equals(ex.getCode())
                                || "QUOTA_EXCEEDED".equals(ex.getCode());
                        if (modelIndex < candidateModels.size() - 1 && isTransient) {
                            break;
                        }
                        if (keyIdx < candidateKeys.size() - 1) {
                            keyFailed = true;
                            break;
                        }
                        if (!isTransient && keyIdx >= candidateKeys.size() - 1) {
                            onError.accept(ex);
                            return;
                        }
                    } catch (Exception ex) {
                        log.warn("Gemini stream connection error (key#={}/{}, model={}, attempt={}/{}): {}",
                                keyIdx + 1, candidateKeys.size(), model, attempt, maxAttempts, ex.getMessage());
                        lastException = ex;
                        if (attempt < maxAttempts) {
                            sleepWithBackoff(attempt);
                            continue;
                        }
                        if (modelIndex < candidateModels.size() - 1) {
                            break;
                        }
                    } finally {
                        if (conn != null) {
                            conn.disconnect();
                        }
                    }
                }

                if (keyFailed) {
                    break;
                }
            }
        }

        log.error("All Gemini stream retry attempts, keys and fallback models exhausted. Last error: {}",
                lastException != null ? lastException.getMessage() : "Unknown");
        if (lastException instanceof AiException aiEx) {
            onError.accept(aiEx);
        } else {
            onError.accept(new AiException("SERVER_OVERLOADED",
                    "Máy chủ Google AI đang tạm thời quá tải hoặc bận trong giây lát. Bạn vui lòng thử lại sau ít giây nhé!"));
        }
    }

    private static final Set<String> RETIRED_MODELS = Set.of(
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-pro",
            "gemini-pro-vision",
            "gemini-1.0-pro"
    );

    public List<String> getCandidateModels() {
        List<String> list = new ArrayList<>();
        String configured = properties.geminiModel();
        if (configured != null && !configured.isBlank()) {
            String trimmed = configured.trim();
            if (!RETIRED_MODELS.contains(trimmed)) {
                list.add(trimmed);
            } else {
                log.warn("Configured model '{}' is retired/unsupported by Google API. Falling back to active models.", trimmed);
            }
        }
        List<String> fallbacks = List.of(
                "gemini-3.6-flash",
                "gemini-flash-lite-latest",
                "gemini-flash-latest",
                "gemini-3.8-flash",
                "gemini-2.5-flash",
                "gemini-2.5-pro"
        );
        for (String fb : fallbacks) {
            if (!list.contains(fb)) {
                list.add(fb);
            }
        }
        return list;
    }

    private boolean isRetriableStatus(int statusCode) {
        return statusCode == 503  // Service Unavailable (Model Overloaded)
                || statusCode == 500  // Internal Server Error
                || statusCode == 502  // Bad Gateway
                || statusCode == 504  // Gateway Timeout
                || statusCode == 429; // Rate Limit / Resource Exhausted transient spike
    }

    private void sleepWithBackoff(int attempt) {
        long sleepMs = (800L * attempt) + (long) (Math.random() * 400);
        try {
            Thread.sleep(sleepMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new AiException("REQUEST_INTERRUPTED", "Yêu cầu bị gián đoạn.");
        }
    }

    private AiException mapHttpResponseToAiException(int statusCode, String errorBody) {
        if (statusCode == 503 || statusCode == 502 || statusCode == 504) {
            return new AiException("SERVER_OVERLOADED",
                    "Máy chủ Google AI đang tạm thời quá tải hoặc bận trong giây lát. Bạn vui lòng thử lại sau ít giây nhé!");
        }
        if (statusCode == 500) {
            return new AiException("SERVER_ERROR",
                    "Dịch vụ Google AI tạm thời gặp sự cố nội bộ. Bạn vui lòng thử lại sau giây lát.");
        }
        if (statusCode == 429) {
            return new AiException("QUOTA_EXCEEDED",
                    "Trợ lý AI đang nhận được rất nhiều yêu cầu và vượt hạn mức tạm thời. Bạn vui lòng đợi 30 giây rồi thử lại nhé!");
        }
        if (statusCode == 400 || statusCode == 403) {
            if (errorBody != null && errorBody.contains("API_KEY_INVALID")) {
                return new AiException("INVALID_KEY",
                        "Khóa Gemini API không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên.");
            }
            return new AiException("INVALID_REQUEST",
                    "Yêu cầu gửi đến Google AI không hợp lệ: " + extractMessage(errorBody));
        }
        return new AiException("GEMINI_ERROR",
                "Máy chủ Google AI phản hồi trạng thái HTTP " + statusCode + ". Bạn vui lòng thử lại sau.");
    }

    private String extractMessage(String errorBody) {
        if (errorBody == null || errorBody.isBlank()) return "";
        try {
            var node = objectMapper.readTree(errorBody);
            if (node.has("error") && node.get("error").has("message")) {
                return node.get("error").get("message").asText();
            }
        } catch (Exception ignored) {}
        return errorBody.length() > 100 ? errorBody.substring(0, 100) + "…" : errorBody;
    }

    private void ensureApiKeyConfigured() {
        if (!hasApiKey()) {
            throw new AiException("MISSING_API_KEY",
                    "Gemini API key chưa được cấu hình trên server. Vui lòng thiết lập GEMINI_API_KEY trong environment.");
        }
    }

    private Map<String, Object> buildGeminiPayload(String systemInstruction, List<ChatMessage> history, String userMessage, boolean includeTools) {
        Map<String, Object> payload = new LinkedHashMap<>();

        // System Instruction
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            payload.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        // Contents (conversation history + latest user message)
        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (ChatMessage msg : history) {
                String role = "user".equalsIgnoreCase(msg.role()) ? "user" : "model";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.content()))
                ));
            }
        }
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));
        payload.put("contents", contents);

        // Generation Config
        payload.put("generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", properties.maxOutputTokens()
        ));

        // Read & Write Tools declarations from centralized Tool Registry
        if (includeTools && toolRegistry != null) {
            payload.put("tools", List.of(
                    Map.of("function_declarations", toolRegistry.getGeminiFunctionDeclarations())
            ));
        }

        return payload;
    }

    // =========================================================================
    // DTOs for parsing Gemini JSON responses
    // =========================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiResponse {
        public List<GeminiCandidate> candidates;
        public GeminiUsageMetadata usageMetadata;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiCandidate {
        public GeminiContent content;
        public String finishReason;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiContent {
        public List<GeminiPart> parts;
        public String role;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiPart {
        public String text;
        public GeminiFunctionCall functionCall;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiFunctionCall {
        public String name;
        public Map<String, Object> args;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiUsageMetadata {
        public Integer promptTokenCount;
        public Integer candidatesTokenCount;
        public Integer totalTokenCount;
    }
}
