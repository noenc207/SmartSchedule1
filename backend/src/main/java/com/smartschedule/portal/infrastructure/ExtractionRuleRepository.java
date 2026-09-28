package com.smartschedule.portal.infrastructure;

import com.smartschedule.portal.domain.ExtractionRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExtractionRuleRepository extends JpaRepository<ExtractionRule, String> {
    List<ExtractionRule> findAllByEnabledTrueOrderByPriorityDesc();

    @Query("SELECT r FROM ExtractionRule r WHERE r.enabled = true AND LOWER(r.domains) LIKE LOWER(CONCAT('%', :domain, '%')) ORDER BY r.priority DESC")
    List<ExtractionRule> findMatchingRules(@Param("domain") String domain);
}
