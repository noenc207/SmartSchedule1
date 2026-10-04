package com.smartschedule.ai.infrastructure;

import com.smartschedule.ai.domain.AiUserDailyUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiUserDailyUsageRepository extends JpaRepository<AiUserDailyUsage, UUID> {

    @Query("SELECT u FROM AiUserDailyUsage u WHERE u.user.id = :userId AND u.usageDate = :usageDate")
    Optional<AiUserDailyUsage> findByUserIdAndUsageDate(@Param("userId") UUID userId, @Param("usageDate") LocalDate usageDate);
}
