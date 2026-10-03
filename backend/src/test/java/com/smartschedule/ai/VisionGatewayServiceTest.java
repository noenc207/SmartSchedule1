package com.smartschedule.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.api.VisionDtos;
import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.VisionGatewayService;
import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.domain.VisionResult;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.ai.infrastructure.VisionResultRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VisionGatewayServiceTest {

    @Mock private VisionResultRepository visionResultRepository;
    @Mock private AiConversationRepository conversationRepository;

    private VisionGatewayService gatewayService;
    private ObjectMapper objectMapper;
    private User testUser;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        AiProperties properties = new AiProperties(
                "dummy-key", "gemini-3.8-flash", 2000, 1024, 20, 30, "http://localhost:8090"
        );
        gatewayService = new VisionGatewayService(
                visionResultRepository,
                conversationRepository,
                properties,
                objectMapper
        );

        testUser = new User("student@fpt.edu.vn", "hashed", "Nguyen Van A");
        testUser.updateProfile("Nguyen Van A", "Asia/Ho_Chi_Minh", "vi", null);
    }

    @Test
    void testAnalyzeImage_emptyFile_throwsAiException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> gatewayService.analyzeImage(testUser, emptyFile, null, "TIMETABLE", null))
                .isInstanceOf(AiException.class)
                .satisfies(e -> assertThat(((AiException) e).getCode()).isEqualTo("EMPTY_FILE"));
    }

    @Test
    void testAnalyzeImage_invalidFileType_throwsAiException() {
        MockMultipartFile textFile = new MockMultipartFile("file", "doc.txt", "text/plain", "hello".getBytes());

        assertThatThrownBy(() -> gatewayService.analyzeImage(testUser, textFile, null, "TIMETABLE", null))
                .isInstanceOf(AiException.class)
                .satisfies(e -> assertThat(((AiException) e).getCode()).isEqualTo("INVALID_FILE_TYPE"));
    }

    @Test
    void testAnalyzeImage_fileTooLarge_throwsAiException() {
        byte[] largeBytes = new byte[11 * 1024 * 1024]; // 11MB
        MockMultipartFile largeFile = new MockMultipartFile("file", "huge.jpg", "image/jpeg", largeBytes);

        assertThatThrownBy(() -> gatewayService.analyzeImage(testUser, largeFile, null, "TIMETABLE", null))
                .isInstanceOf(AiException.class)
                .satisfies(e -> assertThat(((AiException) e).getCode()).isEqualTo("FILE_TOO_LARGE"));
    }

    @Test
    void testGetResult_notFound_throwsAiException() {
        UUID randomId = UUID.randomUUID();
        when(visionResultRepository.findByIdAndUserId(randomId, testUser.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gatewayService.getResult(testUser, randomId))
                .isInstanceOf(AiException.class)
                .satisfies(e -> assertThat(((AiException) e).getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void testGetResult_success() {
        UUID resultId = UUID.randomUUID();
        VisionResult entity = new VisionResult(
                resultId,
                testUser,
                null,
                "TIMETABLE",
                "paddleocr-vl-1.5",
                "PaddleOCR-VL-v1.5",
                0.95,
                "Nhận diện 3 môn học",
                "Raw text",
                "{\"events\":[{\"title\":\"Toán\",\"day_of_week\":\"Thứ Hai\",\"start_time\":\"08:00\",\"end_time\":\"09:30\",\"confidence\":0.95}],\"tasks\":[],\"deadlines\":[]}",
                "[]",
                Instant.now().plusSeconds(3600)
        );

        when(visionResultRepository.findByIdAndUserId(resultId, testUser.getId())).thenReturn(Optional.of(entity));

        VisionDtos.VisionAnalysisResponse res = gatewayService.getResult(testUser, resultId);
        assertThat(res.resultId()).isEqualTo(resultId);
        assertThat(res.documentType()).isEqualTo("TIMETABLE");
        assertThat(res.provider()).isEqualTo("paddleocr-vl-1.5");
        assertThat(res.events()).hasSize(1);
        assertThat(res.events().get(0).title()).isEqualTo("Toán");
        assertThat(res.events().get(0).startTime()).isEqualTo("08:00");
    }

    @Test
    void testSubmitFeedback_notFound_throwsAiException() {
        UUID resultId = UUID.randomUUID();
        VisionDtos.VisionFeedbackRequest req = new VisionDtos.VisionFeedbackRequest(
                resultId, true, Map.of(), "Good"
        );
        when(visionResultRepository.findByIdAndUserId(resultId, testUser.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gatewayService.submitFeedback(testUser, req))
                .isInstanceOf(AiException.class)
                .satisfies(e -> assertThat(((AiException) e).getCode()).isEqualTo("NOT_FOUND"));
    }
}
