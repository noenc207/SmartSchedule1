package com.smartschedule.ai.api;

import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.VisionGatewayService;
import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.user.domain.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/ai/vision", "/api/ai/vision"})
public class AiVisionController {

    private final VisionGatewayService visionGatewayService;
    private final CurrentUserService currentUserService;

    public AiVisionController(VisionGatewayService visionGatewayService, CurrentUserService currentUserService) {
        this.visionGatewayService = visionGatewayService;
        this.currentUserService = currentUserService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<VisionDtos.VisionAnalysisResponse> analyzeImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "instruction", required = false) String instruction,
            @RequestParam(value = "mode", required = false) String mode,
            @RequestParam(value = "conversation_id", required = false) UUID conversationId
    ) {
        User user = currentUserService.requireUser();
        VisionDtos.VisionAnalysisResponse response = visionGatewayService.analyzeImage(
                user, file, instruction, mode, conversationId
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/results/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<VisionDtos.VisionAnalysisResponse> getResult(@PathVariable UUID id) {
        User user = currentUserService.requireUser();
        VisionDtos.VisionAnalysisResponse response = visionGatewayService.getResult(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/feedback", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> submitFeedback(@RequestBody VisionDtos.VisionFeedbackRequest request) {
        User user = currentUserService.requireUser();
        visionGatewayService.submitFeedback(user, request);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Cảm ơn bạn đã đóng góp phản hồi về kết quả nhận diện thị giác!"
        ));
    }

    @ExceptionHandler(AiException.class)
    public ResponseEntity<Map<String, String>> handleAiException(AiException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case "UNAUTHORIZED" -> HttpStatus.UNAUTHORIZED;
            case "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "EMPTY_FILE", "INVALID_FILE_TYPE", "FILE_TOO_LARGE" -> HttpStatus.BAD_REQUEST;
            case "VISION_SERVER_ERROR", "VISION_ANALYSIS_FAILED" -> HttpStatus.BAD_GATEWAY;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return ResponseEntity.status(status).body(Map.of(
                "code", ex.getCode(),
                "message", ex.getMessage()
        ));
    }
}
