package com.smartschedule.integration.google.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.ai.application.AiDateTimeUtils;
import com.smartschedule.common.error.ValidationException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.*;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GoogleSheetsService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSheetsService.class);

    private static final Pattern SPREADSHEET_URL_PATTERN = Pattern.compile(
            "^https://docs\\.google\\.com/spreadsheets/d/([a-zA-Z0-9-_]+)(?:/.*)?$"
    );

    private static final String SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

    private final GoogleWorkspaceAuthService authService;
    private final GoogleSheetsParser sheetsParser;
    private final EventRepository eventRepository;
    private final ScheduleRepository scheduleRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GoogleSheetsService(GoogleWorkspaceAuthService authService,
                               GoogleSheetsParser sheetsParser,
                               EventRepository eventRepository,
                               ScheduleRepository scheduleRepository,
                               ObjectMapper objectMapper) {
        this.authService = authService;
        this.sheetsParser = sheetsParser;
        this.eventRepository = eventRepository;
        this.scheduleRepository = scheduleRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    public String extractSpreadsheetId(String url) {
        if (url == null || url.isBlank()) {
            throw new ValidationException("URL Google Sheets không được để trống.");
        }
        String trimmed = url.trim();

        // SSRF protection: Enforce docs.google.com host only
        try {
            URI uri = URI.create(trimmed);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !"docs.google.com".equalsIgnoreCase(uri.getHost())) {
                throw new ValidationException("URL không hợp lệ. Chỉ chấp nhận liên kết bảng tính từ https://docs.google.com");
            }
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Định dạng URL Google Sheets không hợp lệ.");
        }

        Matcher matcher = SPREADSHEET_URL_PATTERN.matcher(trimmed);
        if (!matcher.matches()) {
            throw new ValidationException("Không tìm thấy SPREADSHEET_ID hợp lệ trong URL: " + trimmed);
        }

        return matcher.group(1);
    }

    @Transactional(readOnly = true)
    public SheetAnalysisResponse analyzeSpreadsheet(User user, String url, String requestedSheetName) {
        String spreadsheetId = extractSpreadsheetId(url);
        ZoneId zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zoneId);

        List<List<Object>> rawRows = null;
        String resolvedSheetName = requestedSheetName;
        List<String> warnings = new ArrayList<>();

        boolean isWorkspaceConnected = authService.hasWorkspaceConnection(user.getId());

        if (isWorkspaceConnected) {
            try {
                String token = authService.getValidAccessToken(user.getId());
                if (resolvedSheetName == null || resolvedSheetName.isBlank()) {
                    resolvedSheetName = fetchFirstSheetName(spreadsheetId, token);
                }
                rawRows = fetchSheetValuesViaApi(spreadsheetId, resolvedSheetName, token);
            } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
                log.warn("OAuth token not authorized for spreadsheet {}, falling back to public check: {}", spreadsheetId, e.getMessage());
            } catch (Exception e) {
                log.warn("API fetch error for spreadsheet {}: {}", spreadsheetId, e.getMessage());
            }
        }

        // Fallback: If not fetched via API, attempt public read-only TSV
        if (rawRows == null) {
            try {
                String tsvUrl = "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=tsv&gid=0";
                ResponseEntity<String> res = restTemplate.getForEntity(tsvUrl, String.class);
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    rawRows = sheetsParser.parseTsvToRows(res.getBody());
                    if (resolvedSheetName == null || resolvedSheetName.isBlank()) {
                        resolvedSheetName = "Trang 1";
                    }
                }
            } catch (Exception ex) {
                log.info("Public TSV export failed for spreadsheet {}: {}", spreadsheetId, ex.getMessage());
            }
        }

        if (rawRows == null || rawRows.isEmpty()) {
            if (!isWorkspaceConnected) {
                throw new ValidationException("Bảng tính này được đặt ở chế độ riêng tư hoặc chưa cấp quyền. Vui lòng kết nối Google Workspace trong phần Cài đặt để SmartSchedule có thể đọc dữ liệu.");
            } else {
                throw new ValidationException("Không thể đọc dữ liệu từ Google Sheets này. Vui lòng kiểm tra quyền chia sẻ bảng tính với tài khoản của bạn.");
            }
        }

        GoogleSheetsParser.ParseResult parseResult = sheetsParser.parseRows(rawRows, today);
        warnings.addAll(parseResult.warnings());

        // Cross-check time conflicts against SmartSchedule database
        Schedule schedule = resolveUserSchedule(user);
        List<ParsedSheetEventDto> finalEvents = new ArrayList<>();
        int conflictCount = 0;

        for (ParsedSheetEventDto ev : parseResult.events()) {
            boolean hasConflict = false;
            String conflictDetails = null;

            if (ev.date() != null && ev.startTime() != null && ev.endTime() != null) {
                try {
                    LocalDate date = LocalDate.parse(ev.date());
                    LocalTime sTime = LocalTime.parse(ev.startTime());
                    LocalTime eTime = LocalTime.parse(ev.endTime());

                    Instant startsAt = date.atTime(sTime).atZone(zoneId).toInstant();
                    Instant endsAt = date.atTime(eTime).atZone(zoneId).toInstant();

                    List<Event> overlaps = eventRepository.search(schedule.getId(), startsAt, endsAt, null, null, null);
                    if (!overlaps.isEmpty()) {
                        hasConflict = true;
                        conflictCount++;
                        Event clash = overlaps.get(0);
                        conflictDetails = String.format("Trùng với '%s' (%s–%s)",
                                clash.getTitle(),
                                clash.getStartsAt().atZone(zoneId).format(AiDateTimeUtils.TIME_FMT),
                                clash.getEndsAt().atZone(zoneId).format(AiDateTimeUtils.TIME_FMT));
                    }
                } catch (Exception ex) {
                    log.debug("Conflict check failed for event row {}: {}", ev.sourceRow(), ex.getMessage());
                }
            }

            finalEvents.add(new ParsedSheetEventDto(
                    ev.title(),
                    ev.date(),
                    ev.startTime(),
                    ev.endTime(),
                    ev.location(),
                    ev.instructor(),
                    ev.confidence(),
                    ev.sourceRow(),
                    hasConflict,
                    conflictDetails,
                    ev.missingFields()
            ));
        }

        return new SheetAnalysisResponse(
                "GOOGLE_SHEETS",
                spreadsheetId,
                resolvedSheetName != null ? resolvedSheetName : "Sheet1",
                parseResult.rowsDetected(),
                parseResult.eventsDetected(),
                parseResult.validEvents(),
                parseResult.missingTimeCount(),
                conflictCount,
                finalEvents,
                warnings
        );
    }

    private String fetchFirstSheetName(String spreadsheetId, String accessToken) {
        String url = SHEETS_API_BASE + "/" + spreadsheetId + "?fields=sheets.properties.title";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (res.getBody() != null) {
                JsonNode root = objectMapper.readTree(res.getBody());
                JsonNode sheets = root.path("sheets");
                if (sheets.isArray() && !sheets.isEmpty()) {
                    return sheets.get(0).path("properties").path("title").asText("Sheet1");
                }
            }
        } catch (Exception e) {
            log.warn("Could not retrieve sheet metadata: {}", e.getMessage());
        }
        return "Sheet1";
    }

    @SuppressWarnings("unchecked")
    private List<List<Object>> fetchSheetValuesViaApi(String spreadsheetId, String sheetName, String accessToken) {
        String encodedSheet = sheetName.replace("'", "\\'");
        String range = encodedSheet + "!A1:Z500";
        String url = SHEETS_API_BASE + "/" + spreadsheetId + "/values/" + range;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> res = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (res.getBody() != null && res.getBody().containsKey("values")) {
                return (List<List<Object>>) res.getBody().get("values");
            }
        } catch (Exception e) {
            log.warn("Failed fetching sheet range {}: {}", range, e.getMessage());
        }
        return null;
    }

    private Schedule resolveUserSchedule(User user) {
        return scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> scheduleRepository.save(new Schedule(user, "Lịch cá nhân", "Lịch mặc định tạo tự động", "Asia/Ho_Chi_Minh", "PRIVATE")));
    }
}
