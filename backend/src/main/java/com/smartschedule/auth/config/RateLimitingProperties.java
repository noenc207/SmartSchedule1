package com.smartschedule.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartschedule.rate-limit")
public class RateLimitingProperties {
    private boolean enabled = true;
    private int registerPerMinute = 5;
    private int loginPerMinute = 15;
    private int refreshPerMinute = 30;

    public RateLimitingProperties() {}

    public RateLimitingProperties(boolean enabled, int registerPerMinute, int loginPerMinute, int refreshPerMinute) {
        this.enabled = enabled;
        this.registerPerMinute = registerPerMinute;
        this.loginPerMinute = loginPerMinute;
        this.refreshPerMinute = refreshPerMinute;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getRegisterPerMinute() {
        return registerPerMinute;
    }

    public void setRegisterPerMinute(int registerPerMinute) {
        this.registerPerMinute = registerPerMinute;
    }

    public int getLoginPerMinute() {
        return loginPerMinute;
    }

    public void setLoginPerMinute(int loginPerMinute) {
        this.loginPerMinute = loginPerMinute;
    }

    public int getRefreshPerMinute() {
        return refreshPerMinute;
    }

    public void setRefreshPerMinute(int refreshPerMinute) {
        this.refreshPerMinute = refreshPerMinute;
    }
}
