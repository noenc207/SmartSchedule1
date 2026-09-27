package com.smartschedule.category.infrastructure;

import com.smartschedule.category.domain.Category;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByOwnerIdOrderByName(UUID ownerId);
    Optional<Category> findByIdAndOwnerId(UUID id, UUID ownerId);
    boolean existsByOwnerIdAndNameIgnoreCase(UUID ownerId, String name);
    boolean existsByOwnerIdAndNameIgnoreCaseAndIdNot(UUID ownerId, String name, UUID id);
}
