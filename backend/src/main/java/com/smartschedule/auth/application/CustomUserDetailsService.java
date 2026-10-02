package com.smartschedule.auth.application;

import com.smartschedule.user.domain.User;
import com.smartschedule.user.infrastructure.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public CustomUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        User user = users.findByEmailIgnoreCaseAndDeletedAtIsNull(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String password = (user.getPasswordHash() != null && !user.getPasswordHash().isBlank())
                ? user.getPasswordHash()
                : "{noop}*GOOGLE_OAUTH_NO_LOCAL_PASSWORD*";
        return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(password)
                .disabled(!user.isEnabled())
                .authorities("ROLE_USER")
                .build();
    }
}
