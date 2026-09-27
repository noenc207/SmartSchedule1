package com.smartschedule.schedule.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ScheduleDtos {
    private ScheduleDtos() {}

    public record CreateScheduleRequest(@NotBlank @Size(max = 160) String name,
                                        @Size(max = 2000) String description,
                                        @NotBlank String timezone,
                                        String visibility) {}

    public record UpdateScheduleRequest(@NotBlank @Size(max = 160) String name,
                                        @Size(max = 2000) String description,
                                        @NotBlank String timezone,
                                        String visibility,
                                        Long version) {
        public UpdateScheduleRequest(String name, String description, String timezone, String visibility) {
            this(name, description, timezone, visibility, null);
        }
    }

    public record ScheduleResponse(UUID id, UUID ownerId, String name, String description,
                                   String timezone, String visibility, Instant createdAt, Instant updatedAt,
                                   long version) {}

    public record ScheduleSummaryResponse(UUID id, String name, String timezone, String visibility, String role,
                                          boolean owned, long version) {}

    public record MemberInviteRequest(@NotBlank @Email String email, @NotBlank String role) {}

    public record MemberRoleRequest(@NotBlank String role) {}

    public record ScheduleMemberResponse(UUID userId, String email, String displayName, String role, Instant createdAt) {}

    public record TeamAvailabilitySlotResponse(Instant start, Instant end, int availableMembers, int totalMembers) {}

    public record TeamAvailabilityResponse(List<TeamAvailabilitySlotResponse> slots, int totalMembers, Instant from, Instant to) {}

    public record ShareLinkCreateRequest(String mode, Instant expiresAt) {}

    public record ShareLinkResponse(UUID id, String mode, Instant expiresAt, Instant revokedAt, Instant createdAt, String url) {}

    public record PublicScheduleEventResponse(String title, Instant startsAt, Instant endsAt, String location, String color) {}

    public record PublicScheduleResponse(String name, String timezone, List<PublicScheduleEventResponse> events) {}

    public record ActivityItemResponse(UUID id, String action, String actorName, Instant createdAt) {}
}