package com.smartschedule.ai;

import com.smartschedule.ai.application.AiException;
import com.smartschedule.ai.application.AiRiskEngine;
import com.smartschedule.ai.domain.RiskLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiRiskEngineTest {

    private AiRiskEngine riskEngine;

    @BeforeEach
    void setUp() {
        riskEngine = new AiRiskEngine();
    }

    @Test
    void testReadTools_classifiedAsRead() {
        assertThat(riskEngine.getRiskLevel("get_today_schedule")).isEqualTo(RiskLevel.READ);
        assertThat(riskEngine.getRiskLevel("get_week_schedule")).isEqualTo(RiskLevel.READ);
        assertThat(riskEngine.getRiskLevel("find_free_time")).isEqualTo(RiskLevel.READ);
        assertThat(riskEngine.getRiskLevel("get_tasks")).isEqualTo(RiskLevel.READ);
        assertThat(riskEngine.getRiskLevel("get_deadlines")).isEqualTo(RiskLevel.READ);
        assertThat(riskEngine.requiresConfirmation("get_today_schedule")).isFalse();
    }

    @Test
    void testLowWriteTools_classifiedAsLowWrite() {
        assertThat(riskEngine.getRiskLevel("complete_task")).isEqualTo(RiskLevel.LOW_WRITE);
        assertThat(riskEngine.getRiskLevel("navigate_to")).isEqualTo(RiskLevel.LOW_WRITE);
        assertThat(riskEngine.getRiskLevel("update_user_preferences")).isEqualTo(RiskLevel.LOW_WRITE);
        assertThat(riskEngine.requiresConfirmation("navigate_to")).isFalse();
    }

    @Test
    void testImportantWriteTools_requireConfirmation() {
        assertThat(riskEngine.getRiskLevel("create_schedule")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("update_schedule")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("delete_schedule")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("replace_schedule")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("create_task")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("delete_task")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("create_deadline")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("create_study_plan")).isEqualTo(RiskLevel.IMPORTANT_WRITE);
        assertThat(riskEngine.getRiskLevel("batch_action")).isEqualTo(RiskLevel.IMPORTANT_WRITE);

        assertThat(riskEngine.requiresConfirmation("create_schedule")).isTrue();
        assertThat(riskEngine.requiresConfirmation("replace_schedule")).isTrue();
        assertThat(riskEngine.requiresConfirmation("delete_task")).isTrue();
        assertThat(riskEngine.requiresConfirmation("batch_action")).isTrue();
    }

    @Test
    void testHighRiskTools_blockedByPolicy() {
        assertThat(riskEngine.isHighRisk("delete_account")).isTrue();
        assertThat(riskEngine.isHighRisk("reset_all_data")).isTrue();
        assertThat(riskEngine.isHighRisk("wipe_database")).isTrue();

        assertThatThrownBy(() -> riskEngine.enforcePolicy("delete_account", Map.of()))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("Thao tác nguy hiểm cao");

        assertThatThrownBy(() -> riskEngine.enforcePolicy("reset_all_data", Map.of()))
                .isInstanceOf(AiException.class)
                .hasMessageContaining("vô hiệu hóa qua AI");
    }
}
