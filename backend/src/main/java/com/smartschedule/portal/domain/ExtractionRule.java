package com.smartschedule.portal.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "extraction_rules")
public class ExtractionRule {
    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 64)
    private String provider;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, columnDefinition = "text")
    private String domains;

    @Column(name = "path_pattern", length = 255)
    private String pathPattern;

    @Column(name = "rule_json", nullable = false, columnDefinition = "text")
    private String ruleJson;

    @Column(nullable = false, length = 64)
    private String checksum;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private int priority;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExtractionRule() {}

    public ExtractionRule(String id, String name, String provider, int version, String domains,
                          String pathPattern, String ruleJson, String checksum, boolean enabled, int priority) {
        this.id = id;
        this.name = name;
        this.provider = provider;
        this.version = version;
        this.domains = domains;
        this.pathPattern = pathPattern;
        this.ruleJson = ruleJson;
        this.checksum = checksum;
        this.enabled = enabled;
        this.priority = priority;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getProvider() { return provider; }
    public int getVersion() { return version; }
    public String getDomains() { return domains; }
    public String getPathPattern() { return pathPattern; }
    public String getRuleJson() { return ruleJson; }
    public String getChecksum() { return checksum; }
    public boolean isEnabled() { return enabled; }
    public int getPriority() { return priority; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setRuleJson(String ruleJson) { this.ruleJson = ruleJson; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    public void setVersion(int version) { this.version = version; }
}
