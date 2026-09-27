package com.smartschedule.rescheduling.api;

import com.smartschedule.rescheduling.application.ReschedulingService;
import com.smartschedule.rescheduling.api.ReschedulingDtos.*;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}")
public class ReschedulingController {
    private final ReschedulingService service;

    public ReschedulingController(ReschedulingService service) {
        this.service = service;
    }

    @PostMapping("/rescheduling/analyze")
    public RescheduleImpact analyze(@PathVariable UUID scheduleId, @Valid @RequestBody ReschedulingRequest request) {
        return service.analyze(scheduleId, request);
    }

    @PostMapping("/rescheduling/generate")
    public RescheduleResult generate(@PathVariable UUID scheduleId, @Valid @RequestBody ReschedulingRequest request) {
        return service.generate(scheduleId, request);
    }

    @PostMapping("/rescheduling/apply")
    public RescheduleResult apply(@PathVariable UUID scheduleId, @RequestBody RescheduleAlternative alternative) {
        return service.apply(scheduleId, alternative);
    }

    @PostMapping("/what-if")
    public WhatIfResult whatIf(@PathVariable UUID scheduleId, @Valid @RequestBody ReschedulingRequest request) {
        return service.whatIf(scheduleId, request);
    }
}
