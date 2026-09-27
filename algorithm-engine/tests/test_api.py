from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["solver"] == "Google OR-Tools CP-SAT"
    assert "SCHEDULE_OPTIMIZATION" in data["features"]


def test_optimize_endpoint():
    now = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    payload = {
        "scheduleId": "sched-api-1",
        "from": now.isoformat(),
        "to": (now + timedelta(days=1)).isoformat(),
        "timezone": "UTC",
        "tasks": [
            {
                "id": "task-api-1",
                "title": "API Test Task",
                "remainingMinutes": 60,
                "estimatedMinutes": 60,
                "priority": "HIGH",
            }
        ],
        "existingEvents": [],
        "availabilityWindows": [
            {
                "dayOfWeek": 5,
                "startTime": "08:00:00",
                "endTime": "18:00:00",
                "enabled": True,
            }
        ],
    }

    res = client.post("/optimize", json=payload, headers={"X-Correlation-Id": "test-corr-123"})
    assert res.status_code == 200
    assert res.headers.get("X-Correlation-Id") == "test-corr-123"
    assert res.headers.get("X-Algorithm-Engine") == "OR-Tools-CP-SAT"
    assert "X-Computation-Time-Ms" in res.headers

    data = res.json()
    assert data["scheduleId"] == "sched-api-1"
    assert len(data["slots"]) == 1
    assert data["slots"][0]["taskId"] == "task-api-1"
    assert data["summary"]["plannedMinutes"] == 60


def test_what_if_endpoint():
    now = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    payload = {
        "scheduleId": "sched-api-1",
        "mutation": {
            "changeType": "EVENT_ADDED",
            "newStartsAt": now.isoformat(),
            "newEndsAt": (now + timedelta(minutes=60)).isoformat(),
        },
        "events": [],
        "tasks": [],
    }

    res = client.post("/what-if", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "FEASIBLE"
    assert data["impact"]["lostCapacityMinutes"] == 60


def test_analyze_mobility_endpoint():
    now = datetime(2026, 9, 25, 8, 0, tzinfo=timezone.utc)
    payload = {
        "events": [
            {
                "id": "e1",
                "title": "A",
                "startsAt": now.isoformat(),
                "endsAt": (now + timedelta(minutes=60)).isoformat(),
                "location": "Loc A",
            },
            {
                "id": "e2",
                "title": "B",
                "startsAt": (now + timedelta(minutes=70)).isoformat(),
                "endsAt": (now + timedelta(minutes=130)).isoformat(),
                "location": "Loc B",
            },
        ],
        "travelMatrix": {"Loc A->Loc B": 10},
        "minTransitionBufferMinutes": 5,
    }

    res = client.post("/analyze-mobility", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["totalTravelMinutes"] == 10
    assert data["transitionCount"] == 1
