package com.smartschedule.integration.google.application;

import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.ParsedSheetEventDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GoogleSheetsParser {

    private static final Logger log = LoggerFactory.getLogger(GoogleSheetsParser.class);

    private static final Pattern TIME_RANGE_PATTERN = Pattern.compile(
            "(\\d{1,2})(?:[:hH](\\d{2}))?\\s*(?:-|–|—|đến|to|tới)\\s*(\\d{1,2})(?:[:hH](\\d{2}))?"
    );
    private static final Pattern SINGLE_TIME_PATTERN = Pattern.compile(
            "(\\d{1,2})(?:[:hH](\\d{2}))?"
    );
    private static final Pattern TIET_PATTERN = Pattern.compile(
            "(?:tiết|ca|tiet)\\s*(\\d{1,2})\\s*(?:-|–|—|đến|to)?\\s*(\\d{1,2})?",
            Pattern.CASE_INSENSITIVE
    );

    // Standard Vietnamese university period slots (Tiết 1 = 07:00, etc.)
    private static final Map<Integer, LocalTime> PERIOD_START_TIMES = Map.ofEntries(
            Map.entry(1, LocalTime.of(7, 0)),
            Map.entry(2, LocalTime.of(7, 50)),
            Map.entry(3, LocalTime.of(8, 50)),
            Map.entry(4, LocalTime.of(9, 40)),
            Map.entry(5, LocalTime.of(10, 30)),
            Map.entry(6, LocalTime.of(12, 30)),
            Map.entry(7, LocalTime.of(13, 20)),
            Map.entry(8, LocalTime.of(14, 20)),
            Map.entry(9, LocalTime.of(15, 10)),
            Map.entry(10, LocalTime.of(16, 0)),
            Map.entry(11, LocalTime.of(17, 30)),
            Map.entry(12, LocalTime.of(18, 20)),
            Map.entry(13, LocalTime.of(19, 10))
    );

    private static final Map<Integer, LocalTime> PERIOD_END_TIMES = Map.ofEntries(
            Map.entry(1, LocalTime.of(7, 45)),
            Map.entry(2, LocalTime.of(8, 35)),
            Map.entry(3, LocalTime.of(9, 35)),
            Map.entry(4, LocalTime.of(10, 25)),
            Map.entry(5, LocalTime.of(11, 15)),
            Map.entry(6, LocalTime.of(13, 15)),
            Map.entry(7, LocalTime.of(14, 5)),
            Map.entry(8, LocalTime.of(15, 5)),
            Map.entry(9, LocalTime.of(15, 55)),
            Map.entry(10, LocalTime.of(16, 45)),
            Map.entry(11, LocalTime.of(18, 15)),
            Map.entry(12, LocalTime.of(19, 5)),
            Map.entry(13, LocalTime.of(19, 55))
    );

    private enum ColumnType {
        TITLE,
        DATE,
        START_TIME,
        END_TIME,
        TIME_RANGE,
        LOCATION,
        INSTRUCTOR,
        NOTES,
        UNKNOWN
    }

    public record ParseResult(
            List<ParsedSheetEventDto> events,
            int rowsDetected,
            int eventsDetected,
            int validEvents,
            int missingTimeCount,
            List<String> warnings
    ) {}

    public ParseResult parseRows(List<List<Object>> rawRows, LocalDate referenceDate) {
        if (rawRows == null || rawRows.isEmpty()) {
            return new ParseResult(List.of(), 0, 0, 0, 0, List.of("Bảng tính không có dữ liệu"));
        }

        LocalDate baseDate = (referenceDate != null) ? referenceDate : LocalDate.now();

        // 1. Detect header row within first 5 rows
        int headerRowIndex = detectHeaderRowIndex(rawRows);
        List<Object> headerRow = rawRows.get(headerRowIndex);
        Map<Integer, ColumnType> columnMappings = detectColumnMappings(headerRow);

        List<ParsedSheetEventDto> parsedEvents = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int missingTimeCount = 0;
        int rowsDetected = rawRows.size() - (headerRowIndex + 1);

        for (int r = headerRowIndex + 1; r < rawRows.size(); r++) {
            List<Object> row = rawRows.get(r);
            if (row == null || row.isEmpty() || isRowBlank(row)) {
                continue;
            }

            ParsedSheetEventDto event = parseSingleRow(row, columnMappings, r + 1, baseDate, warnings);
            if (event != null) {
                parsedEvents.add(event);
                if (!event.missingFields().isEmpty() && event.missingFields().contains("startTime")) {
                    missingTimeCount++;
                }
            }
        }

        int validEvents = (int) parsedEvents.stream()
                .filter(e -> e.missingFields().isEmpty())
                .count();

        if (missingTimeCount > 0) {
            warnings.add(String.format("Phát hiện %d dòng thiếu giờ học cụ thể. Người dùng cần xem xét trước khi nhập.", missingTimeCount));
        }

        return new ParseResult(
                parsedEvents,
                rowsDetected,
                parsedEvents.size(),
                validEvents,
                missingTimeCount,
                warnings
        );
    }

    public List<List<Object>> parseTsvToRows(String tsvContent) {
        List<List<Object>> rows = new ArrayList<>();
        if (tsvContent == null || tsvContent.isBlank()) {
            return rows;
        }

        String[] lines = tsvContent.split("\r?\n");
        for (String line : lines) {
            String[] cells = line.split("\t", -1);
            List<Object> row = new ArrayList<>();
            for (String cell : cells) {
                row.add(cell.trim());
            }
            rows.add(row);
        }
        return rows;
    }

    private boolean isRowBlank(List<Object> row) {
        for (Object cell : row) {
            if (cell != null && !cell.toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private int detectHeaderRowIndex(List<List<Object>> rows) {
        int maxRows = Math.min(rows.size(), 6);
        int bestRow = 0;
        int maxScore = -1;

        for (int i = 0; i < maxRows; i++) {
            List<Object> row = rows.get(i);
            int score = scoreHeaderRow(row);
            if (score > maxScore) {
                maxScore = score;
                bestRow = i;
            }
        }

        return maxScore >= 2 ? bestRow : 0;
    }

    private int scoreHeaderRow(List<Object> row) {
        if (row == null) return 0;
        int score = 0;
        for (Object cell : row) {
            if (cell == null) continue;
            String text = cell.toString().toLowerCase().trim();
            if (matchesType(text, ColumnType.TITLE) ||
                matchesType(text, ColumnType.DATE) ||
                matchesType(text, ColumnType.START_TIME) ||
                matchesType(text, ColumnType.END_TIME) ||
                matchesType(text, ColumnType.TIME_RANGE) ||
                matchesType(text, ColumnType.LOCATION) ||
                matchesType(text, ColumnType.INSTRUCTOR)) {
                score++;
            }
        }
        return score;
    }

    private Map<Integer, ColumnType> detectColumnMappings(List<Object> headerRow) {
        Map<Integer, ColumnType> map = new LinkedHashMap<>();
        if (headerRow == null) return map;

        boolean hasStartTime = false;
        boolean hasEndTime = false;

        for (int col = 0; col < headerRow.size(); col++) {
            Object cell = headerRow.get(col);
            if (cell == null) continue;
            String text = cell.toString().toLowerCase().trim();

            if (matchesType(text, ColumnType.TITLE)) {
                map.put(col, ColumnType.TITLE);
            } else if (matchesType(text, ColumnType.DATE)) {
                map.put(col, ColumnType.DATE);
            } else if (matchesType(text, ColumnType.START_TIME)) {
                map.put(col, ColumnType.START_TIME);
                hasStartTime = true;
            } else if (matchesType(text, ColumnType.END_TIME)) {
                map.put(col, ColumnType.END_TIME);
                hasEndTime = true;
            } else if (matchesType(text, ColumnType.LOCATION)) {
                map.put(col, ColumnType.LOCATION);
            } else if (matchesType(text, ColumnType.INSTRUCTOR)) {
                map.put(col, ColumnType.INSTRUCTOR);
            } else if (matchesType(text, ColumnType.TIME_RANGE)) {
                map.put(col, ColumnType.TIME_RANGE);
            } else {
                map.put(col, ColumnType.UNKNOWN);
            }
        }

        // If we found both start and end time, keep them. If we have a time range column while no start/end, good.
        return map;
    }

    private boolean matchesType(String text, ColumnType type) {
        return switch (type) {
            case TITLE -> text.matches(".*(môn|tiêu đề|subject|tiết học|tên môn|course|class|tên sự kiện|event|title|activity|hoạt động).*");
            case DATE -> text.matches(".*(ngày|date|thứ|day|buổi|thời điểm|ngày học).*");
            case START_TIME -> text.matches(".*(bắt đầu|start|từ giờ|giờ bắt đầu|từ).*") && !text.contains("kết thúc") && !text.contains("đến");
            case END_TIME -> text.matches(".*(kết thúc|end|đến giờ|giờ kết thúc|đến).*");
            case TIME_RANGE -> text.matches(".*(giờ|khung giờ|thời gian|time|slot|ca học|ca|tiết).*");
            case LOCATION -> text.matches(".*(phòng|phòng học|room|địa điểm|location|lab|khu vực).*");
            case INSTRUCTOR -> text.matches(".*(giảng viên|gv|thầy|cô|thầy/cô|instructor|lecturer|teacher|giáo viên).*");
            case NOTES -> text.matches(".*(ghi chú|note|mô tả|description|chi tiết).*");
            default -> false;
        };
    }

    private ParsedSheetEventDto parseSingleRow(List<Object> row,
                                              Map<Integer, ColumnType> colMap,
                                              int rowNum,
                                              LocalDate baseDate,
                                              List<String> warnings) {
        String title = null;
        String dateStr = null;
        String startTimeStr = null;
        String endTimeStr = null;
        String location = null;
        String instructor = null;
        List<String> missingFields = new ArrayList<>();

        for (Map.Entry<Integer, ColumnType> entry : colMap.entrySet()) {
            int col = entry.getKey();
            if (col >= row.size()) continue;
            Object val = row.get(col);
            if (val == null) continue;
            String cellVal = val.toString().trim();
            if (cellVal.isEmpty()) continue;

            switch (entry.getValue()) {
                case TITLE -> {
                    if (title == null) title = cleanTitle(cellVal);
                }
                case DATE -> {
                    if (dateStr == null) dateStr = cellVal;
                }
                case START_TIME -> {
                    if (startTimeStr == null) startTimeStr = cellVal;
                }
                case END_TIME -> {
                    if (endTimeStr == null) endTimeStr = cellVal;
                }
                case TIME_RANGE -> {
                    if (startTimeStr == null && endTimeStr == null) {
                        TimePair periodPair = parsePeriods(cellVal);
                        if (periodPair != null) {
                            startTimeStr = periodPair.start;
                            endTimeStr = periodPair.end;
                        } else {
                            TimePair pair = parseTimeRange(cellVal);
                            if (pair != null) {
                                startTimeStr = pair.start;
                                endTimeStr = pair.end;
                            }
                        }
                    }
                }
                case LOCATION -> {
                    if (location == null) location = cellVal;
                }
                case INSTRUCTOR -> {
                    if (instructor == null) instructor = cellVal;
                }
                default -> {}
            }
        }

        // Fallback for unmapped columns if title is still missing
        if (title == null || title.isBlank()) {
            for (int i = 0; i < row.size(); i++) {
                if (!colMap.containsKey(i) || colMap.get(i) == ColumnType.UNKNOWN) {
                    String candidate = row.get(i).toString().trim();
                    if (!candidate.isEmpty() && candidate.length() >= 2 && !candidate.matches("^[0-9:\\-–—/.]+$")) {
                        title = cleanTitle(candidate);
                        break;
                    }
                }
            }
        }

        if (title == null || title.isBlank()) {
            // Row has no title, skip it
            return null;
        }

        // Resolve Date
        LocalDate resolvedDate = parseDate(dateStr, baseDate);
        String finalDateStr;
        if (resolvedDate != null) {
            finalDateStr = resolvedDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
        } else {
            finalDateStr = null;
            missingFields.add("date");
            warnings.add(String.format("Dòng %d (%s): Không xác định được ngày học.", rowNum, title));
        }

        // Resolve Start & End Time
        LocalTime parsedStart = null;
        LocalTime parsedEnd = null;

        // 1. Check if periods (Tiết / Ca) were mentioned
        if (startTimeStr != null && (startTimeStr.toLowerCase().contains("tiết") || startTimeStr.toLowerCase().contains("ca") || startTimeStr.toLowerCase().contains("tiet"))) {
            TimePair periodPair = parsePeriods(startTimeStr);
            if (periodPair != null) {
                parsedStart = parseTime(periodPair.start);
                parsedEnd = parseTime(periodPair.end);
            }
        }

        // 2. Check if time range in startTimeStr (e.g. 08:00 - 09:30)
        if (parsedStart == null && startTimeStr != null && (startTimeStr.contains("-") || startTimeStr.contains("–") || startTimeStr.contains("đến") || startTimeStr.contains("to"))) {
            TimePair pair = parseTimeRange(startTimeStr);
            if (pair != null) {
                parsedStart = parseTime(pair.start);
                parsedEnd = parseTime(pair.end);
            }
        }

        // 3. Standard individual time parsing
        if (parsedStart == null) {
            parsedStart = parseTime(startTimeStr);
        }
        if (parsedEnd == null) {
            parsedEnd = parseTime(endTimeStr);
        }

        // STRICT REQUIREMENT 12: Do NOT invent 08:00 if time is missing!
        String finalStart = null;
        String finalEnd = null;
        if (parsedStart != null) {
            finalStart = parsedStart.format(DateTimeFormatter.ofPattern("HH:mm"));
            if (parsedEnd != null) {
                finalEnd = parsedEnd.format(DateTimeFormatter.ofPattern("HH:mm"));
            } else {
                // Default duration 60 minutes if only start time is provided
                finalEnd = parsedStart.plusMinutes(60).format(DateTimeFormatter.ofPattern("HH:mm"));
            }
        } else {
            missingFields.add("startTime");
            missingFields.add("endTime");
            warnings.add(String.format("Dòng %d (%s): Thiếu giờ học cụ thể.", rowNum, title));
        }

        // Confidence calculation
        double confidence = 1.0;
        if (missingFields.contains("startTime")) {
            confidence -= 0.5;
        }
        if (missingFields.contains("date")) {
            confidence -= 0.3;
        }
        if (location == null || location.isBlank()) {
            confidence -= 0.1;
        }
        confidence = Math.max(0.1, Math.min(1.0, confidence));

        return new ParsedSheetEventDto(
                title,
                finalDateStr,
                finalStart,
                finalEnd,
                location,
                instructor,
                Math.round(confidence * 100.0) / 100.0,
                rowNum,
                false,
                null,
                missingFields
        );
    }

    private String cleanTitle(String raw) {
        if (raw == null) return null;
        String cleaned = raw.replaceAll("[*#_\\[\\]]", "").trim();
        return cleaned.length() > 200 ? cleaned.substring(0, 200).trim() : cleaned;
    }

    private record TimePair(String start, String end) {}

    private TimePair parseTimeRange(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = TIME_RANGE_PATTERN.matcher(text);
        if (m.find()) {
            int sh = Integer.parseInt(m.group(1));
            int sm = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
            int eh = Integer.parseInt(m.group(3));
            int em = m.group(4) != null ? Integer.parseInt(m.group(4)) : 0;
            return new TimePair(
                    String.format("%02d:%02d", sh, sm),
                    String.format("%02d:%02d", eh, em)
            );
        }
        return null;
    }

    private TimePair parsePeriods(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = TIET_PATTERN.matcher(text);
        if (m.find()) {
            int startPeriod = Integer.parseInt(m.group(1));
            int endPeriod = m.group(2) != null ? Integer.parseInt(m.group(2)) : startPeriod;

            LocalTime s = PERIOD_START_TIMES.get(startPeriod);
            LocalTime e = PERIOD_END_TIMES.get(endPeriod);
            if (s != null && e != null) {
                return new TimePair(
                        s.format(DateTimeFormatter.ofPattern("HH:mm")),
                        e.format(DateTimeFormatter.ofPattern("HH:mm"))
                );
            }
        }
        return null;
    }

    private LocalTime parseTime(String text) {
        if (text == null || text.isBlank()) return null;
        String t = text.trim().toLowerCase();
        if (t.contains("tiết") || t.contains("tiet") || t.contains("ca ")) return null;

        // Check if AM/PM
        boolean isPm = t.endsWith("pm") || t.endsWith("chiều") || t.endsWith("tối");
        boolean isAm = t.endsWith("am") || t.endsWith("sáng");
        t = t.replaceAll("(am|pm|sáng|chiều|tối)", "").trim();

        Matcher m = SINGLE_TIME_PATTERN.matcher(t);
        if (m.find()) {
            try {
                int h = Integer.parseInt(m.group(1));
                int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
                if (isPm && h < 12) h += 12;
                if (isAm && h == 12) h = 0;
                if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
                    return LocalTime.of(h, min);
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private LocalDate parseDate(String text, LocalDate baseDate) {
        if (text == null || text.isBlank()) return null;
        String str = text.trim();

        // 1. ISO yyyy-MM-dd
        try {
            return LocalDate.parse(str, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception ignored) {}

        // 2. dd/MM/yyyy or dd-MM-yyyy
        for (String pattern : List.of("dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy/MM/dd")) {
            try {
                return LocalDate.parse(str, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception ignored) {}
        }

        // 3. Day of week (e.g. Thứ Hai, Thứ 2, Monday, Chủ Nhật, CN, T2, T3)
        String lower = str.toLowerCase();
        DayOfWeek dow = null;
        if (lower.contains("thứ hai") || lower.contains("thứ 2") || lower.equals("t2") || lower.contains("monday") || lower.equals("mon")) {
            dow = DayOfWeek.MONDAY;
        } else if (lower.contains("thứ ba") || lower.contains("thứ 3") || lower.equals("t3") || lower.contains("tuesday") || lower.equals("tue")) {
            dow = DayOfWeek.TUESDAY;
        } else if (lower.contains("thứ tư") || lower.contains("thứ 4") || lower.equals("t4") || lower.contains("wednesday") || lower.equals("wed")) {
            dow = DayOfWeek.WEDNESDAY;
        } else if (lower.contains("thứ năm") || lower.contains("thứ 5") || lower.equals("t5") || lower.contains("thursday") || lower.equals("thu")) {
            dow = DayOfWeek.THURSDAY;
        } else if (lower.contains("thứ sáu") || lower.contains("thứ 6") || lower.equals("t6") || lower.contains("friday") || lower.equals("fri")) {
            dow = DayOfWeek.FRIDAY;
        } else if (lower.contains("thứ bảy") || lower.contains("thứ 7") || lower.equals("t7") || lower.contains("saturday") || lower.equals("sat")) {
            dow = DayOfWeek.SATURDAY;
        } else if (lower.contains("chủ nhật") || lower.contains("cn") || lower.equals("t8") || lower.contains("sunday") || lower.equals("sun")) {
            dow = DayOfWeek.SUNDAY;
        }

        if (dow != null) {
            LocalDate mondayOfWeek = baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            int offset = dow.getValue() - DayOfWeek.MONDAY.getValue();
            return mondayOfWeek.plusDays(offset);
        }

        return null;
    }
}
