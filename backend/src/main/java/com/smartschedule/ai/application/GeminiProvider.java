package com.smartschedule.ai.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.config.AiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public GeminiProvider(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(properties.timeoutSeconds()));
        factory.setReadTimeout(Duration.ofSeconds(properties.timeoutSeconds()));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage) {
        ensureApiKeyConfigured();

        String model = properties.geminiModel();
        String apiKey = properties.geminiApiKey().trim();
        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                model, apiKey);

        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, true);

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
            handleRestException(ex);
            throw new AiException("GEMINI_ERROR", "Lỗi xử lý AI: " + ex.getMessage());
        } catch (AiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Lỗi khi kết nối Google Gemini API: {}", ex.getMessage());
            throw new AiException("CONNECTION_ERROR", "Không thể kết nối đến Google Gemini API. Vui lòng thử lại sau.");
        }
    }

    @Override
    public void streamResponse(String systemInstruction, List<ChatMessage> history, String userMessage,
                               Consumer<String> onChunk, Runnable onComplete, Consumer<Throwable> onError) {
        ensureApiKeyConfigured();

        String model = properties.geminiModel();
        String apiKey = properties.geminiApiKey().trim();
        String urlString = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse",
                model, apiKey);

        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, false);

        try {
            URL url = URI.create(urlString).toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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
                log.warn("Gemini stream error HTTP {}: {}", responseCode, errorBody);
                if (responseCode == 429) {
                    throw new AiException("QUOTA_EXCEEDED", "Gemini API đang bị quá hạn mức (Quota Exceeded). Vui lòng thử lại sau.");
                } else if (responseCode == 400 || responseCode == 403) {
                    throw new AiException("INVALID_KEY", "Khóa Gemini API không hợp lệ hoặc không có quyền truy cập.");
                }
                throw new AiException("GEMINI_ERROR", "Gemini trả về lỗi HTTP " + responseCode);
            }

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
                                    }
                                }
                            }
                        } catch (Exception parseEx) {
                            log.debug("Could not parse SSE chunk: {}", parseEx.getMessage());
                        }
                    }
                }
            }

            onComplete.run();
        } catch (Throwable ex) {
            log.error("Streaming error from Gemini: {}", ex.getMessage());
            onError.accept(ex);
        }
    }

    private void ensureApiKeyConfigured() {
        if (!properties.hasApiKey()) {
            throw new AiException("MISSING_API_KEY",
                    "Gemini API key chưa được cấu hình trên server. Vui lòng thiết lập GEMINI_API_KEY trong environment.");
        }
    }

    private void handleRestException(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String body = ex.getResponseBodyAsString();
        log.warn("Gemini API error HTTP {}: {}", status, body);

        if (status == 429) {
            throw new AiException("QUOTA_EXCEEDED", "Gemini API đang bị quá giới hạn hạn mức (Quota Exceeded). Vui lòng thử lại sau ít phút.");
        } else if (status == 400 || status == 403) {
            throw new AiException("INVALID_KEY", "Khóa Gemini API không hợp lệ hoặc không được phép gọi model.");
        } else if (status >= 500) {
            throw new AiException("SERVER_ERROR", "Dịch vụ Google AI tạm thời gián đoạn. Vui lòng thử lại sau.");
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

        // Read-only tools
        if (includeTools) {
            payload.put("tools", List.of(
                    Map.of("function_declarations", List.of(
                            Map.of(
                                    "name", "get_today_schedule",
                                    "description", "Lấy toàn bộ danh sách lớp học và sự kiện trong ngày hôm nay của người dùng.",
                                    "parameters", Map.of("type", "OBJECT", "properties", Map.of())
                            ),
                            Map.of(
                                    "name", "get_upcoming_schedule",
                                    "description", "Lấy toàn bộ lịch trình các lớp học và sự kiện sắp tới trong 7 ngày tiếp theo.",
                                    "parameters", Map.of("type", "OBJECT", "properties", Map.of())
                            ),
                            Map.of(
                                    "name", "find_free_time",
                                    "description", "Tìm các khoảng thời gian trống giữa các tiết học và cam kết hôm nay để người dùng sắp xếp ôn tập hoặc nghỉ ngơi.",
                                    "parameters", Map.of("type", "OBJECT", "properties", Map.of())
                            )
                    ))
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
