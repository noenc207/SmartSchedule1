package com.smartschedule.integration.google;

import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.integration.google.api.GoogleWorkspaceDtos.ParsedSheetEventDto;
import com.smartschedule.integration.google.domain.ExternalEventLink;
import com.smartschedule.integration.google.domain.GoogleImportJob;
import com.smartschedule.integration.google.infrastructure.ExternalEventLinkRepository;
import com.smartschedule.integration.google.infrastructure.GoogleImportJobRepository;
import com.smartschedule.integration.google.application.GoogleSyncService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.schedule.infrastructure.ScheduleRepository;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleSyncServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private ExternalEventLinkRepository eventLinkRepository;

    @Mock
    private GoogleImportJobRepository importJobRepository;

    private GoogleSyncService syncService;
    private User testUser;
    private Schedule testSchedule;

    @BeforeEach
    void setUp() {
        syncService = new GoogleSyncService(
                eventRepository,
                scheduleRepository,
                eventLinkRepository,
                importJobRepository
        );
        testUser = new User("tester@example.com", "hashed", "Tester");
        testUser.setTimezone("Asia/Ho_Chi_Minh");
        testSchedule = new Schedule(testUser, "Lịch cá nhân", "Lịch test", "Asia/Ho_Chi_Minh", "PRIVATE");
        when(scheduleRepository.findAllByOwnerIdOrderByUpdatedAtDesc(testUser.getId())).thenReturn(List.of(testSchedule));
    }

    @Test
    @DisplayName("Should import sheet events, skip missing time rows, and audit job")
    void testImportSheetEvents() {
        ParsedSheetEventDto valid = new ParsedSheetEventDto(
                "Giải tích 1", "2026-10-06", "08:00", "09:30", "A101", "GV1", 1.0, 2, false, null, List.of()
        );
        ParsedSheetEventDto missingTime = new ParsedSheetEventDto(
                "Vật lý", "2026-10-07", null, null, "B202", "GV2", 0.4, 3, false, null, List.of("startTime", "endTime")
        );

        var res = syncService.importSheetEvents(testUser, "sheet123", List.of(valid, missingTime), false);

        assertThat(res.createdCount()).isEqualTo(1);
        verify(eventRepository, times(1)).save(any(Event.class));
        verify(importJobRepository, times(1)).save(any(GoogleImportJob.class));
    }

    @Test
    @DisplayName("Requirement 15: Duplicate detection must skip Google events already imported")
    void testImportCalendarEvents_skipsDuplicates() {
        ParsedSheetEventDto duplicateEvent = new ParsedSheetEventDto(
                "Họp nhóm", "2026-10-06", "10:00", "11:00", "Online", "g_event_123", 1.0, 1, false, null, List.of()
        );

        when(eventLinkRepository.existsByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
                testUser.getId(), "GOOGLE_CALENDAR", "primary", "g_event_123"
        )).thenReturn(true);

        var res = syncService.importCalendarEvents(testUser, "primary", List.of(duplicateEvent), false);

        assertThat(res.createdCount()).isEqualTo(0);
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Should import new Google event and create ExternalEventLink")
    void testImportCalendarEvents_createsLink() {
        ParsedSheetEventDto newEvent = new ParsedSheetEventDto(
                "Workshop AI", "2026-10-08", "14:00", "16:00", "Hội trường A", "g_event_456", 1.0, 1, false, null, List.of()
        );

        when(eventLinkRepository.existsByUserIdAndProviderAndExternalCalendarIdAndExternalEventId(
                testUser.getId(), "GOOGLE_CALENDAR", "primary", "g_event_456"
        )).thenReturn(false);

        Event mockSaved = new Event(testSchedule, null, "Workshop AI", "desc", null, null, "Hội trường A", "MEDIUM", "SCHEDULED", null, 15, null, false, false);
        when(eventRepository.save(any(Event.class))).thenReturn(mockSaved);

        var res = syncService.importCalendarEvents(testUser, "primary", List.of(newEvent), false);

        assertThat(res.createdCount()).isEqualTo(1);
        verify(eventLinkRepository, times(1)).save(any(ExternalEventLink.class));
        verify(importJobRepository, times(1)).save(any(GoogleImportJob.class));
    }
}
