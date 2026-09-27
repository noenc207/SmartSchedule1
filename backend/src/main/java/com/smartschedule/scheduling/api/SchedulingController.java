package com.smartschedule.scheduling.api;

import com.smartschedule.event.domain.Event;
import com.smartschedule.scheduling.api.SchedulingDtos.*;
import com.smartschedule.scheduling.application.SchedulingService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}/scheduling")
public class SchedulingController {
    private final SchedulingService service;
    public SchedulingController(SchedulingService service) { this.service = service; }
    @PostMapping("/generate")
    public Plan generate(@PathVariable UUID scheduleId, @Valid @RequestBody GenerateRequest request) {
        return service.generate(scheduleId, request);
    }
    @PostMapping("/validate")
    public ValidationResponse validate(@PathVariable UUID scheduleId, @Valid @RequestBody SchedulingValidationRequest request) {
        return service.validate(scheduleId, request);
    }
    @PostMapping("/apply")
    public Plan apply(@PathVariable UUID scheduleId, @Valid @RequestBody ApplyRequest request) {
        return service.apply(scheduleId, request);
    }
    @GetMapping("/preferences")
    public Preferences preferences(@PathVariable UUID scheduleId) { return service.preferences(scheduleId); }
    @PutMapping("/preferences")
    public Preferences updatePreferences(@PathVariable UUID scheduleId, @Valid @RequestBody Preferences preferences) {
        return service.updatePreferences(scheduleId, preferences);
    }
    @GetMapping("/ai-recommendation")
    public AiPlannerRecommendationDto getAiRecommendation(@PathVariable UUID scheduleId) {
        return service.getAiRecommendation(scheduleId);
    }
    @PostMapping("/apply-quick-slot")
    public Event applyQuickSlot(@PathVariable UUID scheduleId, @Valid @RequestBody ApplyQuickSlotRequest request) {
        return service.applyQuickSlot(scheduleId, request);
    }
    @GetMapping("/academic-summary")
    public AcademicKpiSummaryDto getAcademicSummary(@PathVariable UUID scheduleId) {
        return service.getAcademicSummary(scheduleId);
    }
    @PostMapping("/optimize-pro")
    public com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.OptimizeResponse optimizePro(
            @PathVariable UUID scheduleId, @Valid @RequestBody GenerateRequest request) {
        return service.optimizePro(scheduleId, request);
    }
    @PostMapping("/what-if")
    public com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.WhatIfResponse whatIf(
            @PathVariable UUID scheduleId, @Valid @RequestBody com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.WhatIfRequest request) {
        return service.whatIfPro(scheduleId, request);
    }
    @GetMapping("/mobility-analysis")
    public com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.AnalyzeMobilityResponse analyzeMobility(
            @PathVariable UUID scheduleId) {
        return service.analyzeMobilityPro(scheduleId);
    }
}
