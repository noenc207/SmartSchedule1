package com.smartschedule.auth.infrastructure;

import com.smartschedule.auth.domain.RegistrationKey;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistrationKeyRepository extends JpaRepository<RegistrationKey, UUID> {
    Optional<RegistrationKey> findByKeyHash(String keyHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RegistrationKey r WHERE r.keyHash = :keyHash")
    Optional<RegistrationKey> findByKeyHashForUpdate(@Param("keyHash") String keyHash);

    boolean existsByKeyHashAndStatus(String keyHash, String status);
}
