package com.smartschedule.portal.api;

import com.smartschedule.portal.api.PortalDtos.PortalRuleResponse;
import com.smartschedule.portal.application.PortalRuleService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/import/rules")
public class PortalRuleController {
    private final PortalRuleService ruleService;

    public PortalRuleController(PortalRuleService ruleService) {
        this.ruleService = ruleService;
    }

    @GetMapping
    public List<PortalRuleResponse> listRules() {
        return ruleService.listActiveRules();
    }

    @GetMapping("/match")
    public ResponseEntity<PortalRuleResponse> matchRule(
            @RequestParam(required = false) String domain,
            @RequestParam(required = false) String path) {
        return ruleService.matchRule(domain, path)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
