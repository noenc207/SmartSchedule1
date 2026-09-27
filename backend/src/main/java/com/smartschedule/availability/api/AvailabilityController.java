package com.smartschedule.availability.api;

import com.smartschedule.availability.api.AvailabilityDtos.*;
import com.smartschedule.availability.application.AvailabilityService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}/availability")
public class AvailabilityController {
    private final AvailabilityService service;
    public AvailabilityController(AvailabilityService service) { this.service = service; }
    @GetMapping public List<AvailabilityResponse> list(@PathVariable UUID scheduleId) { return service.list(scheduleId); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public AvailabilityResponse create(@PathVariable UUID scheduleId, @Valid @RequestBody AvailabilityRequest r) { return service.create(scheduleId, r); }
    @PutMapping("/{id}") public AvailabilityResponse update(@PathVariable UUID id, @Valid @RequestBody AvailabilityRequest r) { return service.update(id, r); }
    @PatchMapping("/{id}") public AvailabilityResponse patch(@PathVariable UUID id, @Valid @RequestBody AvailabilityRequest r) { return service.update(id, r); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}
