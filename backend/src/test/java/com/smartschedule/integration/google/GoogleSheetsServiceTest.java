package com.smartschedule.integration.google;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.common.error.ValidationException;
import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.integration.google.application.GoogleSheetsParser;
import com.smartschedule.integration.google.application.GoogleSheetsService;
import com.smartschedule.integration.google.application.GoogleWorkspaceAuthService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleSheetsServiceTest {

    @Mock
    private GoogleWorkspaceAuthService authService;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private ScheduleRepository scheduleRepository;

    private GoogleSheetsService sheetsService;
    private User testUser;

    @BeforeEach
    void setUp() {
        sheetsService = new GoogleSheetsService(
                authService,
                new GoogleSheetsParser(),
                eventRepository,
                scheduleRepository,
                new ObjectMapper()
        );
        testUser = new User("tester@example.com", "hashed", "Tester");
        testUser.setTimezone("Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("Should extract SPREADSHEET_ID from canonical Google Sheets URL")
    void testExtractSpreadsheetId_valid() {
        String url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0";
        String id = sheetsService.extractSpreadsheetId(url);
        assertThat(id).isEqualTo("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    }

    @Test
    @DisplayName("SSRF Protection: Should reject non-Google URLs and internal IP addresses")
    void testExtractSpreadsheetId_ssrfProtection() {
        assertThatThrownBy(() -> sheetsService.extractSpreadsheetId("http://localhost:8080/spreadsheets/d/123"))
                .isInstanceOf(ValidationException.class);

        assertThatThrownBy(() -> sheetsService.extractSpreadsheetId("http://169.254.169.254/latest/meta-data"))
                .isInstanceOf(ValidationException.class);

        assertThatThrownBy(() -> sheetsService.extractSpreadsheetId("https://attacker.com/spreadsheets/d/123"))
                .isInstanceOf(ValidationException.class);

        assertThatThrownBy(() -> sheetsService.extractSpreadsheetId("ftp://docs.google.com/spreadsheets/d/123"))
                .isInstanceOf(ValidationException.class);
    }
}
