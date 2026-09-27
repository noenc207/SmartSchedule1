package com.smartschedule.auth.application;

import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    private final UserRepository users;

    public CurrentUserService(UserRepository users) {
        this.users = users;
    }

    public User requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID)) {
            throw new AuthException("UNAUTHORIZED", "Authentication required.");
        }
        return users.findById((UUID) authentication.getPrincipal())
                .filter(user -> user.isEnabled() && user.getDeletedAt() == null)
                .orElseThrow(() -> new AuthException("UNAUTHORIZED", "Authentication required."));
    }
}
