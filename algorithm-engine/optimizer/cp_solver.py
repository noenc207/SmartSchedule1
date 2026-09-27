"""
Deterministic CP-SAT Constraint Programming Solver for SmartSchedule.
Uses Google OR-Tools CP-SAT to produce mathematically optimal, conflict-free schedules.
"""

import hashlib
import time
from datetime import datetime, date, time as dt_time, timedelta
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from ortools.sat.python import cp_model

from models.contracts import (
    DeadlineRiskItem,
    ExistingEventInput,
    MobilityFinding,
    OptimizationSummary,
    OptimizeRequest,
    OptimizeResponse,
    ProposedSlot,
    SchedulingPreferencesInput,
    TaskInput,
    UnscheduledItem,
)
from routing.mobility_analyzer import analyze_mobility


PRIORITY_WEIGHTS = {
    "URGENT": 1000,
    "HIGH": 500,
    "MEDIUM": 200,
    "LOW": 100,
}


def _partition_task(task: TaskInput) -> List[int]:
    """
    Partitions a task's remaining minutes into session chunks
    respecting minimumSessionMinutes and maximumSessionMinutes.
    """
    remaining = task.remainingMinutes
    if remaining <= 0:
        return []

    min_s = max(15, task.minimumSessionMinutes)
    max_s = max(min_s, task.maximumSessionMinutes)

    if not task.allowSplitting or remaining <= max_s:
        # Single session (even if below min_s when task has little remaining)
        return [remaining]

    # Target chunk size around 60-90m
    target_s = min(max_s, max(min_s, 60))
    chunks: List[int] = []

    while remaining > max_s:
        chunk = min(max_s, target_s)
        chunks.append(chunk)
        remaining -= chunk

    if remaining >= min_s:
        chunks.append(remaining)
    elif remaining > 0:
        # Remainder is smaller than min_s: merge into the last chunk if possible, or add as is
        if chunks and (chunks[-1] + remaining <= max_s):
            chunks[-1] += remaining
        else:
            chunks.append(remaining)

    return chunks


def _get_day_unavailable_windows(
    d_date: date,
    day_of_week: int,  # 1=Mon .. 7=Sun
    availability_windows: list,
    from_dt: datetime,
    to_dt: datetime,
    tz: ZoneInfo,
) -> List[Tuple[int, int]]:
    """
    Computes intervals of unavailable minutes on a given day relative to from_dt.
    """
    d_start_dt = datetime.combine(d_date, dt_time.min, tzinfo=tz)
    d_end_dt = datetime.combine(d_date + timedelta(days=1), dt_time.min, tzinfo=tz)

    day_m_start = max(0, int((max(from_dt, d_start_dt) - from_dt).total_seconds() / 60))
    day_m_end = min(
        int((to_dt - from_dt).total_seconds() / 60),
        int((min(to_dt, d_end_dt) - from_dt).total_seconds() / 60),
    )

    if day_m_start >= day_m_end:
        return []

    matching = [
        w for w in availability_windows
        if w.enabled and w.dayOfWeek == day_of_week
    ]

    if not matching:
        # Entire day is unavailable
        return [(day_m_start, day_m_end)]

    # Parse enabled windows into minute offsets from from_dt
    avail_ranges: List[Tuple[int, int]] = []
    for w in matching:
        sh, sm, *rest = [int(p) for p in w.startTime.split(":")]
        eh, em, *rest = [int(p) for p in w.endTime.split(":")]
        w_start_dt = datetime.combine(d_date, dt_time(sh, sm), tzinfo=tz)
        w_end_dt = datetime.combine(d_date, dt_time(eh, em), tzinfo=tz)

        s_min = max(day_m_start, int((w_start_dt - from_dt).total_seconds() / 60))
        e_min = min(day_m_end, int((w_end_dt - from_dt).total_seconds() / 60))

        if s_min < e_min:
            avail_ranges.append((s_min, e_min))

    avail_ranges.sort(key=lambda r: r[0])

    if not avail_ranges:
        return [(day_m_start, day_m_end)]

    # Invert available ranges to get unavailable ranges
    unavail: List[Tuple[int, int]] = []
    curr = day_m_start
    for a_start, a_end in avail_ranges:
        if curr < a_start:
            unavail.append((curr, a_start))
        curr = max(curr, a_end)

    if curr < day_m_end:
        unavail.append((curr, day_m_end))

    return unavail


def solve_schedule_optimization(request: OptimizeRequest) -> OptimizeResponse:
    """
    Executes deterministic schedule optimization using OR-Tools CP-SAT.
    """
    start_cpu_time = time.perf_counter()

    tz = ZoneInfo(request.timezone)
    from_dt = request.fromTime.astimezone(tz)
    to_dt = request.toTime.astimezone(tz)

    horizon_minutes = max(15, int((to_dt - from_dt).total_seconds() / 60))
    granularity = max(1, request.granularityMinutes)

    model = cp_model.CpModel()
    all_intervals: List[cp_model.IntervalVar] = []

    # 1. Map unavailable time from availability windows
    curr_day = from_dt.date()
    end_day = to_dt.date()
    num_days = (end_day - curr_day).days + 1

    day_minute_ranges: List[Tuple[int, int]] = []

    for d_idx in range(num_days):
        d_date = curr_day + timedelta(days=d_idx)
        # Compute exact minute range of this day relative to from_dt
        d_start_dt = datetime.combine(d_date, dt_time.min, tzinfo=tz)
        d_end_dt = datetime.combine(d_date, dt_time.max, tzinfo=tz)

        m_start = max(0, int((d_start_dt - from_dt).total_seconds() / 60))
        m_end = min(horizon_minutes, int((d_end_dt - from_dt).total_seconds() / 60))

        if m_start < m_end:
            day_minute_ranges.append((m_start, m_end))
            iso_weekday = d_date.isoweekday()  # 1=Mon, 7=Sun
            unavail_spans = _get_day_unavailable_windows(
                d_date,
                iso_weekday,
                request.availabilityWindows,
                from_dt,
                to_dt,
                tz,
            )
            for u_start, u_end in unavail_spans:
                u_dur = u_end - u_start
                if u_dur > 0:
                    fixed_iv = model.NewFixedSizeIntervalVar(
                        u_start, u_dur, f"unavail_{d_idx}_{u_start}"
                    )
                    all_intervals.append(fixed_iv)

    # 2. Fixed existing events (hard constraints)
    fixed_event_blocks: List[Tuple[int, int, ExistingEventInput]] = []
    for ev in request.existingEvents:
        ev_start = max(0, int((ev.startsAt.astimezone(tz) - from_dt).total_seconds() / 60))
        ev_end = min(horizon_minutes, int((ev.endsAt.astimezone(tz) - from_dt).total_seconds() / 60))
        ev_dur = ev_end - ev_start
        if ev_dur > 0:
            fixed_iv = model.NewFixedSizeIntervalVar(ev_start, ev_dur, f"fixed_{ev.id}")
            all_intervals.append(fixed_iv)
            fixed_event_blocks.append((ev_start, ev_end, ev))

    # 3. Create CP-SAT variables for task sessions
    min_break = max(0, request.preferences.minBreakMinutes)
    max_daily_minutes = request.preferences.maxDailyMinutes

    task_chunks_meta: List[Dict] = []
    objective_terms: List[cp_model.LinearExpr] = []

    # Sort tasks deterministically: URGENT first, earlier deadline first, id
    sorted_tasks = sorted(
        request.tasks,
        key=lambda t: (
            -PRIORITY_WEIGHTS.get(t.priority.upper(), 200),
            t.deadline or datetime.max.replace(tzinfo=tz),
            t.id,
        ),
    )

    for task in sorted_tasks:
        chunks = _partition_task(task)
        if not chunks:
            continue

        priority_weight = PRIORITY_WEIGHTS.get(task.priority.upper(), 200)
        p_weight_factor = int(priority_weight * request.preferences.priorityWeight)

        task_chunk_vars: List[Dict] = []

        for c_idx, dur in enumerate(chunks):
            p_var = model.NewBoolVar(f"p_{task.id}_{c_idx}")
            max_start = max(0, horizon_minutes - dur)
            max_steps = max_start // granularity

            step_var = model.NewIntVar(0, max_steps, f"step_{task.id}_{c_idx}")
            start_var = model.NewIntVar(0, max_start, f"start_{task.id}_{c_idx}")
            model.Add(start_var == step_var * granularity)

            end_var = model.NewIntVar(dur, horizon_minutes, f"end_{task.id}_{c_idx}")
            model.Add(end_var == start_var + dur)

            interval_var = model.NewOptionalIntervalVar(
                start_var, dur, end_var, p_var, f"interval_{task.id}_{c_idx}"
            )
            all_intervals.append(interval_var)

            # Deadline constraint
            if task.deadline:
                task_deadline_dt = task.deadline.astimezone(tz)
                deadline_min = int((task_deadline_dt - from_dt).total_seconds() / 60)
                if deadline_min < dur:
                    # Infeasible before deadline
                    model.Add(p_var == 0)
                else:
                    model.Add(end_var <= deadline_min).OnlyEnforceIf(p_var)

            # Objective components:
            # 1. Scheduled minutes bonus
            scheduled_bonus = dur * p_weight_factor * 10
            # 2. Earlier placement preference (early bonus)
            early_bonus = model.NewIntVar(0, horizon_minutes, f"early_{task.id}_{c_idx}")
            model.Add(early_bonus == (horizon_minutes - start_var)).OnlyEnforceIf(p_var)
            model.Add(early_bonus == 0).OnlyEnforceIf(p_var.Not())
            objective_terms.append(p_var * scheduled_bonus + early_bonus)

            chunk_meta = {
                "task": task,
                "chunkIndex": c_idx,
                "chunkCount": len(chunks),
                "duration": dur,
                "p_var": p_var,
                "start_var": start_var,
                "end_var": end_var,
            }
            task_chunk_vars.append(chunk_meta)
            task_chunks_meta.append(chunk_meta)

        # Ordering of chunks for the same task
        for k in range(len(task_chunk_vars) - 1):
            curr_c = task_chunk_vars[k]
            next_c = task_chunk_vars[k + 1]
            # Next chunk can only exist if current chunk exists
            model.Add(next_c["p_var"] <= curr_c["p_var"])
            # Next chunk must start after current chunk ends + min break
            model.Add(next_c["start_var"] >= curr_c["end_var"] + min_break).OnlyEnforceIf(
                [curr_c["p_var"], next_c["p_var"]]
            )

    # 4. Global NoOverlap for all intervals
    model.AddNoOverlap(all_intervals)

    # 5. Daily capacity constraints
    for d_idx, (d_start, d_end) in enumerate(day_minute_ranges):
        day_chunk_indicators: List[cp_model.LinearExpr] = []
        for cm in task_chunks_meta:
            dur = cm["duration"]
            # Indicator whether this chunk starts on day d
            in_day = model.NewBoolVar(f"in_day_{cm['task'].id}_{cm['chunkIndex']}_{d_idx}")
            is_after_d_start = model.NewBoolVar(f"aft_{cm['task'].id}_{cm['chunkIndex']}_{d_idx}")
            is_before_d_end = model.NewBoolVar(f"bef_{cm['task'].id}_{cm['chunkIndex']}_{d_idx}")

            model.Add(cm["start_var"] >= d_start).OnlyEnforceIf(is_after_d_start)
            model.Add(cm["start_var"] < d_start).OnlyEnforceIf(is_after_d_start.Not())
            model.Add(cm["start_var"] < d_end).OnlyEnforceIf(is_before_d_end)
            model.Add(cm["start_var"] >= d_end).OnlyEnforceIf(is_before_d_end.Not())

            # in_day <=> (is_after_d_start and is_before_d_end and p_var)
            model.AddBoolAnd([is_after_d_start, is_before_d_end, cm["p_var"]]).OnlyEnforceIf(in_day)
            model.AddBoolOr([is_after_d_start.Not(), is_before_d_end.Not(), cm["p_var"].Not()]).OnlyEnforceIf(in_day.Not())

            day_chunk_indicators.append(in_day * dur)

        if day_chunk_indicators:
            model.Add(sum(day_chunk_indicators) <= max_daily_minutes)

    # 6. Consecutive intensive session limit
    max_intensive_mins = request.preferences.maxConsecutiveIntensiveMinutes
    high_intensity_chunks = [
        cm for cm in task_chunks_meta
        if cm["task"].intensity.upper() == "HIGH" or cm["duration"] >= 90
    ]

    for i in range(len(high_intensity_chunks)):
        for j in range(i + 1, len(high_intensity_chunks)):
            c1 = high_intensity_chunks[i]
            c2 = high_intensity_chunks[j]
            total_dur = c1["duration"] + c2["duration"]
            if total_dur > max_intensive_mins:
                # If both are scheduled, enforce at least minBreak * 2 or gap >= 30m
                gap_ok_1 = model.NewBoolVar(f"gap_ok1_{i}_{j}")
                gap_ok_2 = model.NewBoolVar(f"gap_ok2_{i}_{j}")
                model.Add(c2["start_var"] >= c1["end_var"] + max(30, min_break * 2)).OnlyEnforceIf(gap_ok_1)
                model.Add(c1["start_var"] >= c2["end_var"] + max(30, min_break * 2)).OnlyEnforceIf(gap_ok_2)
                model.AddBoolOr([gap_ok_1, gap_ok_2]).OnlyEnforceIf([c1["p_var"], c2["p_var"]])

    # 7. Maximize Objective
    if objective_terms:
        model.Maximize(sum(objective_terms))

    # 8. Solve with deterministic parameters
    solver = cp_model.CpSolver()
    solver.parameters.random_seed = 42
    solver.parameters.max_time_in_seconds = 10.0
    solver.parameters.num_workers = 1  # Absolute bitwise determinism

    status = solver.Solve(model)

    computation_ms = max(1, int((time.perf_counter() - start_cpu_time) * 1000))

    proposed_slots: List[ProposedSlot] = []
    scheduled_minutes_by_task: Dict[str, int] = {}

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Extract scheduled slots
        for cm in task_chunks_meta:
            if solver.Value(cm["p_var"]) == 1:
                start_min = solver.Value(cm["start_var"])
                dur = cm["duration"]
                slot_start_dt = from_dt + timedelta(minutes=start_min)
                slot_end_dt = slot_start_dt + timedelta(minutes=dur)

                task = cm["task"]
                scheduled_minutes_by_task[task.id] = (
                    scheduled_minutes_by_task.get(task.id, 0) + dur
                )

                # Generate machine-readable explanation tags
                reasons: List[str] = ["NO_HARD_CONFLICT"]
                if task.deadline and slot_end_dt <= task.deadline.astimezone(tz):
                    reasons.append("BEFORE_DEADLINE")
                if task.priority.upper() in ("URGENT", "HIGH"):
                    reasons.append("PRIORITY_PRESERVED")
                reasons.append("BALANCED_DAILY_LOAD")

                # Check location continuity with adjacent fixed event
                slot_loc = (task.location or "").strip()
                if slot_loc:
                    for f_start, f_end, f_ev in fixed_event_blocks:
                        if abs(start_min - f_end) <= 30 and f_ev.location == slot_loc:
                            reasons.append("SAME_LOCATION_AS_PREVIOUS_EVENT")
                            break

                proposed_slots.append(
                    ProposedSlot(
                        taskId=task.id,
                        title=task.title,
                        categoryId=task.categoryId,
                        startsAt=slot_start_dt.isoformat(),
                        endsAt=slot_end_dt.isoformat(),
                        score=95 if task.priority.upper() == "URGENT" else 90,
                        sessionIndex=cm["chunkIndex"] + 1,
                        sessionCount=cm["chunkCount"],
                        location=task.location,
                        locationId=task.locationId,
                        reasons=reasons,
                    )
                )

    # Sort slots chronologically
    proposed_slots.sort(key=lambda s: s.startsAt)

    # Identify unscheduled items and deadline risks
    unscheduled: List[UnscheduledItem] = []
    deadline_risks: List[DeadlineRiskItem] = []

    for task in sorted_tasks:
        scheduled_mins = scheduled_minutes_by_task.get(task.id, 0)
        remaining_needed = task.remainingMinutes - scheduled_mins

        if remaining_needed > 0:
            # Determine structured reason
            reason_code = "NO_AVAILABLE_SLOT"
            if task.deadline:
                task_deadline_dt = task.deadline.astimezone(tz)
                deadline_min = int((task_deadline_dt - from_dt).total_seconds() / 60)
                if deadline_min <= 0 or deadline_min < task.remainingMinutes or deadline_min < task.minimumSessionMinutes:
                    reason_code = "DEADLINE_INFEASIBLE"
                else:
                    reason_code = "INSUFFICIENT_CAPACITY"

            unscheduled.append(
                UnscheduledItem(
                    taskId=task.id,
                    taskTitle=task.title,
                    reason=reason_code,
                    requiredMinutes=task.remainingMinutes,
                    availableMinutes=scheduled_mins,
                    deficitMinutes=remaining_needed,
                    message=(
                        f"Không đủ dung lượng khả dụng trước hạn chót cho tác vụ '{task.title}'."
                        if reason_code == "DEADLINE_INFEASIBLE"
                        else f"Tác vụ '{task.title}' còn thiếu {remaining_needed} phút chưa tìm được khung giờ phù hợp."
                    ),
                )
            )

        if task.deadline:
            task_deadline_dt = task.deadline.astimezone(tz)
            before_deadline_mins = sum(
                int((datetime.fromisoformat(s.endsAt) - datetime.fromisoformat(s.startsAt)).total_seconds() / 60)
                for s in proposed_slots
                if s.taskId == task.id and datetime.fromisoformat(s.endsAt) <= task_deadline_dt
            )
            deficit = task.remainingMinutes - before_deadline_mins
            if deficit > 0:
                level = "HIGH" if before_deadline_mins == 0 else "TIGHT"
                deadline_risks.append(
                    DeadlineRiskItem(
                        taskId=task.id,
                        taskTitle=task.title,
                        deadline=task_deadline_dt.isoformat(),
                        requiredMinutes=task.remainingMinutes,
                        availableMinutes=before_deadline_mins,
                        level=level,
                        message=(
                            f"Rủi ro hạn chót cấp độ {level}: Tác vụ '{task.title}' cần {task.remainingMinutes} phút "
                            f"nhưng mới xếp được {before_deadline_mins} phút trước {task_deadline_dt.strftime('%H:%M %d/%m')}."
                        ),
                    )
                )

    # Combine fixed events + proposed slots for mobility analysis
    combined_mobility_events: List[ExistingEventInput] = list(request.existingEvents)
    for s in proposed_slots:
        if s.location:
            combined_mobility_events.append(
                ExistingEventInput(
                    id=f"proposed_{s.taskId}_{s.sessionIndex}",
                    title=s.title,
                    startsAt=datetime.fromisoformat(s.startsAt),
                    endsAt=datetime.fromisoformat(s.endsAt),
                    fixed=False,
                    locked=False,
                    location=s.location,
                    locationId=s.locationId,
                    taskId=s.taskId,
                )
            )

    mobility_result = analyze_mobility(
        combined_mobility_events,
        travel_matrix=request.travelMatrix,
    )

    total_planned = sum(
        int((datetime.fromisoformat(s.endsAt) - datetime.fromisoformat(s.startsAt)).total_seconds() / 60)
        for s in proposed_slots
    )
    total_required = sum(t.remainingMinutes for t in request.tasks)
    remaining_unplanned = max(0, total_required - total_planned)

    # Compute deterministic fingerprint
    slot_hashes = [f"{s.taskId}:{s.startsAt}:{s.endsAt}" for s in proposed_slots]
    plan_data = f"{request.scheduleId}|{request.fromTime.isoformat()}|{request.toTime.isoformat()}|{'|'.join(slot_hashes)}"
    fingerprint = hashlib.sha256(plan_data.encode("utf-8")).hexdigest()
    plan_id = hashlib.sha256(f"plan_{fingerprint}".encode("utf-8")).hexdigest()[:16]

    return OptimizeResponse(
        planId=f"plan-{plan_id}",
        scheduleId=request.scheduleId,
        fingerprint=fingerprint,
        algorithmVersion="1.0.0",
        scheduleVersion=request.scheduleVersion,
        fromTime=from_dt.isoformat(),
        toTime=to_dt.isoformat(),
        slots=proposed_slots,
        unscheduled=unscheduled,
        deadlineRisks=deadline_risks,
        mobilityFindings=mobility_result.findings,
        summary=OptimizationSummary(
            plannedMinutes=total_planned,
            remainingMinutes=remaining_unplanned,
            hardConflicts=0,
            deadlineRisks=len(deadline_risks),
            computationDurationMs=computation_ms,
        ),
    )
