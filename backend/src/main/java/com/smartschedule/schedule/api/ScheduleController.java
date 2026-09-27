package com.smartschedule.schedule.api;

import com.smartschedule.schedule.api.ScheduleDtos.*;
import com.smartschedule.schedule.application.ScheduleService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduleController {
    private final ScheduleService service;
    public ScheduleController(ScheduleService service) { this.service = service; }
    @GetMapping public List<ScheduleSummaryResponse> list() { return service.list(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ScheduleResponse create(@Valid @RequestBody CreateScheduleRequest r) { return service.create(r); }
    @GetMapping("/{id}") public ScheduleResponse get(@PathVariable UUID id) { return service.get(id); }
    @PutMapping("/{id}") public ScheduleResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateScheduleRequest r) { return service.update(id, r); }
    @PatchMapping("/{id}") public ScheduleResponse patch(@PathVariable UUID id, @Valid @RequestBody UpdateScheduleRequest r) { return service.update(id, r); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}
