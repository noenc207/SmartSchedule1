package com.smartschedule.category.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.api.CategoryDtos.*;
import com.smartschedule.category.domain.Category;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.user.domain.User;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {
    private final CategoryRepository categories;
    private final CurrentUserService currentUser;
    public CategoryService(CategoryRepository categories, CurrentUserService currentUser) { this.categories = categories; this.currentUser = currentUser; }
    @Transactional(readOnly = true) public List<CategoryResponse> list() { return categories.findAllByOwnerIdOrderByName(currentUser.requireUser().getId()).stream().map(this::toResponse).toList(); }
    @Transactional public CategoryResponse create(CategoryRequest request) {
        User user = currentUser.requireUser(); ensureUnique(user.getId(), request.name(), null);
        return toResponse(categories.save(new Category(user, request.name().trim(), request.color(), request.icon())));
    }
    @Transactional(readOnly = true) public CategoryResponse get(UUID id) { return toResponse(require(id)); }
    @Transactional public CategoryResponse update(UUID id, CategoryRequest request) {
        Category category = require(id); ensureUnique(category.getOwner().getId(), request.name(), id);
        category.update(request.name().trim(), request.color(), request.icon()); return toResponse(category);
    }
    @Transactional public void delete(UUID id) { categories.delete(require(id)); }
    private Category require(UUID id) { return categories.findByIdAndOwnerId(id, currentUser.requireUser().getId()).orElseThrow(() -> new DomainException("CATEGORY_ACCESS_DENIED", 403, "You do not have access to this category.")); }
    private void ensureUnique(UUID ownerId, String name, UUID id) {
        boolean exists = id == null ? categories.existsByOwnerIdAndNameIgnoreCase(ownerId, name.trim()) : categories.existsByOwnerIdAndNameIgnoreCaseAndIdNot(ownerId, name.trim(), id);
        if (exists) throw new DomainException("DUPLICATE_CATEGORY", 409, "A category with this name already exists.");
    }
    private CategoryResponse toResponse(Category c) { return new CategoryResponse(c.getId(), c.getOwner().getId(), c.getName(), c.getColor(), c.getIcon(), c.getCreatedAt(), c.getUpdatedAt()); }
}
