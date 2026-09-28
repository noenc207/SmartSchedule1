package com.smartschedule.portal.api;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.portal.api.PortalDtos.*;
import com.smartschedule.portal.application.PortalImportService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}/import/portal")
public class PortalImportController {
    private final PortalImportService importService;
    private final CurrentUserService currentUser;

    public PortalImportController(PortalImportService importService, CurrentUserService currentUser) {
        this.importService = importService;
        this.currentUser = currentUser;
    }

    @PostMapping("/preview")
    public PortalImportPreviewResponse preview(
            @PathVariable UUID scheduleId,
            @Valid @RequestBody PortalImportPreviewRequest request) {
        return importService.preview(scheduleId, request, currentUser.requireUser().getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PortalImportSubmitResponse importSchedule(
            @PathVariable UUID scheduleId,
            @Valid @RequestBody PortalImportSubmitRequest request) {
        return importService.importSchedule(scheduleId, request, currentUser.requireUser().getId());
    }

    @GetMapping("/history")
    public List<PortalImportHistoryResponse> getHistory(@PathVariable UUID scheduleId) {
        return importService.getImportHistory(scheduleId, currentUser.requireUser().getId());
    }
}
