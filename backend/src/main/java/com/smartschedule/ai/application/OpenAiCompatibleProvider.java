package com.smartschedule.ai.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

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

/**
 * High-performance, robust client for OpenAI-compatible AI API gateways
 * (WayJet, Groq, OpenRouter, Together, etc.).
 */
public abstract class OpenAiCompatibleProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleProvider.class);

    protected final ObjectMapper objectMapper;
    protected final AiToolRegistry toolRegistry;

    public OpenAiCompatibleProvider(ObjectMapper objectMapper, AiToolRegistry toolRegistry) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.toolRegistry = toolRegistry != null ? toolRegistry : new AiToolRegistry();
    }

    public abstract String getApiKey();
    public abstract String getBaseUrl();
    public abstract String getModel();
    public abstract int getTimeoutSeconds();
    public abstract int getMaxOutputTokens();

    public boolean hasApiKey() {
        String key = getApiKey();
        return key != null && !key.isBlank();
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
            return new ProviderHealth(HealthStatus.UNAVAILABLE, getName() + " API key is not configured", 0);
        }
        long start = System.currentTimeMillis();
        try {
            String baseUrl = normalizeBaseUrl(getBaseUrl());
            URL url = URI.create(baseUrl + "/models").toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty(HttpHeaders.AUTHORIZATION, "Bearer " + getApiKey().trim());
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            int code = conn.getResponseCode();
            long latency = System.currentTimeMillis() - start;
            if (code == 200) {
                return new ProviderHealth(HealthStatus.AVAILABLE, "Reachable, status 200", latency);
            } else if (code == 401 || code == 403) {
                return new ProviderHealth(HealthStatus.UNAVAILABLE, "Authentication error: HTTP " + code, latency);
            } else {
                return new ProviderHealth(HealthStatus.DEGRADED, "HTTP " + code, latency);
            }
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            return new ProviderHealth(HealthStatus.UNAVAILABLE, ex.getMessage(), latency);
        }
    }

    @Override
    public ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage) {
        if (!hasApiKey()) {
            throw new AiException("API_KEY_MISSING", getName() + " API key is not configured");
        }

        Map<String, Object> requestPayload = buildRequestPayload(systemInstruction, history, userMessage, false);
        String baseUrl = normalizeBaseUrl(getBaseUrl());
        String urlString = baseUrl + "/chat/completions";

        HttpURLConnection conn = null;
        try {
            URL url = URI.create(urlString).toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
            conn.setRequestProperty(HttpHeaders.AUTHORIZATION, "Bearer " + getApiKey().trim());
            conn.setConnectTimeout(getTimeoutSeconds() * 1000);
            conn.setReadTimeout(getTimeoutSeconds() * 1000);

            byte[] jsonBytes = objectMapper.writeValueAsBytes(requestPayload);
            try (var os = conn.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            if (responseCode >= 400) {
                String errorBody = readStreamSafely(conn.getErrorStream());
                log.warn("{} error HTTP {}: {}", getName(), responseCode, errorBody);
                throw mapHttpError(responseCode, errorBody);
            }

            String responseBody = readStreamSafely(conn.getInputStream());
            OpenAiChatResponse resp = objectMapper.readValue(responseBody, OpenAiChatResponse.class);

            if (resp == null || resp.choices == null || resp.choices.isEmpty()) {
                return new ProviderResponse("", List.of(), 0);
            }

            OpenAiChoice first = resp.choices.getFirst();
            String content = (first.message != null && first.message.content != null) ? first.message.content : "";
            List<ToolCall> toolCalls = new ArrayList<>();

            if (first.message != null && first.message.toolCalls != null) {
                for (OpenAiToolCall tc : first.message.toolCalls) {
                    if (tc.function != null && tc.function.name != null) {
                        Map<String, Object> args = parseArguments(tc.function.arguments);
                        toolCalls.add(new ToolCall(tc.function.name, args));
                    }
                }
            }

            Integer tokensUsed = (resp.usage != null) ? resp.usage.totalTokens : null;
            return new ProviderResponse(content, toolCalls, tokensUsed);

        } catch (AiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("{} request failed: {}", getName(), ex.getMessage(), ex);
            throw new AiException("PROVIDER_REQUEST_FAILED", getName() + " request failed: " + ex.getMessage(), ex);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    @Override
    public void streamResponse(
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage,
            Consumer<String> onChunk,
            Consumer<List<ToolCall>> onCompleteWithTools,
            Consumer<Throwable> onError
    ) {
        if (!hasApiKey()) {
            onError.accept(new AiException("API_KEY_MISSING", getName() + " API key is not configured"));
            return;
        }

        Map<String, Object> requestPayload = buildRequestPayload(systemInstruction, history, userMessage, true);
        String baseUrl = normalizeBaseUrl(getBaseUrl());
        String urlString = baseUrl + "/chat/completions";

        HttpURLConnection conn = null;
        try {
            URL url = URI.create(urlString).toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
            conn.setRequestProperty(HttpHeaders.ACCEPT, "text/event-stream");
            conn.setRequestProperty(HttpHeaders.AUTHORIZATION, "Bearer " + getApiKey().trim());
            conn.setConnectTimeout(getTimeoutSeconds() * 1000);
            conn.setReadTimeout(getTimeoutSeconds() * 1000);

            byte[] jsonBytes = objectMapper.writeValueAsBytes(requestPayload);
            try (var os = conn.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            if (responseCode >= 400) {
                String errorBody = readStreamSafely(conn.getErrorStream());
                log.warn("{} stream error HTTP {}: {}", getName(), responseCode, errorBody);
                onError.accept(mapHttpError(responseCode, errorBody));
                return;
            }

            // Map index -> tool call accumulator
            Map<Integer, StreamToolCallAccumulator> toolAccumulators = new LinkedHashMap<>();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data: ")) {
                        String jsonChunk = line.substring(6).trim();
                        if ("[DONE]".equalsIgnoreCase(jsonChunk)) {
                            break;
                        }
                        try {
                            OpenAiStreamChunk chunk = objectMapper.readValue(jsonChunk, OpenAiStreamChunk.class);
                            if (chunk != null && chunk.choices != null && !chunk.choices.isEmpty()) {
                                OpenAiStreamChoice choice = chunk.choices.getFirst();
                                if (choice.delta != null) {
                                    if (choice.delta.content != null && !choice.delta.content.isEmpty()) {
                                        onChunk.accept(choice.delta.content);
                                    }
                                    if (choice.delta.toolCalls != null) {
                                        for (OpenAiStreamToolCall tc : choice.delta.toolCalls) {
                                            int idx = tc.index != null ? tc.index : 0;
                                            StreamToolCallAccumulator acc = toolAccumulators.computeIfAbsent(idx, k -> new StreamToolCallAccumulator());
                                            if (tc.function != null) {
                                                if (tc.function.name != null) {
                                                    acc.name = tc.function.name;
                                                }
                                                if (tc.function.arguments != null) {
                                                    acc.argumentsBuilder.append(tc.function.arguments);
                                                }
                                            }
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

            List<ToolCall> completedTools = new ArrayList<>();
            for (StreamToolCallAccumulator acc : toolAccumulators.values()) {
                if (acc.name != null && !acc.name.isBlank()) {
                    Map<String, Object> args = parseArguments(acc.argumentsBuilder.toString());
                    completedTools.add(new ToolCall(acc.name, args));
                }
            }

            onCompleteWithTools.accept(completedTools);

        } catch (Throwable ex) {
            log.error("{} stream failed: {}", getName(), ex.getMessage(), ex);
            onError.accept(new AiException("STREAM_FAILED", getName() + " stream failed: " + ex.getMessage(), ex));
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static class StreamToolCallAccumulator {
        String name;
        StringBuilder argumentsBuilder = new StringBuilder();
    }

    private Map<String, Object> buildRequestPayload(
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage,
            boolean stream
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", getModel());
        payload.put("stream", stream);

        List<Map<String, Object>> messages = new ArrayList<>();
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemInstruction));
        }

        if (history != null) {
            for (ChatMessage msg : history) {
                String role = "user".equalsIgnoreCase(msg.role()) ? "user" : "assistant";
                messages.add(Map.of("role", role, "content", msg.content() != null ? msg.content() : ""));
            }
        }

        if (userMessage != null && !userMessage.isBlank()) {
            messages.add(Map.of("role", "user", "content", userMessage));
        }
        payload.put("messages", messages);

        // Convert tool definitions to OpenAI format
        List<Map<String, Object>> tools = new ArrayList<>();
        for (AiToolRegistry.ToolDefinition def : toolRegistry.getAllTools()) {
            Map<String, Object> func = new LinkedHashMap<>();
            func.put("name", def.name());
            func.put("description", def.description());
            func.put("parameters", def.schema());
            tools.add(Map.of("type", "function", "function", func));
        }

        if (!tools.isEmpty()) {
            payload.put("tools", tools);
            payload.put("tool_choice", "auto");
        }

        if (getMaxOutputTokens() > 0) {
            payload.put("max_tokens", getMaxOutputTokens());
        }

        return payload;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseArguments(String argumentsJson) {
        if (argumentsJson == null || argumentsJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(argumentsJson, Map.class);
        } catch (Exception ex) {
            log.warn("Failed to parse tool call arguments '{}': {}", argumentsJson, ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private String normalizeBaseUrl(String url) {
        if (url == null) return "https://api.xah.io/v1";
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String readStreamSafely(InputStream stream) {
        if (stream == null) return "";
        try {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return "";
        }
    }

    private AiException mapHttpError(int statusCode, String errorBody) {
        String msg = "HTTP " + statusCode;
        if (errorBody != null && !errorBody.isBlank()) {
            msg += ": " + errorBody;
        }

        if (statusCode == 401 || statusCode == 403) {
            return new AiException("AUTH_ERROR", getName() + " authentication failed: " + msg);
        } else if (statusCode == 429) {
            return new AiException("RATE_LIMIT", getName() + " rate limit or quota exceeded: " + msg);
        } else if (statusCode >= 500) {
            return new AiException("SERVER_ERROR", getName() + " upstream server error: " + msg);
        } else {
            return new AiException("PROVIDER_ERROR", getName() + " error: " + msg);
        }
    }

    // JSON DTOs for OpenAI response parsing
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiChatResponse {
        public List<OpenAiChoice> choices;
        public OpenAiUsage usage;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiChoice {
        public OpenAiMessage message;
        @JsonProperty("finish_reason")
        public String finishReason;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiMessage {
        public String role;
        public String content;
        @JsonProperty("tool_calls")
        public List<OpenAiToolCall> toolCalls;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiToolCall {
        public String id;
        public String type;
        public OpenAiFunction function;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiFunction {
        public String name;
        public String arguments;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiUsage {
        @JsonProperty("prompt_tokens")
        public Integer promptTokens;
        @JsonProperty("completion_tokens")
        public Integer completionTokens;
        @JsonProperty("total_tokens")
        public Integer totalTokens;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiStreamChunk {
        public List<OpenAiStreamChoice> choices;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiStreamChoice {
        public OpenAiStreamDelta delta;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiStreamDelta {
        public String role;
        public String content;
        @JsonProperty("tool_calls")
        public List<OpenAiStreamToolCall> toolCalls;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpenAiStreamToolCall {
        public Integer index;
        public OpenAiFunction function;
    }
}
