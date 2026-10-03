package com.smartschedule.integration.google.api;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.*;
import com.smartschedule.integration.google.application.GoogleCalendarService;
import com.smartschedule.integration.google.application.GoogleSheetsService;
import com.smartschedule.integration.google.application.GoogleSyncService;
import com.smartschedule.integration.google.application.GoogleWorkspaceAuthService;
import com.smartschedule.user.domain.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/integrations/google", "/api/integrations/google"})
public class GoogleWorkspaceController {

    private final GoogleWorkspaceAuthService authService;
    private final GoogleSheetsService sheetsService;
    private final GoogleCalendarService calendarService;
    private final GoogleSyncService syncService;
    private final CurrentUserService currentUserService;

    public GoogleWorkspaceController(GoogleWorkspaceAuthService authService,
                                     GoogleSheetsService sheetsService,
                                     GoogleCalendarService calendarService,
                                     GoogleSyncService syncService,
                                     CurrentUserService currentUserService) {
        this.authService = authService;
        this.sheetsService = sheetsService;
        this.calendarService = calendarService;
        this.syncService = syncService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/status")
    public ResponseEntity<ConnectionStatusResponse> getStatus() {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(authService.getConnectionStatus(user));
    }

    @PostMapping("/connect")
    public ResponseEntity<ConnectionStatusResponse> connect(@RequestBody ConnectWorkspaceRequest request) {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(authService.connect(user, request));
    }

    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect() {
        User user = currentUserService.requireUser();
        authService.disconnect(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/calendars")
    public ResponseEntity<List<GoogleCalendarDto>> listCalendars() {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(calendarService.listCalendars(user));
    }

    @PostMapping("/sheets/analyze")
    public ResponseEntity<SheetAnalysisResponse> analyzeSheet(@RequestBody SheetAnalysisRequest request) {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(sheetsService.analyzeSpreadsheet(user, request.spreadsheetUrl(), request.sheetName()));
    }

    @PostMapping("/sheets/import")
    public ResponseEntity<SyncResponse> importSheetEvents(@RequestBody BatchImportSheetRequest request) {
        User user = currentUserService.requireUser();
        boolean skipConflicts = Boolean.TRUE.equals(request.skipConflicts());
        return ResponseEntity.ok(syncService.importSheetEvents(user, request.spreadsheetId(), request.events(), skipConflicts));
    }

    @PostMapping("/calendar/prepare")
    public ResponseEntity<CalendarImportResponse> prepareCalendarImport(@RequestBody CalendarImportRequest request) {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(calendarService.prepareCalendarImport(user, request.calendarId(), request.daysAhead()));
    }

    @PostMapping("/calendar/import")
    public ResponseEntity<SyncResponse> importCalendarEvents(@RequestBody BatchImportCalendarRequest request) {
        User user = currentUserService.requireUser();
        boolean skipConflicts = Boolean.TRUE.equals(request.skipConflicts());
        return ResponseEntity.ok(syncService.importCalendarEvents(user, request.calendarId(), request.events(), skipConflicts));
    }

    @PostMapping("/calendar/export")
    public ResponseEntity<CalendarExportResponse> exportCalendarEvent(@RequestBody CalendarExportRequest request) {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(calendarService.exportEvent(user, request.smartEventId(), request.calendarId()));
    }
}
