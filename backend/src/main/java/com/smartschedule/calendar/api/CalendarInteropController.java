package com.smartschedule.calendar.api;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.calendar.api.CalendarInteropDtos.*;
import com.smartschedule.calendar.application.CalendarInteropService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}")
public class CalendarInteropController {
    private final CalendarInteropService service;
    private final CurrentUserService currentUser;

    public CalendarInteropController(CalendarInteropService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping(value = "/export.ics", produces = "text/calendar")
    public ResponseEntity<String> export(@PathVariable UUID scheduleId,
                                         @RequestParam(required = false) Instant from,
                                         @RequestParam(required = false) Instant to) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"smartschedule.ics\"")
                .body(service.export(scheduleId, from, to, currentUser.requireUser().getId()));
    }

    @PostMapping(value = "/import.ics", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportPreview preview(@PathVariable UUID scheduleId, @RequestPart("file") MultipartFile file) {
        return service.preview(file, scheduleId, currentUser.requireUser().getId());
    }

    @PostMapping("/import.ics/confirm")
    public int confirm(@PathVariable UUID scheduleId, @Valid @RequestBody ImportRequest request) {
        return service.importEvents(scheduleId, request, currentUser.requireUser().getId());
    }
}
