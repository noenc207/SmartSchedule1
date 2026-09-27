package com.smartschedule.plan;

import com.smartschedule.user.domain.User;
import org.springframework.stereotype.Service;

@Service
public class PlanService {
    private final PlanProperties properties;

    public PlanService(PlanProperties properties) {
        this.properties = properties != null ? properties : new PlanProperties("ALL_PRO");
    }

    /**
     * Determines whether the user has access to PRO features.
     * In ALL_PRO mode, every authenticated user is granted PRO capability.
     * In STANDARD mode, the user's actual subscription tier is evaluated.
     */
    public boolean isPro(User user) {
        if (properties.isAllPro()) {
            return true;
        }
        return user != null && user.isPro();
    }

    /**
     * Returns the effective tier displayed to or consumed by clients.
     */
    public String getEffectiveTier(User user) {
        if (properties.isAllPro()) {
            return "PRO";
        }
        return user != null ? user.getTier() : "PRO";
    }

    public boolean isAllProMode() {
        return properties.isAllPro();
    }

    public PlanProperties getProperties() {
        return properties;
    }
}
