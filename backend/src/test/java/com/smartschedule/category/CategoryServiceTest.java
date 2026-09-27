package com.smartschedule.category;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.application.CategoryService;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.user.domain.User;
import org.junit.jupiter.api.Test;

class CategoryServiceTest {
    @Test
    void rejectsDuplicateCategoryForOwner() {
        CategoryRepository repository = mock(CategoryRepository.class);
        CurrentUserService currentUser = mock(CurrentUserService.class);
        User user = new User("owner@example.com", "hash", "Owner");
        when(currentUser.requireUser()).thenReturn(user);
        when(repository.existsByOwnerIdAndNameIgnoreCase(user.getId(), "Work")).thenReturn(true);

        CategoryService service = new CategoryService(repository, currentUser);

        assertThatThrownBy(() -> service.create(new com.smartschedule.category.api.CategoryDtos.CategoryRequest("Work", "#2563eb", null)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("already exists");
    }
}
