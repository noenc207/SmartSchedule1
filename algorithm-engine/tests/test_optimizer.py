import pytest
from datetime import datetime, timezone, timedelta
from models.contracts import (
    OptimizeRequest,
    TaskInput,
    ExistingEventInput,
    AvailabilityWindowInput,
    SchedulingPreferencesInput,
)
from optimizer.cp_solver import solve_schedule_optimization


@pytest.fixture
def base_request():
    now = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    return OptimizeRequest(
        scheduleId="test-sched-1",
        fromTime=now,
        toTime=now + timedelta(days=2),
        timezone="UTC",
        tasks=[],
        existingEvents=[],
        availabilityWindows=[
            AvailabilityWindowInput(dayOfWeek=i, startTime="08:00:00", endTime="20:00:00")
            for i in range(1, 8)
        ],
        preferences=SchedulingPreferencesInput(
            maxDailyMinutes=360,
            minBreakMinutes=15,
            maxConsecutiveIntensiveMinutes=120,
        ),
    )


def test_single_task_scheduled_in_window(base_request):
    base_request.tasks = [
        TaskInput(
            id="t1",
            title="Assignment 1",
            remainingMinutes=60,
            estimatedMinutes=60,
            priority="HIGH",
        )
    ]
    res = solve_schedule_optimization(base_request)
    assert len(res.slots) == 1
    assert res.slots[0].taskId == "t1"
    assert res.slots[0].reasons == ["NO_HARD_CONFLICT", "PRIORITY_PRESERVED", "BALANCED_DAILY_LOAD"]
    assert res.summary.plannedMinutes == 60
    assert res.summary.remainingMinutes == 0
    assert len(res.unscheduled) == 0


def test_fixed_event_no_overlap(base_request):
    start = base_request.fromTime + timedelta(hours=1)
    base_request.existingEvents = [
        ExistingEventInput(
            id="fixed-1",
            title="Lecture Class",
            startsAt=start,
            endsAt=start + timedelta(hours=2),
            fixed=True,
            locked=True,
        )
    ]
    base_request.tasks = [
        TaskInput(
            id="t1",
            title="Study Block",
            remainingMinutes=60,
            estimatedMinutes=60,
            priority="MEDIUM",
        )
    ]
    res = solve_schedule_optimization(base_request)
    assert len(res.slots) == 1
    slot = res.slots[0]
    slot_s = datetime.fromisoformat(slot.startsAt)
    slot_e = datetime.fromisoformat(slot.endsAt)
    # Must not overlap with fixed event [start, start + 2h]
    assert slot_e <= start or slot_s >= (start + timedelta(hours=2))


def test_deadline_infeasible_detection(base_request):
    # Deadline is 30 mins after start, but task requires 60 mins
    base_request.tasks = [
        TaskInput(
            id="t_tight",
            title="Urgent Project",
            remainingMinutes=60,
            estimatedMinutes=60,
            priority="URGENT",
            deadline=base_request.fromTime + timedelta(minutes=30),
        )
    ]
    res = solve_schedule_optimization(base_request)
    assert len(res.slots) == 0
    assert len(res.unscheduled) == 1
    assert res.unscheduled[0].reason == "DEADLINE_INFEASIBLE"
    assert len(res.deadlineRisks) == 1
    assert res.deadlineRisks[0].level == "HIGH"


def test_task_splitting_into_sessions(base_request):
    # Task with 180 remaining minutes, maxSession 90 minutes
    base_request.tasks = [
        TaskInput(
            id="t_split",
            title="Big Project",
            remainingMinutes=180,
            estimatedMinutes=180,
            minimumSessionMinutes=45,
            maximumSessionMinutes=90,
            allowSplitting=True,
        )
    ]
    res = solve_schedule_optimization(base_request)
    assert len(res.slots) >= 2
    total_planned = sum(
        int((datetime.fromisoformat(s.endsAt) - datetime.fromisoformat(s.startsAt)).total_seconds() / 60)
        for s in res.slots
    )
    assert total_planned == 180
    for s in res.slots:
        dur = int((datetime.fromisoformat(s.endsAt) - datetime.fromisoformat(s.startsAt)).total_seconds() / 60)
        assert dur <= 90
        assert dur >= 45


def test_daily_capacity_limit(base_request):
    # 2-day horizon, cap is 120 mins/day. 3 tasks each 90 mins = 270 mins total.
    # Max that can fit is 2 * 120 = 240 mins.
    base_request.preferences.maxDailyMinutes = 120
    base_request.tasks = [
        TaskInput(id="t1", title="Task 1", remainingMinutes=90, estimatedMinutes=90, priority="HIGH"),
        TaskInput(id="t2", title="Task 2", remainingMinutes=90, estimatedMinutes=90, priority="HIGH"),
        TaskInput(id="t3", title="Task 3", remainingMinutes=90, estimatedMinutes=90, priority="LOW"),
    ]
    res = solve_schedule_optimization(base_request)
    # Check that planned minutes per day does not exceed 120
    day1_start = base_request.fromTime
    day1_end = day1_start + timedelta(days=1)
    day1_mins = sum(
        int((datetime.fromisoformat(s.endsAt) - datetime.fromisoformat(s.startsAt)).total_seconds() / 60)
        for s in res.slots
        if datetime.fromisoformat(s.startsAt) < day1_end
    )
    assert day1_mins <= 120
