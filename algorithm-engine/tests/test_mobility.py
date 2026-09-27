from datetime import datetime, timezone, timedelta
from models.contracts import ExistingEventInput
from routing.mobility_analyzer import analyze_mobility


def test_mobility_empty_and_single():
    res = analyze_mobility([], {})
    assert len(res.findings) == 0
    assert res.routeEfficiencyScore == 1.0

    single = [
        ExistingEventInput(
            id="e1",
            title="Class A",
            startsAt=datetime.now(timezone.utc),
            endsAt=datetime.now(timezone.utc) + timedelta(hours=1),
            location="Building Alpha",
        )
    ]
    res2 = analyze_mobility(single, {})
    assert len(res2.findings) == 0
    assert res2.routeEfficiencyScore == 1.0


def test_detect_zig_zag_route():
    base = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    # A -> B -> A pattern on same day
    events = [
        ExistingEventInput(
            id="e1", title="Math",
            startsAt=base, endsAt=base + timedelta(minutes=60),
            location="Hall A", locationId="loc_a"
        ),
        ExistingEventInput(
            id="e2", title="Physics",
            startsAt=base + timedelta(minutes=80), endsAt=base + timedelta(minutes=140),
            location="Hall B", locationId="loc_b"
        ),
        ExistingEventInput(
            id="e3", title="Chemistry",
            startsAt=base + timedelta(minutes=160), endsAt=base + timedelta(minutes=220),
            location="Hall A", locationId="loc_a"
        ),
    ]
    travel_matrix = {"loc_a->loc_b": 15, "loc_b->loc_a": 15}
    res = analyze_mobility(events, travel_matrix)
    
    zig_zags = [f for f in res.findings if f.type == "ZIG_ZAG_ROUTE"]
    assert len(zig_zags) == 1
    assert zig_zags[0].affectedEventIds == ["e1", "e2", "e3"]
    assert zig_zags[0].travelMinutes == 30


def test_detect_domino_transition_risk():
    base = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    # Chain of transitions where gap < travel_time + min_buffer (10 min)
    # Gap 15 min, travel 15 min -> gap < 15 + 10 = 25 -> tight!
    events = [
        ExistingEventInput(
            id="e1", title="Event 1",
            startsAt=base, endsAt=base + timedelta(minutes=60),
            location="Alpha", locationId="alpha"
        ),
        ExistingEventInput(
            id="e2", title="Event 2",
            startsAt=base + timedelta(minutes=75), endsAt=base + timedelta(minutes=135),
            location="Beta", locationId="beta"
        ),
        ExistingEventInput(
            id="e3", title="Event 3",
            startsAt=base + timedelta(minutes=150), endsAt=base + timedelta(minutes=210),
            location="Gamma", locationId="gamma"
        ),
    ]
    travel_matrix = {"alpha->beta": 15, "beta->gamma": 15}
    res = analyze_mobility(events, travel_matrix, min_transition_buffer_minutes=10)
    
    dominos = [f for f in res.findings if f.type == "DOMINO_TRANSITION_RISK"]
    assert len(dominos) >= 1
    assert dominos[0].transitionCount >= 2


def test_detect_travel_heavy_session():
    base = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    # Session length 30 min, travel 25 min -> ratio 25/30 = 0.83 >= 0.50
    events = [
        ExistingEventInput(
            id="e1", title="Main Campus",
            startsAt=base, endsAt=base + timedelta(minutes=60),
            location="Main", locationId="main"
        ),
        ExistingEventInput(
            id="e2", title="Quick Meet",
            startsAt=base + timedelta(minutes=90), endsAt=base + timedelta(minutes=120),
            location="Off Campus Lab", locationId="lab"
        ),
    ]
    travel_matrix = {"main->lab": 25}
    res = analyze_mobility(events, travel_matrix, travel_heavy_ratio_threshold=0.5)
    
    travel_heavy = [f for f in res.findings if f.type == "TRAVEL_HEAVY_SESSION"]
    assert len(travel_heavy) == 1
    assert travel_heavy[0].travelMinutes == 25
    assert travel_heavy[0].sessionMinutes == 30
