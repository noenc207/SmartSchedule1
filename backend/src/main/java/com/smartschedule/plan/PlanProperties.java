package com.smartschedule.plan;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartschedule.plan")
public class PlanProperties {
    /**
     * ALL_PRO: All users have PRO features unlocked temporarily.
     * STANDARD: Normal tier-based feature gating (FREE vs PRO).
     */
    private String mode = "ALL_PRO";

    public PlanProperties() {}

    public PlanProperties(String mode) {
        this.mode = mode != null ? mode : "ALL_PRO";
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode != null ? mode : "ALL_PRO";
    }

    public boolean isAllPro() {
        return "ALL_PRO".equalsIgnoreCase(mode);
    }
}
