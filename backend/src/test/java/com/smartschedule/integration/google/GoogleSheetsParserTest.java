package com.smartschedule.integration.google;

import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.ParsedSheetEventDto;
import com.smartschedule.integration.google.application.GoogleSheetsParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleSheetsParserTest {

    private GoogleSheetsParser parser;
    private final LocalDate refDate = LocalDate.of(2026, 10, 5); // Monday

    @BeforeEach
    void setUp() {
        parser = new GoogleSheetsParser();
    }

    @Test
    @DisplayName("Should detect standard headers and parse schedule events correctly")
    void testParseStandardHeaders() {
        List<List<Object>> rows = List.of(
                List.of("Môn học", "Ngày", "Thời gian", "Phòng học", "Giảng viên"),
                List.of("Giải tích 1", "2026-10-06", "08:00 - 09:30", "A101", "TS. Nguyễn"),
                List.of("Vật lý đại cương", "2026-10-07", "13:30 - 15:00", "B202", "ThS. Trần")
        );

        var result = parser.parseRows(rows, refDate);

        assertThat(result.eventsDetected()).isEqualTo(2);
        assertThat(result.validEvents()).isEqualTo(2);
        assertThat(result.missingTimeCount()).isEqualTo(0);

        ParsedSheetEventDto ev1 = result.events().get(0);
        assertThat(ev1.title()).isEqualTo("Giải tích 1");
        assertThat(ev1.date()).isEqualTo("2026-10-06");
        assertThat(ev1.startTime()).isEqualTo("08:00");
        assertThat(ev1.endTime()).isEqualTo("09:30");
        assertThat(ev1.location()).isEqualTo("A101");
        assertThat(ev1.instructor()).isEqualTo("TS. Nguyễn");
        assertThat(ev1.confidence()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Requirement 12: Missing required time must NOT invent 08:00 and must flag warning")
    void testMissingRequiredTimeDoesNotInventDefault() {
        List<List<Object>> rows = List.of(
                List.of("Môn", "Ngày", "Giờ", "Phòng"),
                List.of("Physics", "Sunday", "", "Lab 2"),
                List.of("Calculus", "Monday", "08:00-09:30", "A101")
        );

        var result = parser.parseRows(rows, refDate);

        assertThat(result.eventsDetected()).isEqualTo(2);
        assertThat(result.validEvents()).isEqualTo(1);
        assertThat(result.missingTimeCount()).isEqualTo(1);

        ParsedSheetEventDto physics = result.events().get(0);
        assertThat(physics.title()).isEqualTo("Physics");
        assertThat(physics.startTime()).isNull();
        assertThat(physics.endTime()).isNull();
        assertThat(physics.missingFields()).contains("startTime", "endTime");
        assertThat(result.warnings()).anyMatch(w -> w.contains("thiếu giờ"));
    }

    @Test
    @DisplayName("Should parse Vietnamese university period slots (Tiết 1-3)")
    void testParseVietnamesePeriods() {
        List<List<Object>> rows = List.of(
                List.of("Tên môn", "Thứ", "Tiết", "Phòng"),
                List.of("Hóa học đại cương", "Thứ Ba", "Tiết 1-3", "C303")
        );

        var result = parser.parseRows(rows, refDate);

        assertThat(result.eventsDetected()).isEqualTo(1);
        ParsedSheetEventDto hoa = result.events().get(0);
        assertThat(hoa.title()).isEqualTo("Hóa học đại cương");
        assertThat(hoa.startTime()).isEqualTo("07:00");
        assertThat(hoa.endTime()).isEqualTo("09:35");
        assertThat(hoa.location()).isEqualTo("C303");
    }

    @Test
    @DisplayName("Should parse matrix timetable with sessions (Ngày, Thứ, Buổi Sáng, Buổi Chiều, Buổi Tối)")
    void testParseMatrixTimetableWithSessions() {
        List<List<Object>> rows = List.of(
                List.of("Ngày", "Thứ", "Buổi Sáng", "Buổi Chiều", "Buổi Tối"),
                List.of("05/10/2026", "Thứ 2", "Lên lớp tại FPT Quy Nhơn", "Luyện Competitive Programming (C++ với Segment Tree, DSU, v.v.)", "Code dự án y tế DERMA-ACT / Mind's Eye Reborn"),
                List.of("06/10/2026", "Thứ 3", "Nghiên cứu AI & Deep Learning (PyTorch, Computer Vision)", "Lên lớp tại FPT Quy Nhơn", "Đọc truyện Tiên hiệp")
        );

        var result = parser.parseRows(rows, refDate);

        assertThat(result.eventsDetected()).isEqualTo(6);
        assertThat(result.validEvents()).isEqualTo(6);
        assertThat(result.missingTimeCount()).isEqualTo(0);

        ParsedSheetEventDto ev1 = result.events().get(0);
        assertThat(ev1.title()).isEqualTo("Lên lớp tại FPT Quy Nhơn");
        assertThat(ev1.date()).isEqualTo("2026-10-05");
        assertThat(ev1.startTime()).isEqualTo("07:30");
        assertThat(ev1.endTime()).isEqualTo("11:30");
        assertThat(ev1.location()).isEqualTo("FPT Quy Nhơn");

        ParsedSheetEventDto ev2 = result.events().get(1);
        assertThat(ev2.title()).contains("Competitive Programming");
        assertThat(ev2.date()).isEqualTo("2026-10-05");
        assertThat(ev2.startTime()).isEqualTo("13:30");
        assertThat(ev2.endTime()).isEqualTo("17:00");

        ParsedSheetEventDto ev3 = result.events().get(2);
        assertThat(ev3.title()).contains("DERMA-ACT");
        assertThat(ev3.date()).isEqualTo("2026-10-05");
        assertThat(ev3.startTime()).isEqualTo("18:30");
        assertThat(ev3.endTime()).isEqualTo("21:30");
    }

    @Test
    @DisplayName("Should parse TSV string into 2D table cleanly")
    void testParseTsv() {
        String tsv = "Subject\tDate\tTime\tRoom\nMath\t2026-10-08\t10:00-11:30\tH1";
        List<List<Object>> rows = parser.parseTsvToRows(tsv);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)).containsExactly("Subject", "Date", "Time", "Room");
        assertThat(rows.get(1)).containsExactly("Math", "2026-10-08", "10:00-11:30", "H1");
    }
}
