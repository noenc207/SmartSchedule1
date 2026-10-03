# SmartSchedule Independent Vision Server

Dịch vụ vi mô (microservice) thị giác độc lập phục vụ việc trích xuất và số hóa thời khóa biểu, tài liệu môn học, hạn chót deadline, và ảnh chụp màn hình lịch học trong hệ sinh thái SmartSchedule.

## 1. Nguyên Tắc Cốt Lõi & Quyền Riêng Tư (Privacy Guard)
- **Ảnh thô (Raw Image) TUYỆT ĐỐI KHÔNG được gửi sang Gemini mặc định**.
- Ảnh người dùng tải lên được phân tích xử lý hoàn toàn nội bộ qua Vision Server (`PaddleOCR-VL-1.5` / `Qwen3-VL`).
- Chỉ cấu trúc JSON đã được chuẩn hóa (`VisionResult`) mới được chuyển về Spring Boot Gateway và nạp vào ngữ cảnh của AI Agent (`AiContextService`).
- Dữ liệu ảnh tạm thời được dọn dẹp tự động theo cơ chế TTL (15 phút).
- Hệ thống hỗ trợ Per-User SHA-256 Caching để tăng tốc độ phản hồi và tránh suy luận trùng lặp.

## 2. Kiến Trúc Nhà Cung Cấp (Provider Architecture)
- `VisionProvider` (Abstract Base Class)
  - `PaddleOCRVLProvider`: Chuyên trị bảng biểu, lưới thời khóa biểu, tài liệu môn học (`TIMETABLE`, `DOCUMENT`, `DEADLINE`).
  - `Qwen3VLProvider`: Chuyên trị ảnh chụp màn hình ứng dụng, lý luận bố cục phức tạp (`SCREENSHOT`, `GENERAL_IMAGE`).
  - `CustomLocalVLMProvider`: Khả năng mở rộng cho các mô hình fine-tune nội bộ trong tương lai.
- `VisionRouter`:
  - Phân loại chế độ xử lý.
  - Cơ chế **Confidence Fallback Gating**: Nếu độ tin cậy < 0.65, tự động chuyển giao sang nhà cung cấp phụ để đạt kết quả tối ưu.

## 3. Các API Chính
- `GET /v1/vision/health`: Kiểm tra trạng thái hoạt động của các model và card đồ họa CUDA.
- `POST /v1/vision/analyze`: Tải ảnh lên và nhận kết quả trích xuất JSON.
- `POST /v1/vision/feedback`: Thu thập phản hồi người dùng phục vụ đánh giá chất lượng (Active Learning).

## 4. Chạy Cục Bộ & Kiểm Thử
```bash
cd vision-server
pip install -r requirements.txt
python -m pytest tests/
uvicorn main:app --host 0.0.0.0 --port 8090
```
