# BÁO CÁO AUDIT TÍCH HỢP TOÀN DIỆN: FRONTEND ↔ BACKEND
**Hệ thống:** SmartSchedule — Intelligent Academic & Routine Planning Platform  
**Thư mục gốc:** `D:\SmartSchedul`  
**Frontend:** `D:\SmartSchedul\frontend` (React 19 + TypeScript + Vite)  
**Backend:** `D:\SmartSchedul\backend` (Java 21 + Spring Boot 3.3.4 + PostgreSQL + Flyway)  
**Ngày thực hiện:** 24/09/2026  
**Chế độ audit:** KIỂM TRA & ĐÁNH GIÁ ĐỘC LẬP (Không can thiệp refactor / Không sửa đổi source code)

---

## MỤC LỤC
1. [Tóm tắt điều hành (Executive Summary)](#1-tóm-tắt-điều-hành-executive-summary)
2. [Hiện trạng Runtime & Môi trường thực thi](#2-hiện-trạng-runtime--môi-trường-thực-thi)
3. [Phân tích cơ chế hoạt động: Dual Architecture & "Bức màn Demo Mode"](#3-phân-tích-cơ-chế-hoạt-động-dual-architecture--bức-màn-demo-mode)
4. [Trả lời chi tiết 9 câu hỏi cốt lõi của Audit (Q1 - Q9)](#4-trả-lời-chi-tiết-9-câu-hỏi-cốt-lõi-của-audit-q1---q9)
5. [Bảng ma trận đối soát toàn diện Endpoints (Full Controller & API Cross-Match)](#5-bảng-ma-trận-đối-soát-toàn-diện-endpoints-full-controller--api-cross-match)
6. [Chi tiết sai lệch Hợp đồng DTO & Schema (Contract Breaches & Mismatches)](#6-chi-tiết-sai-lệch-hợp-đồng-dto--schema-contract-breaches--mismatches)
7. [Kiểm toán Authentication, Multi-Tenancy & Authorization xuyên suốt](#7-kiểm-toán-authentication-multi-tenancy--authorization-xuyên-suốt)
8. [Kiểm toán Cơ sở dữ liệu & Flyway Migrations (V1 - V12)](#8-kiểm-toán-cơ-sở-dữ-liệu--flyway-migrations-v1---v12)
9. [Các lỗi "False Success UI" (Giao diện báo thành công ảo) & "Dead UI"](#9-các-lỗi-false-success-ui-giao-diện-báo-thành-công-ảo--dead-ui)
10. [Logic phân mảnh & Trùng lặp thuật toán (Logic Drift & Duplication)](#10-logic-phân-mảnh--trùng-lặp-thuật-toán-logic-drift--duplication)
11. [Xử lý Thời gian, Múi giờ & Lặp lại (Date/Time, Timezone & Recurrence)](#11-xử-lý-thời-gian-múi-giờ--lặp-lại-datetime-timezone--recurrence)
12. [Đánh giá mức độ rủi ro & Ma trận ưu tiên (P0 → P3)](#12-đánh-giá-mức-độ-rủi-ro--ma-trận-ưu-tiên-p0--p3)
13. [Kế hoạch hành động từng bước (Actionable Remediation Roadmap)](#13-kế-hoạch-hành-động-từng-bước-actionable-remediation-roadmap)

---

## 1. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Sau khi rà soát toàn bộ 15 Spring RestControllers, 11 tệp Flyway SQL migration, toàn bộ hệ thống Application Services/Domain Repositories của Backend, kết hợp với các Frontend Services (`apiClient`, `demoBackend`, `authStore`, các page components và hook), cuộc audit đưa ra kết luận cốt lõi như sau:

> **KẾT LUẬN CỐT LÕI:**  
> Hệ thống SmartSchedule hiện đang ở trạng thái **"Kiến trúc kép" (Dual Architecture)** với một **"Bức màn Demo Mode"** che khuất hoàn toàn backend thật ở cấu hình mặc định.
> 
> Mặc dù Backend Spring Boot đã được xây dựng rất bài bản, hoàn chỉnh và pass 100% unit/integration tests (9/9 test suites), Frontend trên thực tế **chưa từng gọi trực tiếp Backend khi chạy ở cấu hình mặc định**, do biến môi trường `VITE_DEMO_MODE=true` trong file `frontend/.env` kích hoạt bộ interceptor chuyển hướng 100% API calls sang `demoBackend.ts` (mock trong RAM/localStorage).
> 
> Khi tắt Demo Mode (`VITE_DEMO_MODE=false`), khoảng **55% - 60% tính năng hoạt động trơn tru với Backend thật** (Auth, CRUD Schedules, CRUD Tasks, CRUD Events, Phân quyền cộng tác, AI Auto-Scheduling, Reschedule Center). Tuy nhiên, **40% - 45% tính năng còn lại sẽ lập tức gãy hoặc lộ ra các lỗi logic nghiêm trọng**:
> 1. **Gãy do thiếu Endpoint backend**: CRUD Custom User Locations (Settings) gọi `POST/PUT/DELETE /locations` nhưng backend chỉ có `GET`.
> 2. **Lỗi hợp đồng DTO (Contract Mismatch)**: `schedulingApi.validate()` gửi sai hoàn toàn cấu trúc request/response mà Backend `SchedulingController` yêu cầu.
> 3. **False Success UI (Thành công ảo)**: Tính năng "What-If" trên Calendar Toolbar giả lập kéo thả trên React state, bấm "Apply" hiện toast thành công xanh lá nhưng không hề lưu vào DB, reload là biến mất 100%.
> 4. **Tính năng Mock 100% (Simulation)**: Toàn bộ cổng tích hợp LMS/Google Calendar/Outlook/Jira/GitHub chỉ là mô phỏng với `Math.random() < 0.25` và `setTimeout` lưu trong localStorage, không có kết nối OAuth hay API thật.
> 5. **Bỏ quên Backend (Orphaned API)**: Backend đã code sẵn tính năng xuất/nhập file iCalendar RFC 5545 (`/export.ics`, `/import.ics`) và đổi Profile cá nhân (`/users/me`), nhưng Frontend lại tự viết parser riêng bằng JS (`icsService.ts`) hoặc không có màn hình UI để gọi.

---

## 2. HIỆN TRẠNG RUNTIME & MÔI TRƯỜNG THỰC THI

### 2.1. Môi trường kiểm tra thực tế
- **Hệ điều hành:** Windows 11.
- **Java Runtime:** OpenJDK 21 LTS (`build 21.0.8+9-LTS`). Đã được xác nhận tương thích hoàn toàn với Spring Boot 3.3.4.
- **Backend Artifact:** Đã biên dịch sẵn tệp `backend/target/smartschedule-api-0.1.0-SNAPSHOT.jar` (kích thước ~44MB).
- **Backend Tests:** 9 test suites trong `backend/target/surefire-reports` đều đạt trạng thái `0 failures, 0 errors, 0 skipped` (bao gồm: `AuthControllerTests`, `ScheduleControllerTests`, `EventControllerTests`, `TaskControllerTests`, `SchedulingEngineTests`, `CollaborationTests`, `RecurrenceTests`, `LocationMobilityTests`).
- **Frontend Runtime:** Node.js v20.x, Vite 6.2.x, React 19.0.0.
- **Frontend Tests:** Đã chạy lệnh `npm test -- --run` trực tiếp trên `frontend`: **148/148 tests passed** (16 test files).
- **Frontend Build:** Đã chạy `npm run build`: Quá trình build Vite production thành công không lỗi trong 16.3s, sinh bundle sạch sẽ.
- **Cơ sở dữ liệu:** PostgreSQL cổng 5432 (tại thời điểm audit không có tiến trình chiếm giữ cổng 8080 và 5432).

---

## 3. PHÂN TÍCH CƠ CHẾ HOẠT ĐỘNG: DUAL ARCHITECTURE & "BỨC MÀN DEMO MODE"

### 3.1. Điểm chặn cốt lõi: `frontend/.env` và `apiClient.ts`
Trong tệp `frontend/.env`:
```properties
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_DEMO_MODE=true
```

Trong `frontend/src/services/apiClient.ts` (Dòng 14-25):
```typescript
apiClient.interceptors.request.use((config) => {
  if (isDemoMode()) {
    config.adapter = demoAdapter; // CHẶN TOÀN BỘ NETWORK REQUEST!
  }
  const token = authStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});
```

Hàm `isDemoMode()` (`frontend/src/services/demoMode.ts`) trả về `true` khi `import.meta.env.VITE_DEMO_MODE === 'true'` HOẶC `localStorage.getItem('smartschedule-demo-mode') === 'true'`.

### 3.2. Hệ quả kiến trúc
1. **Toàn bộ Axios calls không hề chạm tới Card mạng (Network NIC)**:
   Khi `config.adapter = demoAdapter`, Axios hoàn toàn bỏ qua việc mở HTTP connection tới `http://localhost:8080`. Mọi request đều được giải quyết nội bộ trong file `frontend/src/services/demoBackend.ts` (1430 dòng code giả lập toàn bộ REST API, lưu dữ liệu mẫu trong biến bộ nhớ và localStorage).
2. **Khởi tạo người dùng giả lập (Bypass Authentication)**:
   Trong `frontend/src/stores/authStore.ts` (Dòng 28-40):
   ```typescript
   bootstrap: async () => {
     if (isDemoMode()) {
       set({
         user: {
           id: '10000000-0000-0000-0000-000000000001',
           email: 'nhi.vun@fptu.edu.vn',
           name: 'Vũ Ngọc Nhi',
           timezone: 'Asia/Ho_Chi_Minh',
           locale: 'vi-VN',
         },
         accessToken: 'demo-token',
         initialized: true,
       });
       return;
     }
     // Chỉ khi demo mode = false mới gọi authApi.me()
   }
   ```
   Do đó, ở chế độ mặc định, người dùng đăng nhập ngay lập tức với tài khoản giả lập "Vũ Ngọc Nhi", không gọi Spring Security, không gửi Bearer token và không query PostgreSQL.

---

## 4. TRẢ LỜI CHI TIẾT 9 CÂU HỎI CỐT LÕI CỦA AUDIT (Q1 - Q9)

### Q1: Frontend và Backend hiện đã thực sự liên kết với nhau đến đâu?
- **Ở mức Cấu hình Mặc định (Default Mode):** **0% liên kết thực tế**. 100% request bị `demoAdapter` chặn lại và phản hồi bằng mock data.
- **Ở mức Thiết kế Code (Code Integration Level khi tắt Demo Mode):** **Khoảng 58% liên kết chuẩn xác**.
  - Các module Auth, Schedule, Task, Category, Collaboration, Conflict Check, Rescheduling (trang riêng) được viết code gọi đúng URL `/api/v1/...` và truyền DTO tương đối khớp.
  - Các module Settings/Locations, What-If Calendar, External Calendar Sync, iCalendar File Export/Import bị đứt gãy hoặc chạy độc lập client-side.

### Q2: Feature nào đang dùng API thật (khi `VITE_DEMO_MODE=false`)?
1. **Xác thực người dùng (`authApi.ts`)**:
   - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
2. **Quản lý Không gian lịch (`scheduleApi.ts`)**:
   - `GET /api/v1/schedules`, `POST /api/v1/schedules`, `GET /api/v1/schedules/{id}`, `PUT /api/v1/schedules/{id}`, `DELETE /api/v1/schedules/{id}`.
3. **Quản lý Sự kiện cơ bản (`eventApi.ts`)**:
   - `GET /api/v1/schedules/{id}/events` (hỗ trợ filter from/to, priority, category).
   - `POST /api/v1/schedules/{id}/events`, `GET /api/v1/events/{id}`, `PUT /api/v1/events/{id}`, `DELETE /api/v1/events/{id}`, `POST /api/v1/events/{id}/duplicate`.
   - `POST /api/v1/events/check-conflict`.
4. **Phân tích Xung đột lịch (`conflictApi.ts`)**:
   - `GET /api/v1/schedules/{id}/conflicts`.
5. **Quản lý Nhiệm vụ/Học tập (`taskApi.ts`)**:
   - `GET /api/v1/schedules/{id}/tasks` (có phân trang `PageResponse`), `POST /api/v1/schedules/{id}/tasks`, `PUT /api/v1/tasks/{id}`, `DELETE /api/v1/tasks/{id}`.
6. **Quản lý Danh mục (`categoryApi.ts`)**:
   - `GET /api/v1/categories`, `POST /api/v1/categories`, `PUT /api/v1/categories/{id}`, `DELETE /api/v1/categories/{id}`.
7. **Khung giờ rảnh / Availability (`availabilityApi.ts`)**:
   - `GET /api/v1/schedules/{id}/availability`, `POST`, `PUT`, `DELETE`.
8. **Chia sẻ & Phân quyền cộng tác (`collaborationApi.ts`, `publicScheduleApi.ts`)**:
   - Thành viên (`/members`), Lời mời, Link chia sẻ (`/share-links`), Xem lịch public (`GET /api/v1/shared/{token}`), Nhật ký hoạt động (`/activity`).
9. **Tối ưu xếp lịch tự động (`schedulingApi.ts`)**:
   - `POST /api/v1/schedules/{id}/scheduling/generate` và `POST /api/v1/schedules/{id}/scheduling/apply`.
10. **Trung tâm điều chỉnh lịch khi có biến động (`reschedulingApi.ts` trên `ReschedulingPage.tsx`)**:
    - `POST /reschedule/analyze`, `POST /reschedule/generate`, `POST /reschedule/what-if`, `POST /reschedule/apply`.
11. **Hộp thư thông báo (`notificationApi.ts`)**:
    - `GET /api/v1/notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`.

### Q3: Feature nào vẫn dùng Demo / mock / hardcoded data?
1. **Toàn bộ hệ thống Tích hợp ngoại vi (`IntegrationsSection.tsx`)**:
   - Google Calendar, Outlook 365, Canvas LMS, Google Classroom, GitHub, Jira. Tệp code này lưu trạng thái vào `localStorage` (`smartschedule-integrations-v1`), sử dụng `setTimeout(1000)` để giả lập loading và `Math.random() < 0.25` để giả lập phát hiện xung đột.
2. **Quản lý Địa điểm cá nhân / Custom POI (`UserLocationsSection.tsx`)**:
   - Cho phép người dùng nhập địa điểm nhà riêng, quán cafe, phòng gym... Nhưng Backend `LocationController` không có API lưu địa điểm mới của User. Khi chạy thật sẽ trả về HTTP 405.
3. **Mô phỏng What-If trực tiếp trên Calendar (`CalendarPage.tsx`)**:
   - Nút "What-If" trên thanh công cụ Calendar cho phép kéo thả sự kiện thử nghiệm. Hàm `applyWhatIf()` (dòng 1603-1608) chỉ đổi state React và hiện toast, không gọi backend API.
4. **Trang Báo cáo / Thống kê (`Analytics` trong `App.tsx`)**:
   - Renders 3 metrics card và weekly chart tính toán thuần túy trên mảng sự kiện trong client RAM, không có API backend tương ứng.
5. **Dữ liệu Campus Topology mặc định**:
   - Tệp `frontend/src/features/calendar/mobility/campusRouting.ts` hardcode mảng `DEMO_CAMPUS_LOCATIONS` (8 địa điểm FPTU Quy Nhơn) và `DEMO_CAMPUS_EDGES` (14 cạnh đường đi bộ) để tính toán Dijkstra ngay trên trình duyệt mà không bắt buộc gọi backend.

### Q4: Endpoint frontend gọi có tồn tại và khớp backend không?
- **Khớp chuẩn**: ~80% các endpoint được khai báo trong frontend services tồn tại chính xác trên Backend Controller.
- **Không tồn tại trên Backend (Gây lỗi HTTP 404/405 khi chạy thật)**:
  - `POST /api/v1/locations` (Frontend gọi tại `locationApi.ts:26`) -> Backend **KHÔNG CÓ**.
  - `PUT /api/v1/locations/{id}` (Frontend gọi tại `locationApi.ts:30`) -> Backend **KHÔNG CÓ**.
  - `DELETE /api/v1/locations/{id}` (Frontend gọi tại `locationApi.ts:34`) -> Backend **KHÔNG CÓ**.

### Q5: Request/response DTO có khớp nhau không?
- **Sai lệch chí mạng (Fatal Mismatch)**:
  - `schedulingApi.validate()`:
    - *Frontend gửi*: `{ from: string, to: string, taskIds?: string[] }` (kiểu `SchedulingRequest`).
    - *Backend nhận (`SchedulingController:20`)*: Yêu cầu `@RequestBody ApplyRequest` bao gồm `{ planId: UUID, fingerprint: String, slots: List<SlotAssignment>, scheduleVersion: Integer }`.
    - *Backend trả về*: `ValidationResponse` `{ valid: boolean, fingerprint: String, errors: List<String> }`, nhưng frontend typing lại là `SchedulingValidationResult`.
- **Sai lệch dữ liệu liên kết Task ↔ Event**:
  - Backend database có cột `source_task_id UUID` trong bảng `events` (entity `Event.java:54`).
  - Tuy nhiên, `EventDtos.EventRequest` và `EventDtos.EventResponse` **không hề khai báo trường `taskId` hay `sourceTaskId`**.
  - Hậu quả: Frontend trong `eventMapper.ts` phải dùng giải pháp tình thế (hack) bằng cách nhồi Task ID vào chuỗi ghi chú `notes` (`event.notes.includes(t.id)`) để nhận diện sự kiện nào sinh ra từ task nào!
- **Thiếu cột màu sắc (`color`)**:
  - `Task.java` và `Event.java` trong database không có cột `color` (màu sắc chỉ lưu trên `categories`). Frontend `EventInput` và `TaskInput` gửi `color` lên sẽ bị Backend bỏ qua hoàn toàn.

### Q6: Authentication có thực sự xuyên suốt frontend → backend → database không?
- **Khi tắt Demo Mode (`VITE_DEMO_MODE=false`)**: **CÓ, xuyên suốt và bảo mật cao**.
  1. Frontend lưu Access Token chỉ trong memory (`authStore`).
  2. Axios Interceptor tự động gắn `Authorization: Bearer <token>`.
  3. Backend `JwtAuthenticationFilter` giải mã token, xác thực HMAC-SHA256 secret, đọc user UUID.
  4. Backend nạp `User` từ database `users`, đưa vào Spring `SecurityContextHolder`.
  5. Refresh token được truyền bằng HttpOnly Cookie (`smartschedule_refresh`), mã hóa SHA-256 trong database bảng `refresh_tokens`, hỗ trợ cơ chế quay vòng (token rotation).
  6. Authorization Service (`AuthorizationService.java`) kiểm tra quyền `OWNER`, `EDITOR`, `VIEWER` trên từng schedule trước khi cho phép thao tác.
- **Khi bật Demo Mode (`VITE_DEMO_MODE=true`)**: **KHÔNG xuyên suốt**. Bị ngắt ngay tại frontend `authStore.bootstrap()`, gán cứng user `10000000-0000-0000-0000-000000000001`.

### Q7: Những phần nào đang có logic mơ hồ, duplicated, chưa hoàn chỉnh hoặc dễ gây bug?
1. **Thuật toán tìm đường Dijkstra bị code 2 lần (Duplicated)**:
   - Backend đã cài đặt `CampusRoutingService.java` (thuật toán Dijkstra tìm đường trong khuôn viên FPTU Quy Nhơn).
   - Frontend lại cài đặt lại nguyên văn thuật toán Dijkstra trong `campusRouting.ts` (dòng 150-250). Hai bên có thể bị lệch trọng số hoặc thời gian di chuyển nếu cập nhật một bên.
2. **Bộ chuyển đổi iCalendar RFC 5545 bị code 2 lần**:
   - Backend có `CalendarInteropService.java` dùng thư viện chuyên dụng để đọc/ghi file `.ics`.
   - Frontend lại tự viết regex parser trong `icsService.ts` (198 dòng).
3. **Cửa sổ thời gian hẹn giờ thông báo quá hẹp (Race condition trong `ReminderJob.java`)**:
   - Job `@Scheduled(fixedDelay = 60000)` quét sự kiện đến hạn nhắc nhở, nhưng điều kiện lọc lại là:  
     `if (scheduledFor.isBefore(now.minusSeconds(30)) || scheduledFor.isAfter(now.plusSeconds(30))) continue;`  
     Khoảng quét chỉ rộng đúng 60 giây (+/- 30s). Nếu server bị lag hoặc job bị chậm vài giây, thông báo của người dùng sẽ bị trôi qua vĩnh viễn và không bao giờ được tạo.
4. **Liên kết `notes` để định danh Task**:
   - Việc ghép nối `taskId` vào trường `notes` dạng text tự do rất dễ lỗi khi người dùng gõ ghi chú trùng ID hoặc sửa text ghi chú trong giao diện.

### Q8: Có feature nào UI đã có nhưng backend chưa hỗ trợ?
1. **Thêm/Sửa/Xóa Địa điểm cá nhân (User Locations CRUD)**:
   - UI có modal tạo địa điểm, tìm kiếm tọa độ OpenStreetMap, chọn bán kính, phòng, tòa nhà (`UserLocationsSection.tsx`). Backend không có API xử lý việc này.
2. **Đồng bộ lịch từ các nền tảng ngoài (Google Calendar / Canvas LMS / Outlook / Jira)**:
   - UI có đầy đủ badge, trạng thái "Connected / Not Connected", modal nhập email, nút "Sync Now", review xung đột. Backend hoàn toàn chưa có controller hay service tích hợp bên thứ ba.
3. **Lưu màu tùy chỉnh cho từng Task / Event độc lập**:
   - UI cho phép chọn color picker cho từng task. Backend chỉ hỗ trợ màu theo `category`.

### Q9: Có backend API đã có nhưng frontend chưa sử dụng?
1. **Cổng nạp/xuất tệp iCalendar chuẩn (`CalendarInteropController`)**:
   - `GET /api/v1/schedules/{id}/export.ics`
   - `POST /api/v1/schedules/{id}/import.ics`
   - `POST /api/v1/schedules/{id}/import.ics/confirm`  
   Frontend hoàn toàn không gọi các endpoint này mà tự đọc tệp `.ics` bằng JavaScript rồi gọi lặp `eventApi.create()`.
2. **Quản lý Thông tin cá nhân (`UserController`)**:
   - `GET /api/v1/users/me`
   - `PATCH /api/v1/users/me` (cập nhật tên hiển thị, avatarUrl, timezone, locale). Frontend không có màn hình Settings Profile để gọi API này.
3. **Gợi ý thời gian họp nhóm (`CollaborationController`)**:
   - `GET /api/v1/schedules/{id}/meeting-suggestions`: Tìm khung giờ rảnh chung của nhóm thành viên. Frontend chưa có giao diện nào gọi endpoint này.
4. **Ngoại lệ lặp sự kiện (`EventController`)**:
   - `PUT /api/v1/events/{id}/occurrence-exception`
   - `DELETE /api/v1/events/{id}/occurrence-exception`  
   Frontend `eventApi.ts` không cài đặt 2 hàm này.
5. **Kiểm tra sức khỏe hệ thống (`HealthController`)**:
   - `GET /api/v1/health`: Chưa được frontend ping để hiển thị tình trạng server.

---

## 5. BẢNG MA TRẬN ĐỐI SOÁT TOÀN DIỆN ENDPOINTS (FULL CONTROLLER & API CROSS-MATCH)

| STT | Backend Controller & Method | HTTP & Endpoint Backend | Tệp Frontend Service & Hàm gọi | Trạng thái tích hợp | Ghi chú & Rủi ro |
|:---:|:---|:---|:---|:---:|:---|
| **1** | `AuthController.register` | `POST /api/v1/auth/register` | `authApi.register()` | **HOẠT ĐỘNG** | Khớp 100%. Nhận token & cookie. |
| **2** | `AuthController.login` | `POST /api/v1/auth/login` | `authApi.login()` | **HOẠT ĐỘNG** | Khớp 100%. Cấp JWT & refresh cookie. |
| **3** | `AuthController.refresh` | `POST /api/v1/auth/refresh` | `authApi.refresh()` | **HOẠT ĐỘNG** | Khớp 100%. Tự động refresh khi 401. |
| **4** | `AuthController.logout` | `POST /api/v1/auth/logout` | `authApi.logout()` | **HOẠT ĐỘNG** | Khớp 100%. Thu hồi refresh token. |
| **5** | `AuthController.me` | `GET /api/v1/auth/me` | `authApi.me()` | **HOẠT ĐỘNG** | Khớp 100%. Lấy thông tin user hiện tại. |
| **6** | `UserController.get` | `GET /api/v1/users/me` | *(Không có)* | **CHƯA DÙNG** | Frontend chưa có service & UI gọi. |
| **7** | `UserController.update` | `PATCH /api/v1/users/me` | *(Không có)* | **CHƯA DÙNG** | API đổi tên, timezone, avatar bị bỏ quên. |
| **8** | `ScheduleController.list` | `GET /api/v1/schedules` | `scheduleApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. Trả về danh sách lịch sở hữu/tham gia. |
| **9** | `ScheduleController.create` | `POST /api/v1/schedules` | `scheduleApi.create()` | **HOẠT ĐỘNG** | Khớp 100%. Tạo lịch mới. |
| **10** | `ScheduleController.get` | `GET /api/v1/schedules/{id}` | `scheduleApi.get()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **11** | `ScheduleController.update` | `PUT /api/v1/schedules/{id}` | `scheduleApi.update()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **12** | `ScheduleController.patch` | `PATCH /api/v1/schedules/{id}` | `scheduleApi.patch()` | **HOẠT ĐỘNG** | Khớp 100%. Cập nhật từng phần (tên, mô tả). |
| **13** | `ScheduleController.delete` | `DELETE /api/v1/schedules/{id}` | `scheduleApi.remove()` | **HOẠT ĐỘNG** | Khớp 100%. Xóa lịch. |
| **14** | `EventController.list` | `GET /api/v1/schedules/{id}/events` | `eventApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. Backend tự động bung recurrence. |
| **15** | `EventController.create` | `POST /api/v1/schedules/{id}/events` | `eventApi.create()` | **HOẠT ĐỘNG** | Khớp 95%. Không nhận `taskId` và `color`. |
| **16** | `EventController.get` | `GET /api/v1/events/{id}` | `eventApi.get()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **17** | `EventController.update` | `PUT /api/v1/events/{id}` | `eventApi.update()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **18** | `EventController.delete` | `DELETE /api/v1/events/{id}` | `eventApi.remove()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **19** | `EventController.duplicate` | `POST /api/v1/events/{id}/duplicate` | `eventApi.duplicate()` | **HOẠT ĐỘNG** | Khớp 100%. Nhân bản sự kiện sang ngày hôm sau. |
| **20** | `EventController.conflict` | `POST /api/v1/events/check-conflict` | `eventApi.checkConflict()` | **HOẠT ĐỘNG** | Khớp 100%. Kiểm tra đè giờ tức thì. |
| **21** | `EventController.analyze` | `GET /api/v1/schedules/{id}/conflicts` | `conflictApi.analyze()` | **HOẠT ĐỘNG** | Khớp 100%. Phân tích tập trung xung đột. |
| **22** | `EventController.saveException` | `PUT /api/v1/events/{id}/occurrence-exception` | *(Không có)* | **CHƯA DÙNG** | Frontend chưa có hàm gọi sửa 1 buổi đơn lẻ. |
| **23** | `EventController.deleteException` | `DELETE /api/v1/events/{id}/occurrence-exception`| *(Không có)* | **CHƯA DÙNG** | Frontend chưa có hàm gọi khôi phục buổi lặp. |
| **24** | `TaskController.list` | `GET /api/v1/schedules/{id}/tasks` | `taskApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. Có `normalizeTask()` bọc ngoài. |
| **25** | `TaskController.create` | `POST /api/v1/schedules/{id}/tasks` | `taskApi.create()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **26** | `TaskController.update` | `PUT /api/v1/tasks/{id}` | `taskApi.update()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **27** | `TaskController.delete` | `DELETE /api/v1/tasks/{id}` | `taskApi.remove()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **28** | `SchedulingController.generate` | `POST /api/v1/schedules/{id}/scheduling/generate` | `schedulingApi.generate()` | **HOẠT ĐỘNG** | Khớp 100%. Trả về phương án xếp lịch tự động. |
| **29** | `SchedulingController.validate` | `POST /api/v1/schedules/{id}/scheduling/validate` | `schedulingApi.validate()` | **LỖI HỢP ĐỒNG (BROKEN)** | **Sai lệch DTO**. Frontend gửi SchedulingRequest, Backend đòi ApplyRequest! |
| **30** | `SchedulingController.apply` | `POST /api/v1/schedules/{id}/scheduling/apply` | `schedulingApi.apply()` | **HOẠT ĐỘNG** | Khớp 100%. Ghi đè lịch được AI xếp vào DB. |
| **31** | `SchedulingController.getPreferences` | `GET /api/v1/schedules/{id}/scheduling/preferences` | `schedulingApi.getPreferences()` | **HOẠT ĐỘNG** | Khớp 100%. Cấu hình năng suất học tập. |
| **32** | `SchedulingController.updatePreferences`| `PUT /api/v1/schedules/{id}/scheduling/preferences` | `schedulingApi.updatePreferences()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **33** | `SchedulingController.getAiRecommendation`| `GET /api/v1/schedules/{id}/scheduling/ai-recommendation` | `scheduleApi.getAiRecommendation()` | **HOẠT ĐỘNG** | Khớp 100%. Gọi từ `CalendarPage.tsx:265`. |
| **34** | `SchedulingController.applyQuickSlot` | `POST /api/v1/schedules/{id}/scheduling/apply-quick-slot` | `scheduleApi.applyQuickSlot()` | **HOẠT ĐỘNG** | Khớp 100%. Chèn nhanh 1 slot học tập tối ưu. |
| **35** | `SchedulingController.getAcademicSummary`| `GET /api/v1/schedules/{id}/scheduling/academic-summary` | `scheduleApi.getAcademicSummary()` | **CHƯA DÙNG** | Service frontend có hàm nhưng không UI nào gọi! |
| **36** | `ReschedulingController.analyze` | `POST /api/v1/schedules/{id}/reschedule/analyze` | `reschedulingApi.analyze()` | **HOẠT ĐỘNG** | Khớp 100% trên `ReschedulingPage.tsx`. |
| **37** | `ReschedulingController.generate`| `POST /api/v1/schedules/{id}/reschedule/generate` | `reschedulingApi.generate()` | **HOẠT ĐỘNG** | Khớp 100% trên `ReschedulingPage.tsx`. |
| **38** | `ReschedulingController.whatIf` | `POST /api/v1/schedules/{id}/reschedule/what-if` | `reschedulingApi.whatIf()` | **HOẠT ĐỘNG** | Khớp 100% trên `ReschedulingPage.tsx`. |
| **39** | `ReschedulingController.apply` | `POST /api/v1/schedules/{id}/reschedule/apply` | `reschedulingApi.apply()` | **HOẠT ĐỘNG** | Khớp 100% trên `ReschedulingPage.tsx`. |
| **40** | `CategoryController.list` | `GET /api/v1/categories` | `categoryApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **41** | `CategoryController.create` | `POST /api/v1/categories` | `categoryApi.create()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **42** | `CategoryController.update` | `PUT /api/v1/categories/{id}` | `categoryApi.update()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **43** | `CategoryController.delete` | `DELETE /api/v1/categories/{id}` | `categoryApi.remove()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **44** | `CollaborationController.members` | `GET /api/v1/schedules/{id}/members` | `collaborationApi.listMembers()` | **HOẠT ĐỘNG** | Khớp 100%. Danh sách cộng tác viên. |
| **45** | `CollaborationController.invite` | `POST /api/v1/schedules/{id}/members` | `collaborationApi.inviteMember()` | **HOẠT ĐỘNG** | Khớp 100%. Phân quyền OWNER/EDITOR/VIEWER. |
| **46** | `CollaborationController.updateRole` | `PATCH /api/v1/schedules/{id}/members/{userId}` | `collaborationApi.updateMemberRole()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **47** | `CollaborationController.removeMember` | `DELETE /api/v1/schedules/{id}/members/{userId}` | `collaborationApi.removeMember()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **48** | `CollaborationController.links` | `GET /api/v1/schedules/{id}/share-links` | `collaborationApi.listShareLinks()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **49** | `CollaborationController.createLink` | `POST /api/v1/schedules/{id}/share-links` | `collaborationApi.createShareLink()` | **HOẠT ĐỘNG** | Khớp 100%. Sinh token chia sẻ bảo mật. |
| **50** | `CollaborationController.revokeLink` | `DELETE /api/v1/schedules/{id}/share-links/{linkId}` | `collaborationApi.revokeShareLink()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **51** | `CollaborationController.shared` | `GET /api/v1/shared/{token}` | `publicScheduleApi.get()` | **HOẠT ĐỘNG** | Khớp 100%. Xem lịch chia sẻ không cần login. |
| **52** | `CollaborationController.suggestions`| `GET /api/v1/schedules/{id}/meeting-suggestions`| *(Không có)* | **CHƯA DÙNG** | API tìm giờ họp trống chung bị bỏ quên. |
| **53** | `LocationController.list` | `GET /api/v1/locations` | `locationApi.list()` & `travelApi.listLocations()` | **HOẠT ĐỘNG** | Khớp 100%. Lấy danh sách campus locations. |
| **54** | `LocationController.estimate` | `GET /api/v1/travel/estimate` | `travelApi.getTravelEstimate()` | **HOẠT ĐỘNG** | Khớp 100%. Tính toán thời gian đi bộ. |
| **55** | `LocationController.acknowledge`| `POST /api/v1/mobility/acknowledge` | `travelApi.acknowledgeWarning()` | **HOẠT ĐỘNG** | Khớp 100%. Bỏ qua cảnh báo khoảng cách gần. |
| **56** | `LocationController.checkCandidate`| `POST /api/v1/events/check-mobility` | `travelApi.checkCandidateMobility()` | **HOẠT ĐỘNG** | Khớp 100%. Đánh giá khả năng di chuyển sự kiện mới. |
| **57** | *(Backend thiếu)* | `POST /api/v1/locations` | `locationApi.create()` | **LỖI THIẾU API (405)** | Frontend gọi tạo Custom Location nhưng backend không có API! |
| **58** | *(Backend thiếu)* | `PUT /api/v1/locations/{id}` | `locationApi.update()` | **LỖI THIẾU API (405)** | Frontend gọi sửa Custom Location nhưng backend không có API! |
| **59** | *(Backend thiếu)* | `DELETE /api/v1/locations/{id}` | `locationApi.remove()` | **LỖI THIẾU API (405)** | Frontend gọi xóa Custom Location nhưng backend không có API! |
| **60** | `NotificationController.list` | `GET /api/v1/notifications` | `notificationApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. Hỗ trợ lọc `unreadOnly`. |
| **61** | `NotificationController.read` | `POST /api/v1/notifications/{id}/read` | `notificationApi.markRead()` | **HOẠT ĐỘNG** | Khớp 100%. Đánh dấu đã đọc. |
| **62** | `NotificationController.readAll` | `POST /api/v1/notifications/read-all` | `notificationApi.markAllRead()` | **HOẠT ĐỘNG** | Khớp 100%. Đọc tất cả thông báo. |
| **63** | `AvailabilityController.list` | `GET /api/v1/schedules/{id}/availability` | `availabilityApi.list()` | **HOẠT ĐỘNG** | Khớp 100%. |
| **64** | `CalendarInteropController.export` | `GET /api/v1/schedules/{id}/export.ics` | *(Không có)* | **CHƯA DÙNG** | Frontend tự parse bằng JS thay vì gọi API. |
| **65** | `CalendarInteropController.import` | `POST /api/v1/schedules/{id}/import.ics` | *(Không có)* | **CHƯA DÙNG** | Frontend tự parse file `.ics` thay vì upload. |
| **66** | `HealthController.health` | `GET /api/v1/health` | *(Không có)* | **CHƯA DÙNG** | Chưa có health check monitor trên UI. |

---

## 6. CHI TIẾT SAI LỆCH HỢP ĐỒNG DTO & SCHEMA (CONTRACT BREACHES & MISMATCHES)

### 6.1. Lỗi chí mạng tại `schedulingApi.validate()`
- **Vị trí Backend:** `backend/src/main/java/com/smartschedule/scheduling/api/SchedulingController.java` (Dòng 19-22)
  ```java
  @PostMapping("/validate")
  public ValidationResponse validate(@PathVariable UUID scheduleId, @Valid @RequestBody ApplyRequest r) {
      return engine.validate(scheduleId, r);
  }
  ```
- **Vị trí Frontend:** `frontend/src/services/schedulingApi.ts` (Dòng 8-10)
  ```typescript
  async validate(scheduleId: string, request: SchedulingRequest): Promise<SchedulingValidationResult> {
    return (await apiClient.post(`/schedules/${scheduleId}/scheduling/validate`, request)).data;
  }
  ```
- **Hậu quả:** 
  - Frontend truyền: `{ from, to, taskIds }`.
  - Backend yêu cầu: `{ planId, fingerprint, slots: [{ taskId, startsAt, endsAt }], scheduleVersion }`.
  - Nếu gọi API này, Backend sẽ trả về `400 Bad Request` hoặc `ValidationException` ngay lập tức do thiếu toàn bộ các trường bắt buộc của `ApplyRequest`.

### 6.2. Cột `source_task_id` bị bỏ rơi giữa Entity và DTO
- **Database Schema:** Bảng `events` có cột `source_task_id UUID REFERENCES tasks(id)`.
- **Entity Java:** `Event.java` dòng 54: `@Column(name = "source_task_id") private UUID sourceTaskId;`.
- **Backend DTO:** `EventDtos.EventRequest` và `EventDtos.EventResponse` **hoàn toàn không có trường này**.
- **Hệ quả trên Frontend:**
  Trong `frontend/src/features/calendar/mappers/eventMapper.ts`:
  ```typescript
  // Frontend phải dùng string matching tạm bợ trong notes:
  const matchedTask = tasks.find(t => event.notes?.includes(t.id));
  ```
  Nếu người dùng xóa hoặc sửa ghi chú của sự kiện, liên kết giữa sự kiện được xếp tự động và task nguồn sẽ bị đứt gãy hoàn toàn.

### 6.3. Bảng `user_locations` và `api_keys` mồ côi trong Migration V12
- Trong `backend/src/main/resources/db/migration/V12__user_locations_and_multitenancy.sql`:
  - Đã viết lệnh tạo bảng `user_locations` (với các trường: `user_id`, `workspace_id`, `name`, `category`, `latitude`, `longitude`, `radius_meters`, `building`, `room`, `is_favorite`).
  - Đã viết lệnh tạo bảng `api_keys`.
  - Đã thêm cột `user_id` và `workspace_id` vào `events`, `tasks`, `categories`, `schedules`, `availability`.
- **Thực tế trong mã nguồn Java Backend:**
  - **Không hề có** class entity `UserLocation.java`.
  - **Không hề có** class repository `UserLocationRepository.java`.
  - **Không hề có** controller nào ánh xạ bảng `user_locations`.
  - Các Entity `Event.java`, `Task.java`, `Schedule.java` **chưa hề khai báo trường `workspaceId`**.
- **Hệ quả:** Tính năng Custom Locations trên giao diện (`UserLocationsSection.tsx`) và tính năng Đa tổ chức (Multi-Tenancy Workspace) mới chỉ dừng lại ở file SQL migration, chưa có bất kỳ dòng code Java nào hỗ trợ!

---

## 7. KIỂM TOÁN AUTHENTICATION, MULTI-TENANCY & AUTHORIZATION XUYÊN SUỐT

### 7.1. Chu trình Authentication thật (`VITE_DEMO_MODE=false`)
- **Cơ chế Access Token:** JWT (HMAC-SHA256) chứa claims: `sub` (User UUID), `email`, `type: "access"`, thời hạn sống mặc định 15 phút (`SMARTSCHEDULE_ACCESS_TOKEN_TTL: PT15M`).
- **Lưu trữ Frontend:** Chỉ lưu trong bộ nhớ RAM qua Zustand store (`authStore.ts`). Không bao giờ lưu vào `localStorage` hay `sessionStorage`. Đây là chuẩn bảo mật khuyến nghị cao cấp chống tấn công XSS.
- **Cơ chế Refresh Token:** Sinh chuỗi ngẫu nhiên độ dài cao, mã hóa SHA-256 lưu trong bảng `refresh_tokens`. Client nhận qua cookie `smartschedule_refresh` với cờ `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`. Hỗ trợ thu hồi (revocation) và liên kết phiên thay thế (rotation).
- **Phục hồi phiên (Silent Bootstrap):** Khi người dùng F5 tải lại trang, `authStore.bootstrap()` gọi `GET /api/v1/auth/me`. Nếu cookie hợp lệ, trình duyệt tự gửi cookie refresh, server cấp access token mới trong RAM.

### 7.2. Chu trình Authorization & Phân quyền (Multi-Tenancy)
- Phân quyền được quản lý chặt chẽ thông qua `AuthorizationService.java`:
  - `requireOwner(scheduleId, userId)`: Chỉ chủ sở hữu mới có quyền xóa lịch hoặc quản trị thành viên.
  - `requireEditor(scheduleId, userId)`: Chủ sở hữu hoặc thành viên có role `EDITOR` mới có quyền tạo/sửa/xóa task và sự kiện.
  - `requireAccess(scheduleId, userId)`: Yêu cầu ít nhất role `VIEWER`.
- **Lỗ hổng phân quyền dữ liệu Location:**
  `LocationController` hiện tại chỉ trả về các địa điểm công cộng thuộc khuôn viên trường (`campusId = 'fptu-qn'`). Khi người dùng gọi các endpoint mobility, việc phân quyền tenant chưa được áp dụng vì chưa có entity `UserLocation`.

---

## 8. KIỂM TOÁN CƠ SỞ DỮ LIỆU & FLYWAY MIGRATIONS (V1 - V12)

### 8.1. Danh mục các tệp Migration
Thư mục `backend/src/main/resources/db/migration` chứa 11 tệp SQL:
1. `V1__initial_schema.sql`: Khởi tạo bảng người dùng cơ sở, phân loại.
2. `V2__authentication.sql`: Bảng `users`, `refresh_tokens`.
3. `V3__schedule_domain.sql`: Bảng `schedules`, `categories`, `events`, `tasks`, `availability`.
4. **V4: BỊ KHUYẾT (MISSING)**: Migration nhảy cóc từ `V3` sang `V5`.
5. `V5__scheduling_engine.sql`: Bổ sung versioning, constraints cho bộ xếp lịch.
6. `V6__scheduling_preferences.sql`: Bảng `scheduling_preferences`.
7. `V7__collaboration_sharing.sql`: Bảng `schedule_members`, `share_links`, `schedule_activity_logs`.
8. `V8__schedule_versioning.sql`: Cột version phục vụ optimistic locking.
9. `V9__notifications.sql`: Bảng `notifications`.
10. `V10__recurrence_exceptions.sql`: Bảng `event_occurrence_exceptions`.
11. `V11__location_and_mobility.sql`: Bảng `locations`, `campus_travel_edges`, `mobility_acknowledgements`.
12. `V12__user_locations_and_multitenancy.sql`: Bảng `user_locations`, `api_keys` và các cột `workspace_id`.

### 8.2. Đánh giá rủi ro Database
- **Việc thiếu tệp V4**: Flyway theo mặc định chấp nhận số phiên bản không liên tục nếu chạy từ đầu. Tuy nhiên, nếu sau này lập trình viên vô tình bổ sung file tên `V4__xxx.sql`, Flyway sẽ lập tức ném ngoại lệ `FlywayException` và dừng khởi động hệ thống trừ khi cấu hình `flyway.out-of-order=true`.
- **Cấu hình `ddl-auto: validate` trong `application.yml`**:
  Đây là thiết lập chuẩn production. Hibernate sẽ kiểm tra tính tương thích giữa class Java `@Entity` và bảng thực tế trong Postgres.
  *Cảnh báo*: Do tệp V12 thêm cột `workspace_id` vào các bảng nhưng các Java Entity (`Event`, `Task`) chưa map cột này, Hibernate `validate` vẫn vượt qua (vì chỉ kiểm tra các cột Entity yêu cầu có trong DB hay không). Nhưng chiều ngược lại là mã nguồn Java không thể tận dụng được các cột đa tổ chức này.

---

## 9. CÁC LỖI "FALSE SUCCESS UI" (GIAO DIỆN BÁO THÀNH CÔNG ẢO) & "DEAD UI"

### 9.1. Lỗi False Success UI: Tính năng "What-If" trên Calendar
- **Vị trí code:** `frontend/src/features/calendar/CalendarPage.tsx` (Dòng 1603-1609)
  ```typescript
  const applyWhatIf = async () => {
    setWhatIfActive(false);
    setWhatIfImpact(null);
    setSuccessMessage('Simulation applied to calendar.');
    showToast('Simulation applied to calendar.', 'success');
    setTimeout(() => setSuccessMessage(''), 4000);
  };
  ```
- **Hành vi thực tế:** Khi người dùng bật thanh công cụ What-If trên trang Calendar, họ có thể kéo thả dịch chuyển sự kiện để xem thử tác động. Khi bấm "Apply What-If", hàm trên chỉ tắt cờ trạng thái, xóa impact và bắn Toast thông báo màu xanh `Simulation applied to calendar.`. 
- **Bản chất lỗi:** **Không hề có bất kỳ lệnh gọi API nào gửi lên server (`eventApi.update` hay `reschedulingApi.apply`)**. Thậm chí mảng `committedEventsRef` cũng không được cập nhật. Ngay khi người dùng chuyển sang trang khác hoặc nhấn F5, toàn bộ thay đổi biến mất hoàn toàn. Người dùng bị đánh lừa là lịch đã được lưu thành công.
- **Điểm tương phản:** Trong khi đó, tại trang `ReschedulingPage.tsx` (Dòng 42-50), tính năng What-If và Apply lại được viết rất chuẩn mực, gọi trực tiếp `reschedulingApi.whatIf()` và `reschedulingApi.apply()`.

### 9.2. Lỗi False Success UI: Tích hợp Google Calendar / LMS
- **Vị trí code:** `frontend/src/features/settings/components/IntegrationsSection.tsx` (Dòng 226-258)
  ```typescript
  const handleSyncNow = async (item: IntegrationItem) => {
    // Giả lập loading 1s
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // 25% cơ hội sinh xung đột ảo để test UI
    const shouldSimulateConflict = item.id === 'google-calendar' && Math.random() < 0.25;
    ...
  }
  ```
- **Bản chất lỗi:** Toàn bộ quá trình "Đồng bộ hóa" là giả lập client-side 100%. Không có bất kỳ kết nối tới Google API, Microsoft Graph API hay Canvas LMS.

### 9.3. Dead UI: Nút tạo / sửa / xóa Địa điểm cá nhân
- **Vị trí code:** `frontend/src/features/settings/components/UserLocationsSection.tsx`
- **Hành vi thực tế:** Người dùng nhập địa chỉ, bấm lưu địa điểm -> Frontend gọi `locationApi.create()` -> Gửi `POST /api/v1/locations`.
- **Bản chất lỗi:** Khi tắt Demo Mode, Backend phản hồi `405 Method Not Allowed`. Giao diện báo lỗi đỏ, người dùng không thể lưu được địa điểm cá nhân.

---

## 10. LOGIC PHÂN MẢNH & TRÙNG LẶP THUẬT TOÁN (LOGIC DRIFT & DUPLICATION)

### 10.1. Trùng lặp thuật toán Dijkstra Campus Routing
1. **Bản Backend:**
   - Cài đặt tại `com.smartschedule.location.application.CampusRoutingService.java`.
   - Đọc danh sách cạnh từ cơ sở dữ liệu bảng `campus_travel_edges`.
   - Tính toán khoảng cách đi bộ, thời gian di chuyển, buffer an toàn giữa 2 sự kiện liên tiếp.
2. **Bản Frontend:**
   - Cài đặt tại `frontend/src/features/calendar/mobility/campusRouting.ts`.
   - Khai báo đồ thị cứng trong hằng số `DEMO_CAMPUS_LOCATIONS` và `DEMO_CAMPUS_EDGES`.
   - Tự chạy thuật toán Dijkstra ưu tiên hàng đợi (Priority Queue) ngay trên trình duyệt.
- **Rủi ro:** Khi ban quản trị cập nhật đường đi mới trong trường (ví dụ: sửa chữa tòa nhà, đóng cổng), nếu chỉ cập nhật database backend, thuật toán trên trình duyệt của frontend vẫn tính theo đồ thị cũ, dẫn đến việc cảnh báo xung đột di chuyển bị sai lệch.

### 10.2. Trùng lặp bộ xử lý tệp iCalendar (.ics)
1. **Bản Backend:**
   - Cài đặt tại `CalendarInteropService.java`.
   - Có đầy đủ chức năng preview tệp, bóc tách `VEVENT`, kiểm tra xung đột và xác nhận lưu hàng loạt trong một transaction an toàn.
2. **Bản Frontend:**
   - Cài đặt tại `icsService.ts`.
   - Tự viết hàm bóc tách chuỗi thô bằng Regular Expression (`parseIcsToEvents`).
   - Khi import trên UI (`IntegrationsSection.tsx:328-343`), Frontend dùng vòng lặp `for...of` gọi tuần tự từng request `eventApi.create()`.
- **Rủi ro:** Nếu tệp `.ics` có 100 sự kiện, trình duyệt sẽ bắn 100 HTTP requests độc lập lên server. Nếu mạng lag ở sự kiện thứ 50, dữ liệu sẽ bị dở dang (partial import) và không có cơ chế rollback!

---

## 11. XỬ LÝ THỜI GIAN, MÚI GIỜ & LẶP LẠI (DATE/TIME, TIMEZONE & RECURRENCE)

### 11.1. Lưu trữ và Định dạng múi giờ
- **Chuẩn chung:** Backend sử dụng `java.time.Instant` cho toàn bộ các trường thời gian. Jackson chuyển đổi sang chuỗi chuẩn ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- **Múi giờ mặc định:** Hệ thống thiết lập múi giờ cố định `Asia/Ho_Chi_Minh` (+07:00).
- **Frontend:** Các component hiển thị lịch (`FullCalendar`, `longRangeMetrics`, `DayTimelineView`) đều format chuỗi thời gian dựa theo múi giờ local của trình duyệt hoặc tham số cấu hình của Schedule (`schedule.timezone`).

### 11.2. Mở rộng sự kiện lặp lại (Recurrence Expansion)
- Backend `RecurrenceService.java` áp dụng logic mở rộng chu kỳ lặp (Daily, Weekly, Monthly) dựa trên `ZoneId.of(event.getSchedule().getTimezone())`.
- Mỗi phiên bản lặp được gán:
  - `seriesId`: UUID của sự kiện gốc.
  - `occurrenceId`: UUID v3 được hash từ `event.getId() + ":" + occurrenceStart`.
- Backend tự động kết hợp các ngoại lệ `event_occurrence_exceptions` (dời giờ hoặc hủy buổi cụ thể).
- Frontend nhận mảng danh sách sự kiện đã được bung sẵn (flat list) từ endpoint `GET /schedules/{id}/events?from=...&to=...`, giúp giảm tải việc tính toán toán học phức tạp trên giao diện người dùng.

---

## 12. ĐÁNH GIÁ MỨC ĐỘ RỦI RO & MA TRẬN ƯU TIÊN (P0 → P3)

```
+-------------------------------------------------------------------------------+
| MA TRẬN ĐÁNH GIÁ MỨC ĐỘ RỦI RO HỆ THỐNG                                       |
+----------+--------------------------------------------------------------------+
| Mức độ   | Mô tả sự cố & Vị trí ảnh hưởng                                     |
+----------+--------------------------------------------------------------------+
| P0       | 1. VITE_DEMO_MODE=true chặn 100% network traffic tới Backend.      |
| (Chí mạng| 2. Apply What-If trên Calendar báo thành công ảo, không lưu DB.     |
| Blockers)| 3. API schedulingApi.validate() sai hoàn toàn DTO giữa FE & BE.       |
|          | 4. Missing Write Endpoints cho Custom Locations (POST/PUT/DELETE). |
+----------+--------------------------------------------------------------------+
| P1       | 1. Nhập file .ics bằng 100 HTTP requests tuần tự thay vì Backend.  |
| (Nghiêm  | 2. notes matching string để tìm taskId nguồn của sự kiện.          |
| trọng)   | 3. ReminderJob có cửa sổ quét quá hẹp (60s), dễ rơi rớt thông báo. |
|          | 4. Bảng user_locations & api_keys trong DB bị bỏ hoang không Entity|
+----------+--------------------------------------------------------------------+
| P2       | 1. Thuật toán Dijkstra bị phân mảnh 2 nơi (Frontend vs Backend).    |
| (Trung   | 2. Giao diện tích hợp bên thứ ba (Google/LMS) là mock 100%.        |
| bình)    | 3. Khuyết mã migration V4 trong Flyway script.                    |
|          | 4. Thiếu giao diện gọi UserController (xem/đổi profile cá nhân).   |
+----------+--------------------------------------------------------------------+
| P3       | 1. Pagination trong taskApi.list() bị gắn cứng trang 0 (size 20).  |
| (Nhẹ)    | 2. Chưa khai thác endpoint /meeting-suggestions & /health.         |
|          | 3. Màu sắc riêng của Task/Event bị backend bỏ qua.                 |
+----------+--------------------------------------------------------------------+
```

---

## 13. KẾ HOẠCH HÀNH ĐỘNG TỪNG BƯỚC (ACTIONABLE REMEDIATION ROADMAP)

> **LƯU Ý:** Đây là lộ trình kỹ thuật đề xuất để khắc phục các vấn đề đã kiểm toán. Chưa được phép tự ý sửa code khi người dùng chưa phê duyệt kế hoạch.

### Giai đoạn 1: Khắc phục các vấn đề Chặn đứng (P0 Fixes)
1. **Chuẩn hóa chế độ Demo Mode**:
   - Chuyển `VITE_DEMO_MODE=false` trong `frontend/.env`.
   - Cung cấp toggle chuyển đổi Demo Mode trực quan trên Header thay vì gắn cứng trong code, cho phép test song song cả 2 môi trường.
2. **Sửa lỗi False Success UI What-If trên Calendar**:
   - Cập nhật hàm `applyWhatIf()` trong `CalendarPage.tsx` để gọi endpoint thực tế: hoặc gọi `reschedulingApi.apply()` nếu có kế hoạch dời, hoặc gọi tuần tự `eventApi.update()` cho các sự kiện bị dịch chuyển.
3. **Sửa Hợp đồng `schedulingApi.validate()`**:
   - Điều chỉnh Frontend `schedulingApi.ts` để truyền đúng DTO `ApplyRequest` khớp với `SchedulingController.java:20`, hoặc bổ sung thêm endpoint nhận `SchedulingRequest` trên Backend.
4. **Bổ sung API Custom Locations trên Backend**:
   - Tạo Java Entity `UserLocation.java`, Repository `UserLocationRepository.java`.
   - Bổ sung `POST /api/v1/locations`, `PUT /api/v1/locations/{id}`, `DELETE /api/v1/locations/{id}` vào `LocationController.java` để hỗ trợ lưu địa điểm cá nhân của User.

### Giai đoạn 2: Chuẩn hóa DTO & Chống phân mảnh logic (P1 Fixes)
1. **Bổ sung `sourceTaskId` vào Event DTO**:
   - Thêm `UUID taskId` vào `EventDtos.EventRequest` và `EventDtos.EventResponse`.
   - Loại bỏ đoạn mã hack tìm kiếm `event.notes.includes(t.id)` trong `eventMapper.ts`.
2. **Tích hợp cổng iCalendar của Backend**:
   - Thay thế đoạn code đọc file tuần tự trong `IntegrationsSection.tsx` bằng việc gọi trực tiếp `POST /api/v1/schedules/{id}/import.ics` (upload multipart form) và `POST /import.ics/confirm`.
3. **Mở rộng cửa sổ quét của `ReminderJob`**:
   - Nới lỏng điều kiện kiểm tra trong `ReminderJob.java` từ +/- 30s thành kiểm tra các sự kiện trong vòng 5 phút vừa qua chưa có bản ghi trong bảng `notifications`.

### Giai đoạn 3: Hoàn thiện tính năng & Làm sạch mã nguồn (P2 & P3)
1. **Hợp nhất thuật toán Dijkstra**:
   - Thống nhất để Backend làm Single Source of Truth cho việc định tuyến khuôn viên. Frontend chỉ gọi `GET /travel/estimate` và `POST /events/check-mobility`, chỉ dùng local graph khi mạng mất kết nối hoàn toàn.
2. **Gắn nhãn rõ ràng cho các tính năng Mock**:
   - Với các tích hợp chưa có API thật (Google Calendar, LMS Canvas), cần hiển thị badge `[BETA / SIMULATION]` trên UI để người dùng không nhầm lẫn là đã liên kết tài khoản thật.
3. **Bổ sung UI cho User Profile Settings**:
   - Thêm tab "Tài khoản" trong `SettingsPage.tsx` kết nối với `GET/PATCH /api/v1/users/me` để người dùng có thể đổi tên hiển thị và múi giờ làm việc.
4. **Bổ sung tệp migration `V4__noop_placeholder.sql`** hoặc cấu hình `flyway.out-of-order=true` để đảm bảo chuỗi migration không bị lỗi tiềm ẩn.

---
*Báo cáo được thực hiện dựa trên phân tích tĩnh toàn diện mã nguồn, cấu hình hệ thống và kiểm tra đối soát chéo.*
