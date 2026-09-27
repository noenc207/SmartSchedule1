# SmartSchedule Multi-User Concurrency & Locking Architecture

## 1. Executive Summary

In a multi-user scheduling application, concurrent writes are frequent:
- Users modify their schedule simultaneously from multiple devices (desktop web, mobile).
- Team members concurrently update shared team schedules.
- Background optimization algorithms propose schedule shifts while users create manual events.
- Multiple events can be allocated concurrently to the same backlog task.

SmartSchedule employs a hybrid locking architecture combining **Optimistic Locking** for coarse-grained resource updates and **Pessimistic Write Locking** for strict numeric invariants.

---

## 2. Transaction Isolation Level

SmartSchedule uses PostgreSQL's default **`READ COMMITTED`** isolation level:
- **Dirty Reads**: Completely prevented. Queries only observe data committed before the query began.
- **Performance**: High throughput with minimal row locking overhead.
- **Short-Lived Transactions**: Application transactions strictly span single service operations (e.g. create event, update schedule) using `@Transactional`.
- **Long-Running Algorithm Isolation**: The smart scheduling algorithm generates proposals in memory outside database transactions; writes occur in a single atomic batch with version checks.

---

## 3. Optimistic Locking: Schedule & Plan Integrity

### 3.1 The Problem: Lost Updates
If User A and User B concurrently edit a schedule description or title, the last write wins and silently overwrites the previous change unless versioned. Similarly, if an automated Smart Plan proposal is generated for schedule version $v$, and a user creates an event in the meantime (advancing version to $v+1$), applying the proposal blindly would clobber the user's new event.

### 3.2 Implementation
`Schedule.java` includes a version field mapped with JPA `@Version`:

```java
@Version
@Column(name = "version", nullable = false)
private Long version;
```

Database schema (`V14__add_schedule_version.sql`):
```sql
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0 NOT NULL;
```

### 3.3 Explicit API Version Check & HTTP 409 Conflict
In `ScheduleService.java`:
```java
if (request.version() != null && !request.version().equals(schedule.getVersion())) {
    throw new DomainException(
        "Schedule was modified by another transaction. Expected version " 
        + request.version() + " but found " + schedule.getVersion(),
        "RESOURCE_VERSION_CONFLICT",
        409
    );
}
```

When an HTTP 409 is returned, client applications catch the status code, display an interactive conflict notification to the user, and re-fetch the latest schedule state.

---

## 4. Pessimistic Locking: Task Duration Invariant

### 4.1 The Invariant
Every scheduled task has an estimated duration and remaining duration that must obey:

$$\text{remainingMinutes} = \max\left(0, \; \text{estimatedDurationMinutes} - \sum_{\text{events}} \text{sourceTaskDurationAllocatedMinutes}\right)$$

### 4.2 The Concurrent Event Creation Race Condition
Consider two concurrent requests allocating two 30-minute events to a 60-minute task:
1. **Transaction 1** reads task (remaining = 60).
2. **Transaction 2** reads task (remaining = 60).
3. **Transaction 1** inserts Event 1 (30m) and updates remaining = 30.
4. **Transaction 2** inserts Event 2 (30m) and updates remaining = 30 (based on stale read).
5. **Result**: Invariant violated! The task shows 30 minutes remaining instead of 0.

### 4.3 Solution: `PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`)
To guarantee serialization, `TaskRepository.java` provides a locked lookup:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT t FROM Task t WHERE t.id = :id")
Optional<Task> findByIdWithLock(@Param("id") UUID id);
```

In `EventService.java`:
```java
@Transactional
protected void recalculateTaskRemaining(UUID taskId) {
    if (taskId == null) return;

    // Acquire exclusive row lock on task record
    Task task = taskRepository.findByIdWithLock(taskId)
        .orElseGet(() -> taskRepository.findById(taskId).orElse(null));
    if (task == null) return;

    List<Event> linkedEvents = eventRepository.findBySourceTaskIdAndStatusNot(taskId, EventStatus.CANCELLED);
    int totalAllocated = linkedEvents.stream()
        .mapToInt(e -> e.getSourceTaskDurationAllocatedMinutes() != null 
            ? e.getSourceTaskDurationAllocatedMinutes() 
            : 0)
        .sum();

    int remaining = Math.max(0, task.getEstimatedDurationMinutes() - totalAllocated);
    task.setRemainingDurationMinutes(remaining);
    taskRepository.save(task);
}
```

Because Transaction 2 must wait until Transaction 1 commits, Transaction 2 reads both Event 1 and Event 2, calculating the correct remaining balance of 0 minutes.

---

## 5. Deadlock Prevention Rules

To maintain high concurrency without database deadlocks:

1. **Consistent Lock Hierarchy**:
   Always acquire parent locks before child locks:
   $$\text{Schedule} \longrightarrow \text{Task} \longrightarrow \text{Event}$$
2. **No Network I/O Inside Transactions**:
   External API calls (Google Calendar OAuth, weather services, AI model calls) must NEVER be executed inside active database transaction blocks.
3. **Short Transaction Duration**:
   Keep `@Transactional` methods focused on data persistence and invariant checks.

---

## 6. Automated Concurrency Test Verification

Concurrency safety is verified by automated test suite `MultiUserConcurrencyTest.java`:

| Test Name | Concurrency Profile | Verification Target | Status |
| :--- | :--- | :--- | :--- |
| `testTenConcurrentUsersCompleteIsolation` | 10 parallel threads, 10 distinct users | Zero cross-tenant data leakage, 100% successful independent schedule & task creation | **PASSED** |
| `testOptimisticLockingScheduleVersionConflict` | 2 concurrent update requests | Stale version yields HTTP 409 `RESOURCE_VERSION_CONFLICT` | **PASSED** |
| `testConcurrentEventCreationTaskRemainingDurationInvariant` | 2 parallel event allocations on single task | Pessimistic locking guarantees invariant $\text{remaining} = \max(0, \text{est} - \sum \text{alloc})$ | **PASSED** |
| `testStalePlanProposalRejectedWhenScheduleVersionAdvanced` | Concurrent manual update + plan proposal | Stale proposal application rejected with 409 Conflict | **PASSED** |
