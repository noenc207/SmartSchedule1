package com.smartschedule.user.infrastructure;

import com.smartschedule.user.domain.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCaseAndDeletedAtIsNull(String email);
    boolean existsByEmailIgnoreCaseAndDeletedAtIsNull(String email);
    Optional<User> findByGoogleIdAndDeletedAtIsNull(String googleId);
    boolean existsByGoogleIdAndDeletedAtIsNull(String googleId);
    Optional<User> findByGithubIdAndDeletedAtIsNull(String githubId);
    boolean existsByGithubIdAndDeletedAtIsNull(String githubId);
    Optional<User> findByFacebookIdAndDeletedAtIsNull(String facebookId);
    boolean existsByFacebookIdAndDeletedAtIsNull(String facebookId);
}
