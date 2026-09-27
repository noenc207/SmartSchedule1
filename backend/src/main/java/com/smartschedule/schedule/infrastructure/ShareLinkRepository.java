package com.smartschedule.schedule.infrastructure;

import com.smartschedule.schedule.domain.ShareLink;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShareLinkRepository extends JpaRepository<ShareLink, UUID> {
    List<ShareLink> findAllByScheduleIdOrderByCreatedAtDesc(UUID scheduleId);
    Optional<ShareLink> findByTokenHash(String tokenHash);
    boolean existsByTokenHash(String tokenHash);

    @Query("select s from ShareLink s where s.tokenHash = :tokenHash and s.revokedAt is null and (s.expiresAt is null or s.expiresAt > :now)")
    Optional<ShareLink> findActiveByToken(@Param("tokenHash") String tokenHash, @Param("now") java.time.Instant now);
}