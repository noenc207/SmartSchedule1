package com.smartschedule.portal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smartschedule.event.domain.Event;
import com.smartschedule.event.infrastructure.EventRepository;
import com.smartschedule.portal.api.PortalDtos.*;
import com.smartschedule.portal.application.PortalImportService;
import com.smartschedule.portal.domain.ScheduleImport;
import com.smartschedule.portal.infrastructure.ScheduleImportRepository;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PortalImportServiceTest {
    private EventRepository eventRepository;
    private ScheduleImportRepository importRepository;
    private AuthorizationService authorization;
    private UserRepository userRepository;
    private PortalImportService service;

    private final UUID scheduleId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private Schedule mockSchedule;
    private User mockUser;

    @BeforeEach
    void setUp() {
        eventRepository = mock(EventRepository.class);
        importRepository = mock(ScheduleImportRepository.class);
        authorization = mock(AuthorizationService.class);
        userRepository = mock(UserRepository.class);

        service = new PortalImportService(eventRepository, importRepository, authorization, userRepository);

        mockUser = new User("student@fpt.edu.vn", "hashed", "Nguyen Van A");
        mockSchedule = new Schedule(mockUser, "Hoc ky Fall 2026", null, "Asia/Ho_Chi_Minh", "PRIVATE");

        when(authorization.requireEditor(scheduleId, userId)).thenReturn(mockSchedule);
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
    }

    @Test
    void previewCalculatesValidAndConflictCounts() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.HOURS);
        PortalImportItem validItem = new PortalImportItem(
                "Lập trình C#", "PRN211", now, now.plus(90, ChronoUnit.MINUTES),
                "BE-301", "HuongLT", "SE1701", "FAP", "ext_1", null
        );
        PortalImportItem invalidItem = new PortalImportItem(
                "Học lỗi", null, now.plus(2, ChronoUnit.HOURS), now.plus(1, ChronoUnit.HOURS),
                null, null, null, "FAP", null, null
        );

        Event existing = new Event(mockSchedule, null, "Họp nhóm", null, now, now.plus(60, ChronoUnit.MINUTES),
                null, "MEDIUM", "CONFIRMED", null, null, null, true, true);
        when(eventRepository.search(scheduleId, now, now.plus(90, ChronoUnit.MINUTES), null, null, null))
                .thenReturn(List.of(existing));

        PortalImportPreviewResponse res = service.preview(
                scheduleId,
                new PortalImportPreviewRequest(List.of(validItem, invalidItem)),
                userId
        );

        assertEquals(2, res.total());
        assertEquals(1, res.valid());
        assertEquals(1, res.conflicts());
        assertEquals(1, res.conflictedItems().size());
        assertEquals("Họp nhóm", res.conflictedItems().get(0).conflictingEventTitle());
    }

    @Test
    void importScheduleSavesEventsAndHonorsIdempotency() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.HOURS);
        PortalImportItem item1 = new PortalImportItem(
                "Lập trình C#", "PRN211", now, now.plus(90, ChronoUnit.MINUTES),
                "BE-301", "HuongLT", "SE1701", "FAP", "fap_prn211_01", null
        );
        PortalImportItem item2 = new PortalImportItem(
                "Cơ sở dữ liệu", "DBI202", now.plus(2, ChronoUnit.HOURS), now.plus(3, ChronoUnit.HOURS).plus(30, ChronoUnit.MINUTES),
                "BE-302", "NamDH", "SE1701", "FAP", "fap_dbi202_01", null
        );

        // Simulate item1 already exists in database
        Event existingEvent1 = new Event(mockSchedule, null, "Lập trình C#", null, now, now.plus(90, ChronoUnit.MINUTES),
                "BE-301", "MEDIUM", "CONFIRMED", null, null, null, true, true);
        existingEvent1.setExternalId("fap_prn211_01");

        when(eventRepository.findAllByScheduleIdAndExternalIdIn(eq(scheduleId), any()))
                .thenReturn(List.of(existingEvent1));
        when(eventRepository.search(eq(scheduleId), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        PortalImportSubmitRequest req = new PortalImportSubmitRequest(
                "FAP", "fpt-fap", 1, List.of(item1, item2), false
        );

        PortalImportSubmitResponse response = service.importSchedule(scheduleId, req, userId);

        assertEquals(2, response.totalDetected());
        assertEquals(1, response.importedCount()); // Only item2 is new
        assertEquals(1, response.duplicateCount()); // item1 is detected as duplicate and skipped

        verify(eventRepository, times(1)).save(any(Event.class));
        verify(importRepository, times(1)).save(any(ScheduleImport.class));
    }
}
