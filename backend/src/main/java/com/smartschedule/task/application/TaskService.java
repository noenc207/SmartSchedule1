package com.smartschedule.task.application;

import com.smartschedule.auth.application.CurrentUserService;
import com.smartschedule.category.domain.Category;
import com.smartschedule.category.infrastructure.CategoryRepository;
import com.smartschedule.common.audit.ActivityLogService;
import com.smartschedule.common.error.DomainException;
import com.smartschedule.common.web.PageResponse;
import com.smartschedule.schedule.application.AuthorizationService;
import com.smartschedule.schedule.domain.Schedule;
import com.smartschedule.task.api.TaskDtos.*;
import com.smartschedule.task.domain.Task;
import com.smartschedule.task.infrastructure.TaskRepository;
import com.smartschedule.user.domain.User;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {
    private final TaskRepository tasks; private final CategoryRepository categories; private final AuthorizationService authorization;
    private final CurrentUserService currentUser; private final ActivityLogService activity;
    public TaskService(TaskRepository tasks, CategoryRepository categories, AuthorizationService authorization, CurrentUserService currentUser, ActivityLogService activity) {
        this.tasks = tasks; this.categories = categories; this.authorization = authorization; this.currentUser = currentUser; this.activity = activity;
    }
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> list(UUID scheduleId, String status, String priority, UUID categoryId, Instant from, Instant to, Pageable pageable) {
        authorization.requireAccess(scheduleId, currentUser.requireUser().getId());
        String normStatus = normalize(status);
        String normPriority = normalize(priority);
        List<Task> all = tasks.findAllByScheduleId(scheduleId);
        List<Task> filtered = all.stream()
                .filter(t -> normStatus == null || normStatus.equalsIgnoreCase(t.getStatus()))
                .filter(t -> normPriority == null || normPriority.equalsIgnoreCase(t.getPriority()))
                .filter(t -> categoryId == null || (t.getCategory() != null && categoryId.equals(t.getCategory().getId())))
                .filter(t -> from == null || (t.getDeadline() != null && !t.getDeadline().isBefore(from)))
                .filter(t -> to == null || (t.getDeadline() != null && !t.getDeadline().isAfter(to)))
                .sorted(Comparator.comparing(Task::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<Task> paged = start <= end && start < filtered.size() ? filtered.subList(start, end) : List.of();
        org.springframework.data.domain.Page<Task> page = new org.springframework.data.domain.PageImpl<>(paged, pageable, filtered.size());
        return new PageResponse<>(page.getContent().stream().map(this::toResponse).toList(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
    @Transactional public TaskResponse create(UUID scheduleId, TaskRequest r) {
        User user = currentUser.requireUser(); Schedule schedule = authorization.requireEditor(scheduleId, user.getId());
        validate(r); Category category = category(r.categoryId(), user.getId(), schedule.getOwner().getId()); int min = r.minimumSessionMinutes() == null ? 30 : r.minimumSessionMinutes(); int max = r.maximumSessionMinutes() == null ? 120 : r.maximumSessionMinutes();
        Task task = tasks.save(new Task(schedule, user, category, r.title().trim(), r.description(), r.estimatedDurationMinutes(), r.remainingDurationMinutes(),
                value(r.priority(), "MEDIUM", List.of("LOW","MEDIUM","HIGH","URGENT")), r.deadline(), value(r.status(), "TODO", List.of("TODO","IN_PROGRESS","COMPLETED","CANCELLED")),
                r.preferredStartTime(), r.preferredEndTime(), min, max));
        schedule.incrementVersion();
        activity.record(scheduleId, user.getId(), "CREATE_TASK"); return toResponse(task);
    }
    @Transactional(readOnly = true) public TaskResponse get(UUID id) { return toResponse(requireReadable(id)); }
    @Transactional public TaskResponse update(UUID id, TaskRequest r) {
        Task task = requireEditable(id); validate(r); User user = currentUser.requireUser(); int min = r.minimumSessionMinutes() == null ? 30 : r.minimumSessionMinutes(); int max = r.maximumSessionMinutes() == null ? 120 : r.maximumSessionMinutes();
        task.update(category(r.categoryId(), user.getId(), task.getSchedule().getOwner().getId()), r.title().trim(), r.description(), r.estimatedDurationMinutes(), r.remainingDurationMinutes(),
                value(r.priority(), "MEDIUM", List.of("LOW","MEDIUM","HIGH","URGENT")), r.deadline(), value(r.status(), "TODO", List.of("TODO","IN_PROGRESS","COMPLETED","CANCELLED")),
                r.preferredStartTime(), r.preferredEndTime(), min, max);
        task.getSchedule().incrementVersion();
        activity.record(task.getSchedule().getId(), user.getId(), "UPDATE_TASK"); return toResponse(task);
    }
    @Transactional public void delete(UUID id) { Task task = requireEditable(id); task.getSchedule().incrementVersion(); tasks.delete(task); activity.record(task.getSchedule().getId(), currentUser.requireUser().getId(), "DELETE_TASK"); }
    private Task requireEditable(UUID id) {
        Task task = tasks.findById(id).orElseThrow(() -> new DomainException("TASK_NOT_FOUND", 404, "Task not found."));
        authorization.requireEditor(task.getSchedule().getId(), currentUser.requireUser().getId()); return task;
    }
    private Task requireReadable(UUID id) {
        Task task = tasks.findById(id).orElseThrow(() -> new DomainException("TASK_NOT_FOUND", 404, "Task not found."));
        authorization.requireViewer(task.getSchedule().getId(), currentUser.requireUser().getId()); return task;
    }
    private void validate(TaskRequest r) {
        if (r.remainingDurationMinutes() > r.estimatedDurationMinutes()) throw new DomainException("INVALID_TASK_DURATION", 422, "Remaining duration cannot exceed estimate.");
        int min = r.minimumSessionMinutes() == null ? 30 : r.minimumSessionMinutes(); int max = r.maximumSessionMinutes() == null ? 120 : r.maximumSessionMinutes();
        if (min > max) throw new DomainException("INVALID_TASK_DURATION", 422, "Minimum session cannot exceed maximum session.");
        if (r.preferredStartTime() != null && r.preferredEndTime() != null && !r.preferredStartTime().isBefore(r.preferredEndTime())) throw new DomainException("INVALID_TIME_RANGE", 422, "Preferred start must be before preferred end.");
    }
    private Category category(UUID id, UUID ownerId, UUID scheduleOwnerId) {
        return id == null ? null : categories.findByIdAndOwnerId(id, ownerId)
                .or(() -> categories.findByIdAndOwnerId(id, scheduleOwnerId))
                .orElseThrow(() -> new DomainException("CATEGORY_ACCESS_DENIED", 403, "Category is not accessible."));
    }
    private String normalize(String value) { return value == null || value.isBlank() ? null : value.toUpperCase(); }
    private String value(String value, String fallback, List<String> allowed) { String result = normalize(value); result = result == null ? fallback : result; if (!allowed.contains(result)) throw new DomainException("INVALID_TASK_VALUE", 422, "Task status or priority is invalid."); return result; }
    private TaskResponse toResponse(Task t) { return new TaskResponse(t.getId(), t.getSchedule().getId(), t.getOwner().getId(), t.getCategory() == null ? null : t.getCategory().getId(), t.getTitle(), t.getDescription(), t.getEstimatedMinutes(), t.getRemainingMinutes(), t.getPriority(), t.getDeadline(), t.getStatus(), t.getPreferredStart(), t.getPreferredEnd(), t.getMinimumSessionMinutes(), t.getMaximumSessionMinutes(), t.getCreatedAt(), t.getUpdatedAt()); }
}
