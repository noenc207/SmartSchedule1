package com.smartschedule.integration.google.infrastructure;

import com.smartschedule.integration.google.domain.GoogleImportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GoogleImportJobRepository extends JpaRepository<GoogleImportJob, UUID> {
    List<GoogleImportJob> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
