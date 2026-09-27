package com.smartschedule.availability.api;

import com.smartschedule.availability.api.AvailabilityDtos.*;
import com.smartschedule.availability.application.AvailabilityService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Compatibility surface for clients that use the top-level availability resource.
 * Availability remains schedule-scoped in persistence and requires scheduleId.
 */
@RestController
@RequestMapping("/api/v1/availability")
public class AvailabilityRootController {
    private final AvailabilityService service;
    public AvailabilityRootController(AvailabilityService service) { this.service = service; }
    @GetMapping public List<AvailabilityResponse> list(@RequestParam UUID scheduleId) { return service.list(scheduleId); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public AvailabilityResponse create(@RequestParam UUID scheduleId, @Valid @RequestBody AvailabilityRequest request) { return service.create(scheduleId, request); }
    @PutMapping("/{id}") public AvailabilityResponse update(@PathVariable UUID id, @Valid @RequestBody AvailabilityRequest request) { return service.update(id, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}
