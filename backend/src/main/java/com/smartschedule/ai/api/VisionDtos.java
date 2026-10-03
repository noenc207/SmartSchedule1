package com.smartschedule.ai.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class VisionDtos {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VisionEventDto(
            String title,
            String date,
            @JsonProperty("day_of_week") String dayOfWeek,
            @JsonProperty("start_time") String startTime,
            @JsonProperty("end_time") String endTime,
            @JsonProperty("duration_minutes") Integer durationMinutes,
            String location,
            String description,
            String recurrence,
            double confidence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VisionTaskDto(
            String title,
            @JsonProperty("estimated_minutes") Integer estimatedMinutes,
            String priority,
            String deadline,
            double confidence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VisionDeadlineDto(
            String title,
            @JsonProperty("due_date") String dueDate,
            String priority,
            double confidence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VisionServerRawResponse(
            @JsonProperty("result_id") String resultId,
            @JsonProperty("document_type") String documentType,
            String provider,
            String model,
            double confidence,
            List<VisionEventDto> events,
            List<VisionTaskDto> tasks,
            List<VisionDeadlineDto> deadlines,
            String summary,
            @JsonProperty("raw_text") String rawText,
            List<String> warnings,
            @JsonProperty("created_at") String createdAt
    ) {}

    public record VisionAnalysisResponse(
            UUID resultId,
            String documentType,
            String provider,
            String model,
            double confidence,
            List<VisionEventDto> events,
            List<VisionTaskDto> tasks,
            List<VisionDeadlineDto> deadlines,
            String summary,
            List<String> warnings,
            Instant createdAt
    ) {}

    public record VisionFeedbackRequest(
            UUID resultId,
            boolean accepted,
            Map<String, Object> corrections,
            String userNotes
    ) {}

    public record VisionImportRequest(
            UUID resultId,
            List<Integer> selectedIndices
    ) {}
}
