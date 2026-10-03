package com.smartschedule.integration.google.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class GoogleWorkspaceDtos {

    public record ConnectionStatusResponse(
            boolean connected,
            String provider,
            String scopes,
            int linkedCalendarsCount,
            Instant connectedAt,
            Instant updatedAt
    ) {}

    public record ConnectWorkspaceRequest(
            String code,
            String redirectUri,
            String accessToken,
            String refreshToken,
            Long expiresIn,
            String scopes
    ) {}

    public record SheetAnalysisRequest(
            String spreadsheetUrl,
            String sheetName
    ) {}

    public record ParsedSheetEventDto(
            String title,
            String date,
            String startTime,
            String endTime,
            String location,
            String instructor,
            Double confidence,
            int sourceRow,
            boolean hasConflict,
            String conflictDetails,
            List<String> missingFields
    ) {}

    public record SheetAnalysisResponse(
            String sourceType,
            String spreadsheetId,
            String sheetName,
            int rowsDetected,
            int eventsDetected,
            int validEvents,
            int missingTimeCount,
            int conflictCount,
            List<ParsedSheetEventDto> events,
            List<String> warnings
    ) {}

    public record GoogleCalendarDto(
            String id,
            String summary,
            String description,
            boolean primary,
            String timeZone
    ) {}

    public record GoogleCalendarEventDto(
            String id,
            String summary,
            String description,
            String location,
            String start,
            String end,
            boolean allDay
    ) {}

    public record CalendarImportRequest(
            String calendarId,
            Integer daysAhead
    ) {}

    public record CalendarImportResponse(
            String calendarId,
            int totalFound,
            int newCount,
            int duplicateCount,
            int conflictCount,
            List<ParsedSheetEventDto> eventsToImport,
            List<String> warnings
    ) {}

    public record CalendarExportRequest(
            UUID smartEventId,
            String calendarId
    ) {}

    public record CalendarExportResponse(
            UUID smartEventId,
            String googleCalendarId,
            String googleEventId,
            String status,
            String message
    ) {}

    public record BatchImportSheetRequest(
            String spreadsheetId,
            List<ParsedSheetEventDto> events,
            Boolean skipConflicts
    ) {}

    public record BatchImportCalendarRequest(
            String calendarId,
            List<ParsedSheetEventDto> events,
            Boolean skipConflicts
    ) {}

    public record SyncResponse(
            int syncedCount,
            int createdCount,
            int updatedCount,
            int conflictCount,
            String message
    ) {}
}
