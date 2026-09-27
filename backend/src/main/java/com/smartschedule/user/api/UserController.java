package com.smartschedule.user.api;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.user.api.UserDtos.UpdateUserRequest;
import com.smartschedule.user.api.UserDtos.UserResponse;
import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import jakarta.validation.Valid;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {
    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final com.smartschedule.plan.PlanService planService;

    public UserController(CurrentUserService currentUser) {
        this(currentUser, null, new com.smartschedule.plan.PlanService(new com.smartschedule.plan.PlanProperties("ALL_PRO")));
    }

    public UserController(CurrentUserService currentUser, UserRepository users) {
        this(currentUser, users, new com.smartschedule.plan.PlanService(new com.smartschedule.plan.PlanProperties("ALL_PRO")));
    }

    @Autowired
    public UserController(CurrentUserService currentUser, UserRepository users, com.smartschedule.plan.PlanService planService) {
        this.currentUser = currentUser;
        this.users = users;
        this.planService = planService != null ? planService : new com.smartschedule.plan.PlanService(new com.smartschedule.plan.PlanProperties("ALL_PRO"));
    }

    @GetMapping
    public UserResponse get() {
        return toResponse(currentUser.requireUser());
    }

    @PatchMapping
    @Transactional
    public UserResponse update(@Valid @RequestBody UpdateUserRequest request) {
        User user = currentUser.requireUser();
        String name = request.name() == null ? user.getDisplayName() : request.name().trim();
        String timezone = request.timezone() == null ? user.getTimezone() : request.timezone().trim();
        String locale = request.locale() == null ? user.getLocale() : request.locale().trim();
        String avatarUrl = request.avatarUrl() == null ? user.getAvatarUrl() : request.avatarUrl().trim();
        if (name.isBlank()) {
            throw new DomainException("INVALID_PROFILE", 422, "Display name cannot be blank.");
        }
        try {
            ZoneId.of(timezone);
        } catch (RuntimeException exception) {
            throw new DomainException("INVALID_TIMEZONE", 422, "Timezone must be a valid IANA timezone.");
        }
        user.updateProfile(name, timezone, locale, avatarUrl == null || avatarUrl.isBlank() ? null : avatarUrl);
        if (users != null) {
            users.save(user);
        }
        return toResponse(user);
    }

    @PostMapping("/upgrade-pro")
    public UserResponse upgradePro() {
        User user = currentUser.requireUser();
        user.setTier("PRO");
        if (users != null) {
            user = users.save(user);
        }
        return toResponse(user);
    }

    @PostMapping("/downgrade-free")
    public UserResponse downgradeFree() {
        User user = currentUser.requireUser();
        user.setTier("FREE");
        if (users != null) {
            user = users.save(user);
        }
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getAvatarUrl(),
                user.getTimezone(), user.getLocale(), user.getCreatedAt(), planService.getEffectiveTier(user));
    }
}
