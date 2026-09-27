"""
Mobility analyzer for campus routing, transition health, and trajectory analysis.
Detects:
1. Route Zig-Zag (e.g. A -> B -> A -> C)
2. Domino Transition Risks (chains of tight consecutive transitions)
3. Travel vs. Session Imbalance (travel time excessive relative to session length)
"""

from datetime import datetime
from typing import Dict, List, Optional
from models.contracts import ExistingEventInput, MobilityFinding, AnalyzeMobilityResponse


def analyze_mobility(
    events: List[ExistingEventInput],
    travel_matrix: Dict[str, int],
    min_transition_buffer_minutes: int = 10,
    travel_heavy_ratio_threshold: float = 0.5,
) -> AnalyzeMobilityResponse:
    """
    Analyzes mobility across a chronologically sorted sequence of physical events.
    """
    findings: List[MobilityFinding] = []
    
    # Filter physical events that have locations and sort chronologically
    physical_events = [
        e for e in events
        if e.location and e.location.strip() and e.location.strip().upper() not in ("ONLINE", "TBD", "NONE")
    ]
    physical_events.sort(key=lambda e: e.startsAt)

    total_travel_minutes = 0
    transition_count = 0

    if len(physical_events) < 2:
        return AnalyzeMobilityResponse(
            findings=[],
            totalTravelMinutes=0,
            transitionCount=0,
            routeEfficiencyScore=1.0,
        )

    # Group by calendar day to evaluate intra-day transitions
    days: Dict[str, List[ExistingEventInput]] = {}
    for ev in physical_events:
        day_key = ev.startsAt.strftime("%Y-%m-%d")
        days.setdefault(day_key, []).append(ev)

    for day_str, day_events in days.items():
        if len(day_events) < 2:
            continue

        day_events.sort(key=lambda e: e.startsAt)

        # 1. Travel vs Session & General Transition Accumulation
        consecutive_tight_count = 0
        tight_chain_events: List[str] = []

        for i in range(len(day_events) - 1):
            curr = day_events[i]
            nxt = day_events[i + 1]

            loc_from = (curr.locationId or curr.location or "").strip()
            loc_to = (nxt.locationId or nxt.location or "").strip()

            if not loc_from or not loc_to or loc_from.lower() == loc_to.lower():
                consecutive_tight_count = 0
                tight_chain_events = []
                continue

            matrix_key = f"{loc_from}->{loc_to}"
            # Default travel estimate 10 min if not in matrix but different physical locations
            travel_time = travel_matrix.get(matrix_key, travel_matrix.get(f"{loc_to}->{loc_from}", 10))
            total_travel_minutes += travel_time
            transition_count += 1

            available_gap = int((nxt.startsAt - curr.endsAt).total_seconds() / 60)

            # Check Domino Transition Risk: Gap is tight (< travel_time + buffer)
            is_tight = available_gap < (travel_time + min_transition_buffer_minutes)
            if is_tight:
                consecutive_tight_count += 1
                if not tight_chain_events:
                    tight_chain_events.append(curr.id)
                tight_chain_events.append(nxt.id)
            else:
                if consecutive_tight_count >= 2:
                    findings.append(
                        MobilityFinding(
                            type="DOMINO_TRANSITION_RISK",
                            severity="CRITICAL" if consecutive_tight_count >= 3 else "WARNING",
                            affectedEventIds=list(dict.fromkeys(tight_chain_events)),
                            affectedLocations=[e.location or "" for e in day_events if e.id in tight_chain_events],
                            transitionCount=consecutive_tight_count,
                            travelMinutes=total_travel_minutes,
                            explanation=(
                                f"Chuỗi {consecutive_tight_count} bước di chuyển liên tiếp có thời gian đệm quá sát "
                                f"vào ngày {day_str}. Bất kỳ sự chậm trễ nào ở phiên học trước sẽ gây hiệu ứng domino làm trễ các phiên tiếp theo."
                            ),
                        )
                    )
                consecutive_tight_count = 0
                tight_chain_events = []

            # Check Travel Heavy Session: travel time >= ratio of session duration
            nxt_duration = max(1, int((nxt.endsAt - nxt.startsAt).total_seconds() / 60))
            ratio = round(travel_time / nxt_duration, 2)
            if ratio >= travel_heavy_ratio_threshold or (travel_time >= 25 and nxt_duration <= 45):
                findings.append(
                    MobilityFinding(
                        type="TRAVEL_HEAVY_SESSION",
                        severity="WARNING",
                        affectedEventIds=[curr.id, nxt.id],
                        affectedLocations=[loc_from, loc_to],
                        travelMinutes=travel_time,
                        sessionMinutes=nxt_duration,
                        ratio=ratio,
                        explanation=(
                            f"Thời gian di chuyển ({travel_time}p từ '{curr.title}' sang '{nxt.title}') "
                            f"chiếm tỉ lệ cao ({int(ratio * 100)}%) so với thời lượng phiên học ({nxt_duration}p)."
                        ),
                    )
                )

        if consecutive_tight_count >= 2:
            findings.append(
                MobilityFinding(
                    type="DOMINO_TRANSITION_RISK",
                    severity="CRITICAL" if consecutive_tight_count >= 3 else "WARNING",
                    affectedEventIds=list(dict.fromkeys(tight_chain_events)),
                    affectedLocations=[e.location or "" for e in day_events if e.id in tight_chain_events],
                    transitionCount=consecutive_tight_count,
                    travelMinutes=total_travel_minutes,
                    explanation=(
                        f"Chuỗi {consecutive_tight_count} bước di chuyển liên tiếp có thời gian đệm quá sát "
                        f"vào ngày {day_str}."
                    ),
                )
            )

        # 2. Route Zig-Zag Detection: A -> B -> A (or A -> B -> A -> C)
        for i in range(len(day_events) - 2):
            e1 = day_events[i]
            e2 = day_events[i + 1]
            e3 = day_events[i + 2]

            l1 = (e1.locationId or e1.location or "").strip().lower()
            l2 = (e2.locationId or e2.location or "").strip().lower()
            l3 = (e3.locationId or e3.location or "").strip().lower()

            # Pattern: l1 != l2 and l1 == l3 (e.g. Library -> Alpha -> Library)
            if l1 and l2 and l3 and l1 != l2 and l1 == l3:
                t1 = travel_matrix.get(f"{l1}->{l2}", travel_matrix.get(f"{l2}->{l1}", 10))
                t2 = travel_matrix.get(f"{l2}->{l3}", travel_matrix.get(f"{l3}->{l2}", 10))
                findings.append(
                    MobilityFinding(
                        type="ZIG_ZAG_ROUTE",
                        severity="WARNING",
                        affectedEventIds=[e1.id, e2.id, e3.id],
                        affectedLocations=[e1.location or "", e2.location or "", e3.location or ""],
                        transitionCount=2,
                        travelMinutes=t1 + t2,
                        explanation=(
                            f"Phát hiện lịch trình di chuyển vòng (Zig-Zag): '{e1.location}' -> '{e2.location}' -> '{e3.location}'. "
                            f"Gây lãng phí {t1 + t2} phút di chuyển qua lại giữa các khu vực."
                        ),
                    )
                )

    # Route efficiency score: penalize zig-zag and heavy travel
    penalty = len(findings) * 0.15 + (total_travel_minutes / 300.0) * 0.1
    route_efficiency_score = max(0.2, round(1.0 - min(0.8, penalty), 2))

    return AnalyzeMobilityResponse(
        findings=findings,
        totalTravelMinutes=total_travel_minutes,
        transitionCount=transition_count,
        routeEfficiencyScore=route_efficiency_score,
    )
