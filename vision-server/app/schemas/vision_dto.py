from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProcessingMode(str, Enum):
    TIMETABLE = "TIMETABLE"
    DOCUMENT = "DOCUMENT"
    DEADLINE = "DEADLINE"
    SCREENSHOT = "SCREENSHOT"
    GENERAL_IMAGE = "GENERAL_IMAGE"

class ExtractedEvent(BaseModel):
    title: str = Field(..., description="Tên môn học hoặc sự kiện")
    date: Optional[str] = Field(None, description="Ngày diễn ra YYYY-MM-DD nếu có")
    day_of_week: Optional[str] = Field(None, description="Thứ trong tuần (ví dụ: Thứ Hai, Monday)")
    start_time: str = Field(..., description="Giờ bắt đầu HH:mm")
    end_time: Optional[str] = Field(None, description="Giờ kết thúc HH:mm")
    duration_minutes: Optional[int] = Field(None, description="Thời lượng theo phút")
    location: Optional[str] = Field(None, description="Phòng học hoặc giảng đường")
    description: Optional[str] = Field(None, description="Giảng viên, mã lớp hoặc ghi chú")
    recurrence: Optional[str] = Field(None, description="Chu kỳ lặp: WEEKLY, DAILY, ONCE")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Độ tin cậy của trích xuất")

class ExtractedTask(BaseModel):
    title: str = Field(..., description="Tên công việc cần làm")
    estimated_minutes: Optional[int] = Field(None, description="Thời gian ước tính hoàn thành")
    priority: Optional[str] = Field("MEDIUM", description="Độ ưu tiên: LOW, MEDIUM, HIGH, URGENT")
    deadline: Optional[str] = Field(None, description="Hạn chót nếu có")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)

class ExtractedDeadline(BaseModel):
    title: str = Field(..., description="Tên hạn chót bài tập/đồ án")
    due_date: str = Field(..., description="Thời điểm hạn chót (YYYY-MM-DD hoặc ISO)")
    priority: Optional[str] = Field("HIGH", description="Mức độ quan trọng")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)

class VisionResult(BaseModel):
    result_id: str = Field(..., description="UUID định danh kết quả phân tích thị giác")
    document_type: str = Field(..., description="Loại tài liệu: TIMETABLE, DOCUMENT, DEADLINE, SCREENSHOT, GENERAL_IMAGE, UNKNOWN")
    provider: str = Field(..., description="Tên provider xử lý: paddleocr-vl-1.5, qwen3-vl, custom-local")
    model: str = Field(..., description="Tên model đã sử dụng")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Độ tin cậy tổng thể")
    events: List[ExtractedEvent] = Field(default_factory=list, description="Danh sách lịch học / sự kiện trích xuất được")
    tasks: List[ExtractedTask] = Field(default_factory=list, description="Danh sách công việc trích xuất được")
    deadlines: List[ExtractedDeadline] = Field(default_factory=list, description="Danh sách hạn chót trích xuất được")
    summary: str = Field(..., description="Bản tóm tắt bằng văn bản người dùng đọc được")
    raw_text: Optional[str] = Field(None, description="Nội dung văn bản OCR thô đã làm sạch")
    warnings: List[str] = Field(default_factory=list, description="Cảnh báo độ tin cậy thấp hoặc mập mờ nếu có")
    created_at: str = Field(..., description="Thời điểm tạo ISO 8601")

class VisionFeedback(BaseModel):
    result_id: str = Field(..., description="ID kết quả phân tích cần phản hồi")
    accepted: bool = Field(..., description="True nếu người dùng xác nhận kết quả đúng")
    corrections: Optional[Dict[str, Any]] = Field(None, description="Các chỉnh sửa nếu có")
    user_notes: Optional[str] = Field(None, description="Ghi chú người dùng")

class HealthResponse(BaseModel):
    status: str
    providers: Dict[str, bool]
    cuda_available: bool
    version: str
