package com.smartschedule.portal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.portal.api.PortalDtos.PortalRuleResponse;
import com.smartschedule.portal.application.PortalRuleService;
import com.smartschedule.portal.domain.ExtractionRule;
import com.smartschedule.portal.infrastructure.ExtractionRuleRepository;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PortalRuleServiceTest {
    private ExtractionRuleRepository repository;
    private PortalRuleService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExtractionRuleRepository.class);
        service = new PortalRuleService(repository, new ObjectMapper());
    }

    @Test
    void listActiveRulesReturnsAllEnabledRules() {
        ExtractionRule rule = new ExtractionRule(
                "fpt-fap", "FAP", "FAP", 1, "fap.fpt.edu.vn",
                "Schedule", "{}", "checksum123", true, 100
        );
        when(repository.findAllByEnabledTrueOrderByPriorityDesc()).thenReturn(List.of(rule));

        List<PortalRuleResponse> result = service.listActiveRules();
        assertEquals(1, result.size());
        assertEquals("fpt-fap", result.get(0).id());
        assertEquals("FAP", result.get(0).provider());
    }

    @Test
    void matchRuleFindsMatchingRuleByDomain() {
        ExtractionRule rule = new ExtractionRule(
                "fpt-fap", "FAP", "FAP", 1, "fap.fpt.edu.vn,*.fpt.edu.vn",
                "Schedule", "{}", "checksum123", true, 100
        );
        when(repository.findMatchingRules("fap.fpt.edu.vn")).thenReturn(List.of(rule));

        Optional<PortalRuleResponse> match = service.matchRule("fap.fpt.edu.vn", "/Report/ScheduleOfWeek.aspx");
        assertTrue(match.isPresent());
        assertEquals("fpt-fap", match.get().id());
    }

    @Test
    void matchRuleReturnsEmptyWhenNoRuleMatches() {
        when(repository.findMatchingRules("unknown.edu.vn")).thenReturn(List.of());
        when(repository.findAllByEnabledTrueOrderByPriorityDesc()).thenReturn(List.of());

        Optional<PortalRuleResponse> match = service.matchRule("unknown.edu.vn", null);
        assertTrue(match.isEmpty());
    }
}
