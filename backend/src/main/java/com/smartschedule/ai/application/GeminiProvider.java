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

        String apiKey = properties.geminiApiKey().trim();
        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, true);
        List<String> candidateModels = getCandidateModels();

        Throwable lastException = null;

        for (int modelIndex = 0; modelIndex < candidateModels.size(); modelIndex++) {
            String model = candidateModels.get(modelIndex);
            int maxAttempts = (modelIndex == 0) ? 3 : 2;

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
                    log.warn("Gemini generateContent error (model={}, attempt={}/{}): HTTP {}: {}",
                            model, attempt, maxAttempts, status, body);

                    if (isRetriableStatus(status) && (attempt < maxAttempts || modelIndex < candidateModels.size() - 1)) {
                        sleepWithBackoff(attempt);
                        continue;
                    }
                    lastException = mapHttpResponseToAiException(status, body);
                    if (!isRetriableStatus(status)) {
                        break; // Non-retriable client error (e.g. 401/403)
                    }
                } catch (AiException ex) {
                    if ("EMPTY_RESPONSE".equals(ex.getCode()) && (attempt < maxAttempts || modelIndex < candidateModels.size() - 1)) {
                        sleepWithBackoff(attempt);
                        continue;
                    }
                    lastException = ex;
                } catch (Exception ex) {
                    log.warn("Gemini generateContent connection error (model={}, attempt={}/{}): {}",
                            model, attempt, maxAttempts, ex.getMessage());
                    if (attempt < maxAttempts || modelIndex < candidateModels.size() - 1) {
                        sleepWithBackoff(attempt);
                        continue;
                    }
                    lastException = ex;
                }
            }
        }

        if (lastException instanceof AiException aiEx) {
            throw aiEx;
        }
        log.error("All Gemini generateContent retry attempts and fallback models exhausted. Last error: {}",
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

        String apiKey = properties.geminiApiKey().trim();
        List<String> candidateModels = getCandidateModels();
        Map<String, Object> requestPayload = buildGeminiPayload(systemInstruction, history, userMessage, true);

        Throwable lastException = null;

        for (int modelIndex = 0; modelIndex < candidateModels.size(); modelIndex++) {
            String model = candidateModels.get(modelIndex);
            int maxAttempts = (modelIndex == 0) ? 3 : 2;

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
                        log.warn("Gemini stream error (model={}, attempt={}/{}): HTTP {}: {}",
                                model, attempt, maxAttempts, responseCode, errorBody);

                        boolean isRetriable = isRetriableStatus(responseCode);
                        if (isRetriable && (attempt < maxAttempts || modelIndex < candidateModels.size() - 1)) {
                            sleepWithBackoff(attempt);
                            continue;
                        }

                        AiException mapped = mapHttpResponseToAiException(responseCode, errorBody);
                        if (!isRetriable) {
                            onError.accept(mapped);
                            return;
                        }
                        lastException = mapped;
                        continue;
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
                    if (!"SERVER_OVERLOADED".equals(ex.getCode()) && !"SERVER_ERROR".equals(ex.getCode()) && !"QUOTA_EXCEEDED".equals(ex.getCode())) {
                        onError.accept(ex);
                        return;
                    }
                } catch (Exception ex) {
                    log.warn("Gemini stream connection error (model={}, attempt={}/{}): {}",
                            model, attempt, maxAttempts, ex.getMessage());
                    lastException = ex;
                    if (attempt < maxAttempts || modelIndex < candidateModels.size() - 1) {
                        sleepWithBackoff(attempt);
                    }
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        }

        log.error("All Gemini stream retry attempts and fallback models exhausted. Last error: {}",
                lastException != null ? lastException.getMessage() : "Unknown");
        if (lastException instanceof AiException aiEx) {
            onError.accept(aiEx);
        } else {
            onError.accept(new AiException("SERVER_OVERLOADED",
                    "Máy chủ Google AI đang tạm thời quá tải hoặc bận trong giây lát. Bạn vui lòng thử lại sau ít giây nhé!"));
        }
    }

    private List<String> getCandidateModels() {
        List<String> list = new ArrayList<>();
        String configured = properties.geminiModel();
        if (configured != null && !configured.isBlank()) {
            list.add(configured.trim());
        }
        List<String> fallbacks = List.of("gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash");
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
        if (!properties.hasApiKey()) {
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

        // Read & Write Tools declarations
        if (includeTools) {
            payload.put("tools", List.of(
                    Map.of("function_declarations", List.of(
                            // 1. Read: Today's schedule
                            Map.of(
                                    "name", "get_today_schedule",
                                    "description", "Lấy toàn bộ danh sách lớp học và sự kiện trong ngày hôm nay của người dùng.",
                                    "parameters", Map.of("type", "OBJECT", "properties", Map.of())
                            ),
                            // 2. Read: Upcoming schedule
                            Map.of(
                                    "name", "get_upcoming_schedule",
                                    "description", "Lấy toàn bộ lịch trình các lớp học và sự kiện sắp tới trong các ngày tiếp theo.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "days", Map.of("type", "INTEGER", "description", "Số ngày cần xem (mặc định 7 ngày, tối đa 30 ngày)")
                                            )
                                    )
                            ),
                            // 3. Read: Find free time
                            Map.of(
                                    "name", "find_free_time",
                                    "description", "Tìm các khoảng thời gian trống giữa các tiết học và cam kết để người dùng sắp xếp ôn tập, làm việc hoặc nghỉ ngơi.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "date", Map.of("type", "STRING", "description", "Ngày cần tìm giờ rảnh dạng YYYY-MM-DD (mặc định là hôm nay)"),
                                                    "duration_minutes", Map.of("type", "INTEGER", "description", "Thời lượng cần tìm tính theo phút (ví dụ 60, 120)")
                                            )
                                    )
                            ),
                            // 4. Read: Check schedule conflict
                            Map.of(
                                    "name", "check_schedule_conflict",
                                    "description", "Kiểm tra xem một khung thời gian cụ thể có bị trùng lịch hoặc xung đột với các sự kiện hiện có của người dùng không.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu (ISO 8601 hoặc YYYY-MM-DDTHH:mm hoặc HH:mm)"),
                                                    "end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc (ISO 8601 hoặc YYYY-MM-DDTHH:mm hoặc HH:mm)"),
                                                    "exclude_event_id", Map.of("type", "STRING", "description", "ID sự kiện bỏ qua khi kiểm tra trùng")
                                            ),
                                            "required", List.of("start_time", "end_time")
                                    )
                            ),
                            // 5. Read: Get schedule details
                            Map.of(
                                    "name", "get_schedule_details",
                                    "description", "Tra cứu thông tin chi tiết của một sự kiện/tiết học theo tên hoặc mã ID.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "event_id_or_title", Map.of("type", "STRING", "description", "Tên sự kiện hoặc ID sự kiện cần tra cứu")
                                            ),
                                            "required", List.of("event_id_or_title")
                                    )
                            ),
                            // 6. Write: Create schedule
                            Map.of(
                                    "name", "create_schedule",
                                    "description", "Đề xuất tạo mới một sự kiện/lịch học/lịch ôn tập trên thời khóa biểu. CHỈ GỌI CÔNG CỤ NÀY khi người dùng ĐÃ CUNG CẤP ĐỦ: tên sự kiện, ngày diễn ra, giờ bắt đầu và thời lượng (hoặc giờ kết thúc). NẾU THIẾU giờ bắt đầu hoặc thiếu cả (thời lượng và giờ kết thúc), TUYỆT ĐỐI KHÔNG GỌI TOOL mà phải hỏi người dùng để làm rõ. TUYỆT ĐỐI KHÔNG tự bịa giờ học, địa điểm hoặc mô tả.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "title", Map.of("type", "STRING", "description", "Tên môn học hoặc sự kiện người dùng đã chỉ định (ví dụ: Physics, Ôn thi Giải tích)"),
                                                    "date", Map.of("type", "STRING", "description", "Ngày diễn ra định dạng YYYY-MM-DD (người dùng nói hoặc suy từ ngày đang xem)"),
                                                    "start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu người dùng đã chỉ định (ví dụ: 08:00, 14:30)"),
                                                    "end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc nếu người dùng đã chỉ định (ví dụ: 09:30, 16:00)"),
                                                    "duration_minutes", Map.of("type", "INTEGER", "description", "Thời lượng bằng phút nếu người dùng đã chỉ định (ví dụ: 60, 90, 120)"),
                                                    "location", Map.of("type", "STRING", "description", "Địa điểm hoặc phòng học NẾU VÀ CHỈ NẾU người dùng đã đề cập. Để trống/null nếu không có."),
                                                    "description", Map.of("type", "STRING", "description", "Ghi chú hoặc mô tả NẾU người dùng đã đề cập. Để trống/null nếu không có.")
                                            ),
                                            "required", List.of("title", "date", "start_time")
                                    )
                            ),
                            // 7. Write: Update schedule
                            Map.of(
                                    "name", "update_schedule",
                                    "description", "Đề xuất cập nhật tiêu đề, thời gian, phòng học hoặc mô tả của một sự kiện đã có. Cần người dùng xác nhận trước khi thực thi.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần cập nhật"),
                                                    "title", Map.of("type", "STRING", "description", "Tên sự kiện để tìm hoặc đổi tên mới"),
                                                    "start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu mới"),
                                                    "end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc mới"),
                                                    "location", Map.of("type", "STRING", "description", "Phòng học hoặc địa điểm mới"),
                                                    "description", Map.of("type", "STRING", "description", "Mô tả mới")
                                            )
                                    )
                            ),
                            // 8. Write: Delete schedule
                            Map.of(
                                    "name", "delete_schedule",
                                    "description", "Đề xuất xóa một sự kiện/tiết học khỏi lịch trình. Cần người dùng xác nhận trước khi thực thi.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần xóa"),
                                                    "title", Map.of("type", "STRING", "description", "Tên sự kiện cần xóa nếu không có ID")
                                            )
                                    )
                            ),
                            // 9. Write: Reschedule event
                            Map.of(
                                    "name", "reschedule_event",
                                    "description", "Đề xuất dời thời gian của một sự kiện đã có sang một khung giờ hoặc ngày khác. Cần người dùng xác nhận trước khi thực thi.",
                                    "parameters", Map.of(
                                            "type", "OBJECT",
                                            "properties", Map.of(
                                                    "event_id", Map.of("type", "STRING", "description", "ID sự kiện cần dời"),
                                                    "title", Map.of("type", "STRING", "description", "Tên sự kiện cần dời"),
                                                    "new_start_time", Map.of("type", "STRING", "description", "Thời gian bắt đầu mới"),
                                                    "new_end_time", Map.of("type", "STRING", "description", "Thời gian kết thúc mới"),
                                                    "date", Map.of("type", "STRING", "description", "Ngày mới dạng YYYY-MM-DD nếu dời sang ngày khác")
                                            ),
                                            "required", List.of("new_start_time")
                                    )
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
