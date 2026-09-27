package com.smartschedule.task.api;

import com.smartschedule.task.api.TaskDtos.*;
import com.smartschedule.task.application.TaskService;
import com.smartschedule.common.web.PageResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class TaskController {
    private final TaskService service;
    public TaskController(TaskService service) { this.service = service; }
    @GetMapping("/api/v1/schedules/{scheduleId}/tasks")
    public PageResponse<TaskResponse> list(@PathVariable UUID scheduleId, @RequestParam(required = false) String status,
                                           @RequestParam(required = false) String priority, @RequestParam(required = false) UUID category,
                                           @RequestParam(required = false) Instant deadlineFrom, @RequestParam(required = false) Instant deadlineTo,
                                           @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return service.list(scheduleId, status, priority, category, deadlineFrom, deadlineTo, PageRequest.of(Math.max(page, 0), safeSize, Sort.by("deadline").ascending()));
    }
    @PostMapping("/api/v1/schedules/{scheduleId}/tasks") @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@PathVariable UUID scheduleId, @Valid @RequestBody TaskRequest r) { return service.create(scheduleId, r); }
    @GetMapping("/api/v1/tasks/{id}") public TaskResponse get(@PathVariable UUID id) { return service.get(id); }
    @PutMapping("/api/v1/tasks/{id}") public TaskResponse update(@PathVariable UUID id, @Valid @RequestBody TaskRequest r) { return service.update(id, r); }
    @PatchMapping("/api/v1/tasks/{id}") public TaskResponse patch(@PathVariable UUID id, @Valid @RequestBody TaskRequest r) { return service.update(id, r); }
    @DeleteMapping("/api/v1/tasks/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}
