package com.smartschedule.portal.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PortalDtos {
    private PortalDtos() {}

    public record PortalRuleResponse(
        String id,
        String name,
        String provider,
        int version,
        List<String> domains,
        String pathMatch,
        Object rule, // Raw parsed JSON or string
        String checksum,
        int priority
    ) {}

    public record PortalImportItem(
        @NotBlank String title,
        String courseCode,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        String location,
        String teacher,
        String group,
        String source,
        String externalId,
        String description
    ) {}

    public record PortalImportPreviewRequest(
        @NotNull List<PortalImportItem> items
    ) {}

    public record ConflictedItemDto(
        PortalImportItem item,
        String conflictingEventTitle,
        Instant conflictingStartsAt,
        Instant conflictingEndsAt
    ) {}

    public record PortalImportPreviewResponse(
        int total,
        int valid,
        int conflicts,
        int duplicates,
        List<PortalImportItem> items,
        List<ConflictedItemDto> conflictedItems
    ) {}

    public record PortalImportSubmitRequest(
        @NotBlank String source,
        String ruleId,
        Integer ruleVersion,
        @NotNull List<PortalImportItem> items,
        boolean skipConflicts
    ) {}

    public record PortalImportSubmitResponse(
        UUID scheduleId,
        String source,
        int totalDetected,
        int importedCount,
        int duplicateCount,
        int conflictCount,
        Instant createdAt
    ) {}

    public record PortalImportHistoryResponse(
        UUID id,
        UUID scheduleId,
        String source,
        String ruleId,
        Integer ruleVersion,
        int totalDetected,
        int importedCount,
        int duplicateCount,
        int conflictCount,
        Instant createdAt
    ) {}
}
