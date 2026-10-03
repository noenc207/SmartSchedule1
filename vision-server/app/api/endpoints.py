from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, status, Depends
import logging

try:
    import torch
    CUDA_AVAILABLE = torch.cuda.is_available()
except Exception:
    CUDA_AVAILABLE = False

from app.schemas.vision_dto import (
    VisionResult,
    ProcessingMode,
    VisionFeedback,
    HealthResponse,
)
from app.security.file_validator import validate_uploaded_image
from app.storage.temp_storage import storage_manager
from app.routing.vision_router import vision_router

logger = logging.getLogger("vision_api")
router = APIRouter(prefix="/v1/vision", tags=["Vision Engine"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint reporting provider readiness and CUDA availability."""
    provider_status = await vision_router.check_health()
    return HealthResponse(
        status="healthy",
        providers=provider_status,
        cuda_available=CUDA_AVAILABLE,
        version="1.0.0"
    )

@router.post("/analyze", response_model=VisionResult, status_code=status.HTTP_200_OK)
async def analyze_image(
    file: UploadFile = File(..., description="Ảnh thời khóa biểu, tài liệu, hạn chót hoặc ảnh chụp màn hình"),
    instruction: Optional[str] = Form(None, description="Yêu cầu bổ sung của người dùng"),
    mode: Optional[ProcessingMode] = Form(ProcessingMode.TIMETABLE, description="Chế độ xử lý: TIMETABLE, DOCUMENT, DEADLINE, SCREENSHOT, GENERAL_IMAGE"),
    user_id: Optional[str] = Form("default-user", description="ID người dùng cho mục đích cách ly và per-user caching"),
):
    """
    Phân tích ảnh cục bộ qua Vision Server độc lập.
    1. Kiểm tra an ninh nghiêm ngặt (MIME, Magic Bytes, kích thước, bom giải nén).
    2. Kiểm tra bộ nhớ đệm SHA-256 theo từng người dùng.
    3. Định tuyến qua PaddleOCR-VL-1.5 hoặc Qwen3-VL với cơ chế Fallback Gating.
    4. Trả về cấu trúc JSON chuẩn hóa (ExtractedEvent, ExtractedTask, ExtractedDeadline).
    RAW IMAGE KHÔNG ĐƯỢC GỬI RA BÊN NGOÀI.
    """
    # 1. Security & file integrity validation
    content = await validate_uploaded_image(file)

    # 2. SHA-256 caching check
    image_hash = storage_manager.compute_hash(content)
    cached = storage_manager.get_cached_result(user_id or "default-user", image_hash)
    if cached:
        logger.info(f"Returning cached vision result for user {user_id}, hash {image_hash[:12]}")
        return cached

    # 3. Execution via Vision Router
    effective_mode = mode or ProcessingMode.TIMETABLE
    result = await vision_router.execute(
        image_bytes=content,
        instruction=instruction,
        mode=effective_mode
    )

    # 4. Cache result for TTL period
    storage_manager.cache_result(user_id or "default-user", image_hash, result)
    return result

@router.post("/feedback", status_code=status.HTTP_200_OK)
async def submit_feedback(feedback: VisionFeedback):
    """
    Tiếp nhận phản hồi người dùng (chấp nhận hoặc chỉnh sửa kết quả trích xuất)
    phục vụ việc cải thiện chất lượng mô hình OCR và Fine-tuning.
    """
    logger.info(
        f"Received feedback for result {feedback.result_id}: accepted={feedback.accepted}, corrections={feedback.corrections}"
    )
    return {
        "status": "success",
        "result_id": feedback.result_id,
        "message": "Cảm ơn bạn đã gửi phản hồi! Dữ liệu đã được ghi nhận an toàn."
    }
