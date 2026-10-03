import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from app.routing.vision_router import vision_router
from app.schemas.vision_dto import ProcessingMode
from app.storage.temp_storage import storage_manager

client = TestClient(app)

def create_test_image(format="PNG", size=(200, 200), color="white") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "SmartSchedule Vision Server"
    assert data["status"] == "online"

def test_health_check():
    response = client.get("/v1/vision/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "paddleocr-vl-1.5" in data["providers"]
    assert "qwen3-vl" in data["providers"]

def test_upload_invalid_file_type():
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("test.txt", b"plain text content", "text/plain")},
        data={"mode": "TIMETABLE"}
    )
    assert response.status_code == 400
    assert "INVALID_FILE_TYPE" in response.json()["detail"]

def test_upload_corrupted_image():
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("fake.png", b"\x89PNG\r\n\x1a\ncorrupted_data_not_real_image", "image/png")},
        data={"mode": "TIMETABLE"}
    )
    assert response.status_code == 400
    assert "IMAGE_CORRUPTED" in response.json()["detail"] or "IMAGE_PARSE_ERROR" in response.json()["detail"]

def test_upload_empty_file():
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("empty.png", b"", "image/png")},
        data={"mode": "TIMETABLE"}
    )
    assert response.status_code == 400
    assert "EMPTY_FILE" in response.json()["detail"]

def test_analyze_timetable_success():
    img_bytes = create_test_image(format="PNG")
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("timetable.png", img_bytes, "image/png")},
        data={"mode": "TIMETABLE", "user_id": "test-user-1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "TIMETABLE"
    assert data["provider"] == "paddleocr-vl-1.5"
    assert data["confidence"] > 0.7
    assert len(data["events"]) >= 1
    assert data["events"][0]["title"] is not None
    assert data["events"][0]["start_time"] is not None

def test_analyze_deadline_success():
    img_bytes = create_test_image(format="JPEG")
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("syllabus.jpg", img_bytes, "image/jpeg")},
        data={"mode": "DEADLINE", "user_id": "test-user-2"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "DEADLINE"
    assert len(data["deadlines"]) >= 1
    assert data["deadlines"][0]["due_date"] is not None

def test_analyze_screenshot_success():
    img_bytes = create_test_image(format="PNG")
    response = client.post(
        "/v1/vision/analyze",
        files={"file": ("screen.png", img_bytes, "image/png")},
        data={"mode": "SCREENSHOT", "user_id": "test-user-3"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "SCREENSHOT"
    assert len(data["events"]) >= 1 or len(data["tasks"]) >= 1

def test_sha256_caching():
    img_bytes = create_test_image(format="PNG", color="blue")
    user_id = "cache-test-user"

    # First request
    res1 = client.post(
        "/v1/vision/analyze",
        files={"file": ("cached.png", img_bytes, "image/png")},
        data={"mode": "TIMETABLE", "user_id": user_id}
    )
    assert res1.status_code == 200
    id1 = res1.json()["result_id"]

    # Second request with same image and same user -> returns cached result with same ID
    res2 = client.post(
        "/v1/vision/analyze",
        files={"file": ("cached.png", img_bytes, "image/png")},
        data={"mode": "TIMETABLE", "user_id": user_id}
    )
    assert res2.status_code == 200
    id2 = res2.json()["result_id"]
    assert id1 == id2

def test_vision_feedback():
    response = client.post(
        "/v1/vision/feedback",
        json={
            "result_id": "123e4567-e89b-12d3-a456-426614174000",
            "accepted": True,
            "corrections": {"title": "Lớp Giải Tích 1"},
            "user_notes": "Kết quả nhận diện rất chuẩn"
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_router_fallback_gating():
    import asyncio
    # Test router fallback mechanism when primary returns low confidence
    img_bytes = create_test_image(format="PNG")
    result = asyncio.run(vision_router.execute(
        image_bytes=img_bytes,
        instruction=None,
        mode=ProcessingMode.GENERAL_IMAGE
    ))
    assert result.provider == "qwen3-vl"
    assert result.confidence >= 0.7
