package com.smartschedule.category.api;

import com.smartschedule.category.api.CategoryDtos.*;
import com.smartschedule.category.application.CategoryService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {
    private final CategoryService service;
    public CategoryController(CategoryService service) { this.service = service; }
    @GetMapping public List<CategoryResponse> list() { return service.list(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public CategoryResponse create(@Valid @RequestBody CategoryRequest r) { return service.create(r); }
    @GetMapping("/{id}") public CategoryResponse get(@PathVariable UUID id) { return service.get(id); }
    @PutMapping("/{id}") public CategoryResponse update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest r) { return service.update(id, r); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}
