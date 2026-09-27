from datetime import datetime, timezone, timedelta
from models.contracts import (
    ExistingEventInput,
    TaskInput,
    WhatIfMutation,
    WhatIfRequest,
)
from simulation.what_if_engine import simulate_what_if


def test_what_if_feasible_no_conflicts():
    now = datetime(2026, 9, 25, 10, 0, tzinfo=timezone.utc)
    req = WhatIfRequest(
        scheduleId="sched-1",
        mutation=WhatIfMutation(
            changeType="EVENT_ADDED",
            newStartsAt=now,
            newEndsAt=now + timedelta(minutes=60),
        ),
        events=[
            ExistingEventInput(
                id="e1",
                title="Class in Evening",
                startsAt=now + timedelta(hours=5),
                endsAt=now + timedelta(hours=6),
                fixed=True,
            )
        ],
    )
    res = simulate_what_if(req)
    assert res.status == "FEASIBLE"
    assert len(res.impact.conflicts) == 0
    assert res.impact.lostCapacityMinutes == 60


def test_what_if_hard_conflict_infeasible():
    now = datetime(2026, 9, 25, 10, 0, tzinfo=timezone.utc)
    req = WhatIfRequest(
        scheduleId="sched-1",
        mutation=WhatIfMutation(
            changeType="EVENT_ADDED",
            newStartsAt=now,
            newEndsAt=now + timedelta(minutes=60),
        ),
        events=[
            ExistingEventInput(
                id="e1",
                title="Fixed Final Exam",
                startsAt=now + timedelta(minutes=15),
                endsAt=now + timedelta(minutes=75),
                fixed=True,
                locked=True,
            )
        ],
    )
    res = simulate_what_if(req)
    assert res.status == "INFEASIBLE"
    assert len(res.impact.conflicts) == 1
    assert res.impact.conflicts[0]["isHardConflict"] is True


def test_what_if_flexible_conflict_generates_alternatives():
    now = datetime(2026, 9, 25, 10, 0, tzinfo=timezone.utc)
    req = WhatIfRequest(
        scheduleId="sched-1",
        mutation=WhatIfMutation(
            changeType="EVENT_ADDED",
            newStartsAt=now,
            newEndsAt=now + timedelta(minutes=60),
        ),
        events=[
            ExistingEventInput(
                id="e_flex",
                title="Self Study Session",
                startsAt=now + timedelta(minutes=15),
                endsAt=now + timedelta(minutes=75),
                fixed=False,
                locked=False,
                taskId="task-123",
            )
        ],
        tasks=[
            TaskInput(id="task-123", title="Chemistry Homework", remainingMinutes=60, estimatedMinutes=60)
        ],
    )
    res = simulate_what_if(req)
    assert res.status == "PARTIAL"
    assert len(res.impact.conflicts) == 1
    assert len(res.alternatives) >= 1
    alt = res.alternatives[0]
    assert alt.movedSessions == 1
    assert len(alt.slots) == 1
    assert alt.slots[0].taskId == "task-123"
