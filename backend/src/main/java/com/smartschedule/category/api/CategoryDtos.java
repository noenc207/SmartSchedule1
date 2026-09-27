package com.smartschedule.category.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class CategoryDtos {
    private CategoryDtos() {}
    public record CategoryRequest(@NotBlank @Size(max = 100) String name,
                                  @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "must be a hex color") String color,
                                  @Size(max = 80) String icon) {}
    public record CategoryResponse(UUID id, UUID ownerId, String name, String color, String icon,
                                   Instant createdAt, Instant updatedAt) {}
}
