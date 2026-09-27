from datetime import datetime, timezone, timedelta
from models.contracts import (
    OptimizeRequest,
    TaskInput,
    ExistingEventInput,
    AvailabilityWindowInput,
)
from optimizer.cp_solver import solve_schedule_optimization


def test_cp_sat_strict_determinism():
    """
    Ensures that identical inputs produce bitwise identical slots, start/end times,
    and identical cryptographic fingerprints across multiple executions.
    """
    now = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    req1 = OptimizeRequest(
        scheduleId="det-sched-1",
        fromTime=now,
        toTime=now + timedelta(days=3),
        timezone="UTC",
        tasks=[
            TaskInput(id="t1", title="Task A", remainingMinutes=60, estimatedMinutes=60, priority="HIGH"),
            TaskInput(id="t2", title="Task B", remainingMinutes=90, estimatedMinutes=90, priority="URGENT"),
            TaskInput(id="t3", title="Task C", remainingMinutes=45, estimatedMinutes=45, priority="MEDIUM"),
        ],
        existingEvents=[
            ExistingEventInput(
                id="e1", title="Morning Lecture",
                startsAt=now + timedelta(hours=2),
                endsAt=now + timedelta(hours=4),
                fixed=True,
            )
        ],
        availabilityWindows=[
            AvailabilityWindowInput(dayOfWeek=i, startTime="08:00:00", endTime="20:00:00")
            for i in range(1, 8)
        ],
    )

    req2 = req1.model_copy(deep=True)

    res1 = solve_schedule_optimization(req1)
    res2 = solve_schedule_optimization(req2)

    assert res1.fingerprint == res2.fingerprint
    assert len(res1.slots) == len(res2.slots)
    for s1, s2 in zip(res1.slots, res2.slots):
        assert s1.taskId == s2.taskId
        assert s1.startsAt == s2.startsAt
        assert s1.endsAt == s2.endsAt
        assert s1.reasons == s2.reasons
