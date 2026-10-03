package com.smartschedule.ai.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.VisionDtos;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.VisionResult;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.ai.infrastructure.VisionResultRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;

@Service
public class VisionGatewayService {
    private static final Logger log = LoggerFactory.getLogger(VisionGatewayService.class);
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private final VisionResultRepository visionResultRepository;
    private final AiConversationRepository conversationRepository;
    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public VisionGatewayService(
            VisionResultRepository visionResultRepository,
            AiConversationRepository conversationRepository,
            AiProperties aiProperties,
            ObjectMapper objectMapper
    ) {
        this.visionResultRepository = visionResultRepository;
        this.conversationRepository = conversationRepository;
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(60));

        this.restClient = RestClient.builder()
                .baseUrl(aiProperties.visionServerUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Transactional
    public VisionDtos.VisionAnalysisResponse analyzeImage(
            User user,
            MultipartFile file,
            String instruction,
            String mode,
            UUID conversationId
    ) {
        if (file == null || file.isEmpty()) {
            throw new AiException("EMPTY_FILE", "Vui lòng chọn hình ảnh thời khóa biểu hoặc tài liệu cần phân tích.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AiException("FILE_TOO_LARGE", "Kích thước ảnh vượt quá giới hạn 10MB cho phép.");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("image/")) {
            throw new AiException("INVALID_FILE_TYPE", "Định dạng file không hợp lệ. Chỉ chấp nhận các file hình ảnh (PNG, JPG, WEBP).");
        }

        AiConversation conversation = null;
        if (conversationId != null) {
            conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                    .orElse(null);
        }

        // Timezone validation guard: ensure user timezone is respected
        String userTz = (user.getTimezone() != null && !user.getTimezone().isBlank())
                ? user.getTimezone()
                : "Asia/Ho_Chi_Minh";
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(userTz);
        } catch (Exception e) {
            zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        }

        try {
            byte[] fileBytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.png";

            ByteArrayResource resource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", resource);
            if (instruction != null && !instruction.isBlank()) {
                body.add("instruction", instruction);
            }
            body.add("mode", mode != null ? mode.toUpperCase() : "TIMETABLE");
            body.add("user_id", user.getId().toString());

            log.info("Sending image to Vision Server at {} for user {}", aiProperties.visionServerUrl(), user.getId());

            VisionDtos.VisionServerRawResponse raw = restClient.post()
                    .uri("/v1/vision/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(VisionDtos.VisionServerRawResponse.class);

            if (raw == null) {
                throw new AiException("VISION_SERVER_ERROR", "Không nhận được phản hồi từ dịch vụ Vision Server.");
            }

            UUID resultId;
            try {
                resultId = UUID.fromString(raw.resultId());
            } catch (Exception e) {
                resultId = UUID.randomUUID();
            }

            Map<String, Object> payloadMap = new LinkedHashMap<>();
            payloadMap.put("events", raw.events() != null ? raw.events() : List.of());
            payloadMap.put("tasks", raw.tasks() != null ? raw.tasks() : List.of());
            payloadMap.put("deadlines", raw.deadlines() != null ? raw.deadlines() : List.of());
            payloadMap.put("timezone", zoneId.getId());

            String payloadJson = objectMapper.writeValueAsString(payloadMap);
            String warningsJson = objectMapper.writeValueAsString(raw.warnings() != null ? raw.warnings() : List.of());

            VisionResult entity = new VisionResult(
                    resultId,
                    user,
                    conversation,
                    raw.documentType(),
                    raw.provider(),
                    raw.model(),
                    raw.confidence(),
                    raw.summary(),
                    raw.rawText(),
                    payloadJson,
                    warningsJson,
                    Instant.now().plusSeconds(86400) // 24 hour TTL
            );

            visionResultRepository.save(entity);

            return new VisionDtos.VisionAnalysisResponse(
                    resultId,
                    raw.documentType(),
                    raw.provider(),
                    raw.model(),
                    raw.confidence(),
                    raw.events() != null ? raw.events() : List.of(),
                    raw.tasks() != null ? raw.tasks() : List.of(),
                    raw.deadlines() != null ? raw.deadlines() : List.of(),
                    raw.summary(),
                    raw.warnings() != null ? raw.warnings() : List.of(),
                    entity.getCreatedAt()
            );

        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Vision Server analysis failed: {}", e.getMessage(), e);
            throw new AiException("VISION_ANALYSIS_FAILED", "Không thể phân tích ảnh: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public VisionDtos.VisionAnalysisResponse getResult(User user, UUID resultId) {
        VisionResult entity = visionResultRepository.findByIdAndUserId(resultId, user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy kết quả phân tích thị giác tương ứng."));

        List<VisionDtos.VisionEventDto> events = List.of();
        List<VisionDtos.VisionTaskDto> tasks = List.of();
        List<VisionDtos.VisionDeadlineDto> deadlines = List.of();
        List<String> warnings = List.of();

        try {
            Map<String, Object> payload = objectMapper.readValue(entity.getPayloadJson(), new TypeReference<>() {});
            if (payload.containsKey("events")) {
                events = objectMapper.convertValue(payload.get("events"), new TypeReference<>() {});
            }
            if (payload.containsKey("tasks")) {
                tasks = objectMapper.convertValue(payload.get("tasks"), new TypeReference<>() {});
            }
            if (payload.containsKey("deadlines")) {
                deadlines = objectMapper.convertValue(payload.get("deadlines"), new TypeReference<>() {});
            }
            if (entity.getWarningsJson() != null) {
                warnings = objectMapper.readValue(entity.getWarningsJson(), new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to parse stored payload JSON: {}", e.getMessage());
        }

        return new VisionDtos.VisionAnalysisResponse(
                entity.getId(),
                entity.getDocumentType(),
                entity.getProvider(),
                entity.getModel(),
                entity.getConfidence(),
                events,
                tasks,
                deadlines,
                entity.getSummary(),
                warnings,
                entity.getCreatedAt()
        );
    }

    @Transactional
    public void submitFeedback(User user, VisionDtos.VisionFeedbackRequest request) {
        visionResultRepository.findByIdAndUserId(request.resultId(), user.getId())
                .orElseThrow(() -> new AiException("NOT_FOUND", "Không tìm thấy kết quả phân tích để gửi phản hồi."));

        try {
            restClient.post()
                    .uri("/v1/vision/feedback")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to forward vision feedback to server: {}", e.getMessage());
        }
    }
}
