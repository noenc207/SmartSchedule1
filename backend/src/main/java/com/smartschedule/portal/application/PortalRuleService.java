package com.smartschedule.portal.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.portal.api.PortalDtos.PortalRuleResponse;
import com.smartschedule.portal.domain.ExtractionRule;
import com.smartschedule.portal.infrastructure.ExtractionRuleRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortalRuleService {
    private final ExtractionRuleRepository repository;
    private final ObjectMapper objectMapper;

    public PortalRuleService(ExtractionRuleRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<PortalRuleResponse> listActiveRules() {
        return repository.findAllByEnabledTrueOrderByPriorityDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<PortalRuleResponse> matchRule(String domain, String path) {
        if (domain == null || domain.isBlank()) {
            return repository.findAllByEnabledTrueOrderByPriorityDesc()
                    .stream()
                    .findFirst()
                    .map(this::toResponse);
        }

        String cleanDomain = domain.trim().toLowerCase();
        List<ExtractionRule> candidates = repository.findMatchingRules(cleanDomain);

        if (candidates.isEmpty()) {
            // Check wildcard patterns
            candidates = repository.findAllByEnabledTrueOrderByPriorityDesc().stream()
                    .filter(r -> matchesDomainPattern(r.getDomains(), cleanDomain))
                    .toList();
        }

        // Filter by path if present
        if (path != null && !path.isBlank()) {
            for (ExtractionRule r : candidates) {
                if (r.getPathPattern() != null && path.contains(r.getPathPattern())) {
                    return Optional.of(toResponse(r));
                }
            }
        }

        return candidates.stream().findFirst().map(this::toResponse);
    }

    private boolean matchesDomainPattern(String domainsCsv, String hostname) {
        if (domainsCsv == null) return false;
        String[] parts = domainsCsv.split(",");
        for (String p : parts) {
            String pattern = p.trim().toLowerCase();
            if (pattern.equals(hostname)) return true;
            if (pattern.startsWith("*.")) {
                String root = pattern.substring(2);
                if (hostname.equals(root) || hostname.endsWith("." + root)) return true;
            }
        }
        return false;
    }

    private PortalRuleResponse toResponse(ExtractionRule r) {
        Object parsedJson;
        try {
            parsedJson = objectMapper.readValue(r.getRuleJson(), Object.class);
        } catch (Exception e) {
            parsedJson = r.getRuleJson();
        }

        List<String> domainList = r.getDomains() != null
                ? Arrays.stream(r.getDomains().split(",")).map(String::trim).toList()
                : List.of();

        return new PortalRuleResponse(
                r.getId(),
                r.getName(),
                r.getProvider(),
                r.getVersion(),
                domainList,
                r.getPathPattern(),
                parsedJson,
                r.getChecksum(),
                r.getPriority()
        );
    }
}
