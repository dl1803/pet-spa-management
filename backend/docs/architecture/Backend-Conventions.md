# Backend Conventions – Hệ thống quản lý spa thú cưng

Quy ước viết mã backend ASP.NET Core Web API · Phiên bản 1.0 · Ngày lập: 16/10/2026

Căn cứ: *Backend Architecture v1.0* (viết tắt **BA**), *Requirements & Business Analysis v2* (**R2**), *System Analysis & UI Design v1.3* (**SA**). Mã FR, BR, BP, A, C, R, D, UC, X-xx giữ nguyên theo các tài liệu; số mục dẫn kèm tiền tố (ví dụ BA 3.2).

---

## 1. Giới thiệu

### 1.1 Mục đích và phạm vi

Tập hợp quy tắc bắt buộc khi viết mã backend, rút từ BA. Không lặp lại thiết kế chi tiết: công thức SlotService/PricingService (BA 4.3), danh sách endpoint (SA 5.1.3), từ điển dữ liệu (SA 4.2), danh sách khóa cấu hình (BA 12.2).

Quy ước đặt tên, định dạng mã, Git, kiểm thử: BA không quy định; mục 12 đề xuất cho đồ án. Tên lớp cụ thể chốt khi cài đặt (BA 3.4).

### 1.2 Ràng buộc kỹ thuật (C-02, C-04, SA 3.1, X-05)

- ASP.NET Core Web API, Entity Framework Core, FluentValidation, Serilog, Swagger/OpenAPI; CSDL Supabase PostgreSQL.
- Một backend triển khai thành một đơn vị, không microservices.
- Web giao tiếp backend hoàn toàn qua RESTful API, không truy cập CSDL.
- Không thêm chức năng ngoài nghiệp vụ và yêu cầu hệ thống; không có chức năng đổi hoặc đặt lại mật khẩu.
- Hạ tầng chỉ dùng gói miễn phí (BA 12.1).

### 1.3 Nhãn

- (Đề xuất – tài liệu này): quyết định do BA đưa ra, chưa có trong R2 và SA, chờ nhóm duyệt. Các giá trị số và quyết định chính tổng hợp ở mục 13; danh sách đầy đủ ở BA 14.
- (Đề xuất – quy ước): quy ước do tài liệu này đề xuất ở mục 12, BA không có; chờ nhóm duyệt.

---

## 2. Cấu trúc solution và quy tắc phụ thuộc

Clean Architecture 4 tầng (X-12); mã nguồn chỉ phụ thuộc hướng vào trong.

| Project | Thư mục | Được tham chiếu |
| --- | --- | --- |
| Domain | `Entities/` · `StateMachine/` · `Services/` (SlotService, PricingService) | Không project nào |
| Application | `Services/` (theo 6 nhóm ở mục 3.2) · `Ports/` | Domain |
| Infrastructure | `Persistence/` (DbContext, Repositories, Migrations) · `Identity/` · `Storage/` · `Payments/` (VNPAY, MoMo) · `BackgroundJobs/` | Application, Domain |
| Api | `Controllers/` · `Dtos/` · `Validators/` · `Middleware/` · `Program.cs` (composition root) | Application; Infrastructure chỉ tại `Program.cs` để nối port với adapter |

Quy tắc:

- Domain không phụ thuộc Application, Infrastructure, API, EF Core, ASP.NET Core, Identity.
- Application không phụ thuộc Infrastructure, API; không biết EF Core, Identity, Supabase, cổng thanh toán, HTTP.
- Infrastructure không phụ thuộc API.

---

## 3. Quy ước theo tầng

### 3.1 Trách nhiệm

| Tầng | Phải | Không được |
| --- | --- | --- |
| API | Kiểm tra cú pháp/định dạng đầu vào (FluentValidation); xác thực JWT, lấy UserId/Role từ token; áp chính sách vai trò; rate limiting, CORS; gọi Application Service; ánh xạ kết quả/lỗi nghiệp vụ sang HTTP và mã lỗi (mục 5.3); chứa endpoint webhook và endpoint job. | Chứa quy tắc nghiệp vụ; đưa vào DTO trường quan trọng do hệ thống quyết định. |
| Application | Hiện thực use case; kiểm tra sở hữu/phạm vi (BR-16) cho mọi request; mở giao dịch, lấy khóa; gọi Domain; gọi port; tạo thông báo; định nghĩa port. | Biết EF Core, Identity, Supabase, cổng thanh toán, HTTP. |
| Domain | Định nghĩa thực thể; chuyển trạng thái đúng trình tự (BR-14); SlotService, PricingService chỉ tính toán trên dữ liệu được truyền vào. | Truy cập dữ liệu; gọi dịch vụ ngoài; phụ thuộc framework. |
| Infrastructure | Hiện thực port (adapter): EF Core/Npgsql và migration, giao dịch và khóa, Identity + JWT, Supabase Storage, cổng thanh toán, BackgroundService. | Chứa quy tắc nghiệp vụ. |

### 3.2 Application Services (BA 3.4)

Chia 6 nhóm; endpoint và BackgroundService chỉ gọi các service này. Việc phân bổ use case theo nhóm là Đề xuất – tài liệu này.

| Nhóm | Use case |
| --- | --- |
| Auth | UC-01 → UC-04 |
| Pet / Catalog / Staff / Config | UC-05 → UC-09, UC-26, UC-27, UC-36 |
| Booking / Slot | UC-10, UC-11, UC-14, UC-15, UC-22, UC-28 |
| Assignment / Lifecycle / Shift | UC-12, UC-13, UC-16 → UC-21, UC-29 → UC-33, UC-35 |
| Pricing / Payment | UC-23 → UC-25 |
| Notification | UC-34 |

### 3.3 Port và Adapter

Application chỉ truy cập hạ tầng và dịch vụ ngoài qua port sau.

| Port (Application) | Adapter (Infrastructure) |
| --- | --- |
| Truy cập dữ liệu | EF Core Repositories + Npgsql |
| Giao dịch và khóa đồng thời | Giao dịch EF Core; `pg_advisory_xact_lock`; `SELECT … FOR UPDATE` |
| Danh tính và token | ASP.NET Core Identity + JWT |
| Lưu trữ ảnh | Supabase Storage |
| Cổng thanh toán | Adapter VNPAY / MoMo (sandbox) |

---

## 4. Quy tắc nghiệp vụ trong mã

### 4.1 Nơi thực thi quy tắc

| Tầng | Quy tắc |
| --- | --- |
| API | Cú pháp/định dạng dữ liệu; vai trò được gọi endpoint (R2 5.1 Bảng 1); tần suất request; origin. |
| Application | BR-16 sở hữu/phạm vi; BR-15 khóa tự đặt lịch (không áp dụng khi lễ tân đặt thay); BR-08 hạn tự đổi/hủy và giữ chỗ; BR-02 thú cưng thuộc khách, dịch vụ áp dụng cho loài; BR-05 ai được cập nhật trạng thái; BR-07 thời điểm thanh toán; BR-09 thanh toán trực tuyến chỉ cho lịch spa; BR-25 xóa hẳn/xóa mềm hồ sơ thú cưng; BR-18 giao dịch và khóa; BR-26, BR-27 hệ quả khi về Pending; ca làm không được rút ngắn/xóa khi còn lịch Confirmed của nhân viên đó trong phần ca bị bỏ (UC-35). |
| Domain | BR-14, BR-06, BR-20 điều kiện chuyển trạng thái; BR-13 (SlotService); BR-04, BR-21 khi đề xuất; BR-11, BR-22 (PricingService); BR-19, BR-23; BR-17 (`Payment.MarkPaid`). |
| Infrastructure / CSDL | BR-04, BR-21, ca làm không chồng; BR-18; BR-14 khi đồng thời; không xử lý lặp webhook (mục 7). |

BR-24 (hoàn tiền) nằm ngoài hệ thống; không có trạng thái hoàn tiền.

### 4.2 Máy trạng thái lịch hẹn (BR-14)

- Mọi chuyển trạng thái đi qua phương thức của `Appointment` và lớp con (`SpaAppointment`, `HotelAppointment`); bảng hành vi ở BA 4.1, bảng chuyển trạng thái ở BA 4.2.
- Chỉ chuyển đúng trình tự tiến, không bỏ bước, không chuyển ngược.
- **Cancelled** đến được từ mọi trạng thái trước Completed và là trạng thái kết thúc.
- Chuyển ngược duy nhất: **Confirmed → Pending** (BR-26, BR-27).
- `Status = Cancelled` ⇔ `CancelReason` có giá trị.
- Hủy khi InProgress hoặc InStay: chỉ quản lý, lý do StoreUnable hoặc CustomerBeyondDeadline; khách không còn quyền tự hủy vì đã quá giờ hẹn (BR-08, FR-CHG-03; Đề xuất – tài liệu này).

**Nguồn đặt lý do hủy** (Đề xuất – tài liệu này): chỉ quản lý được gửi lý do từ client; mọi lý do khác do backend đặt.

| Lý do | Do ai đặt |
| --- | --- |
| CustomerCancelled | Backend, khi khách tự hủy trong hạn (khách không gửi `reason`). |
| StoreUnable | `/reject` (không body, luôn StoreUnable) hoặc quản lý chọn ở `/cancel`. |
| CustomerBeyondDeadline | Quản lý chọn ở `/cancel`. |
| NoShow | Tác vụ nền. |
| CostNotConfirmed | Khách từ chối (`/cost-confirmation/respond`) hoặc tác vụ nền khi hết hạn. |

### 4.3 Hiệu ứng đi kèm khi chuyển trạng thái

Thực hiện trong cùng giao dịch với việc chuyển trạng thái.

| Chuyển | Hiệu ứng |
| --- | --- |
| → Pending (từ Confirmed) | Spa: xóa các dòng `AppointmentStaff`. Lưu trú: bỏ gán `CageId` (BR-26, BR-27; SA 4.1, Đề xuất). Khi khách đổi lịch: tính lại `SlotStart`, `SlotEnd`, `BusyUntil`, `StaffRequired` theo nội dung mới (Đề xuất – tài liệu này). |
| → Confirmed | Spa: tạo `AppointmentStaff` (`IsHolding = true`, sao chép `SlotStart`, `BusyUntil`). Lưu trú: gán `CageId`. Lịch từng do khách đổi: tính lại số tiền (BR-26). |
| → Completed hoặc Cancelled | Spa: `AppointmentStaff.IsHolding = false`, giữ lại làm lịch sử công việc (FR-EXE-06). Lưu trú: giải phóng chuồng. |
| Vô hiệu hóa nhân viên spa (FR-STF-03) | `AppUser.IsActive = false`, thu hồi refresh token; mọi lịch spa Confirmed có nhân viên đó về Pending (xóa các dòng `AppointmentStaff`), khách được thông báo. Không còn nhân viên rảnh thì quản lý từ chối lịch (UC-13). |
| Hủy do vắng mặt | Đếm số lần vắng mặt để xét khóa tự đặt lịch (mục 9). |

### 4.4 Thanh toán, xác nhận chi phí, khóa đặt lịch

- `Payment`: Unpaid → Paid, Paid là kết thúc. Tại quầy: `receivedAmount` ≥ `Amount` (thấp hơn → 409 AMOUNT_MISMATCH). Trực tuyến: số tiền cổng xác nhận = `Amount` (Đề xuất – tài liệu này).
- Thời điểm ghi nhận (BR-07): Spa khi lịch Completed (quầy hoặc trực tuyến); Stay khi lịch Confirmed, trước tiếp nhận và không chờ xác nhận chi phí mới (BR-23), là điều kiện sang InStay (chỉ quầy); LateFee khi trả thú cưng ở InStay, là điều kiện sang Completed nếu có phí (chỉ quầy).
- `CostConfirmation`: Pending → Accepted, Rejected, Expired; tối đa một yêu cầu Pending mỗi lịch hẹn; Rejected/Expired ⇒ hủy lịch hẹn, lý do CostNotConfirmed.
- `Customer.IsBookingLocked`: khóa khi vắng mặt lần thứ 4 trong 30 ngày (BR-15); quản lý gỡ khóa (FR-BOOK-07).

### 4.5 Domain service

- SlotService và PricingService chỉ tính trên dữ liệu truyền vào; công thức ở BA 4.3.
- Nhóm kích cỡ do `Pet.DetermineSizeGroup` xác định theo `SizeRule`; bỏ qua nhóm do client gửi (BR-19).
- Đối chiếu cân nặng (BR-23, FR-EXE-10) trả `weightCheck.result` là `OK`, `PRICE_DECREASED` hoặc `NEEDS_CONFIRMATION` (BA 4.3).
- Khi nhóm kích cỡ đổi: lịch spa giữ nguyên thời lượng, khung giờ, số nhân viên (BR-23, X-10); lịch lưu trú kiểm tra chuồng đã gán còn phù hợp.
- `Payment.Amount` do PricingService tính theo đơn giá hiện có khi đến thời điểm ghi nhận; không lưu giá và thời lượng ở `AppointmentService` (FR-PAY-01, SA 4.2.12).

---

## 5. Quy ước API

Đặc tả từng endpoint: SA 5.1.3.

### 5.1 Quy ước chung (SA 5.1.1)

| Hạng mục | Quy ước |
| --- | --- |
| Giao thức | REST over HTTPS; JSON UTF-8; tiền tố `/api/v1`; tài liệu hóa bằng Swagger/OpenAPI. |
| Xác thực | `Authorization: Bearer <accessToken>` cho mọi endpoint trừ nhóm Ẩn danh (đăng ký, đăng nhập, làm mới token). Webhook dùng chữ ký của cổng; `/internal/jobs/run` dùng `X-Job-Secret`. |
| Thời gian, tiền | Thời gian ISO 8601 có múi giờ; tiền là số nguyên VND. |
| Danh sách | Tham số `page`, `pageSize`; trả `{ items, page, pageSize, total }`; phân trang và lọc thực hiện ở backend. |
| Lỗi | ProblemDetails kèm `code` nghiệp vụ: `{ status, code, title, detail }`. |

### 5.2 Dữ liệu do backend quyết định

- Request không chứa, hoặc bỏ qua nếu thừa: `role`, `sizeGroup`, `status`, `amount`.
- `staffId`, `cageId` chỉ nhận khi quản lý xác nhận lịch hẹn.
- Giá, thời lượng, số nhân viên cần, khung giữ chỗ, hạn xác nhận chi phí do backend tính từ dữ liệu và cấu hình.

### 5.3 Mã lỗi (SA 5.1.2)

Lỗi nghiệp vụ mang `code` từ Application/Domain; tầng API ánh xạ sang HTTP status.

| HTTP | Mã lỗi (`code`) |
| --- | --- |
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHENTICATED (thiếu/sai/hết hạn token; đăng nhập sai; tài khoản vô hiệu hóa; webhook sai chữ ký) |
| 403 | FORBIDDEN (sai vai trò hoặc ngoài phạm vi sở hữu); BOOKING_LOCKED |
| 404 | NOT_FOUND |
| 409 | DUPLICATE_CONTACT; SLOT_FULL; NO_CAPACITY; STAFF_CONFLICT; CAGE_CONFLICT; INVALID_TRANSITION; CHANGE_WINDOW_CLOSED; PHOTO_REQUIRED; SERVICES_INCOMPLETE; STAFF_COUNT_MISMATCH; SHIFT_OVERLAP; SHIFT_HAS_APPOINTMENTS; COST_CONFIRMATION_PENDING; PAYMENT_NOT_DUE; AMOUNT_MISMATCH; STAFF_OUT_OF_SHIFT (Đề xuất – tài liệu này); CUSTOMER_NOT_LOCKED; DUPLICATE_CAGE_CODE; COST_CONFIRMATION_EXPIRED (3 mã này Đề xuất theo API-Notes mục 8 #6) |
| 429 | RATE_LIMITED |
| 500 | Lỗi hệ thống, không lộ chi tiết nội bộ |

### 5.4 Bổ sung cho SA 5.1.3 (Đề xuất – tài liệu này)

- `POST /appointments/{id}/confirm` có trường tùy chọn `confirmOutOfShift`. Quản lý chọn tay nhân viên ngoài ca mà chưa gửi `confirmOutOfShift = true` → 409 `STAFF_OUT_OF_SHIFT` kèm danh sách nhân viên; xác nhận lại với `true` thì lưu (UC-12).
- `POST /appointments/{id}/cancel`: khách hàng không gửi `reason`; quản lý gửi `reason` là StoreUnable hoặc CustomerBeyondDeadline.
- Các endpoint không dùng JWT: `GET /payments/ipn/vnpay`, `POST /payments/ipn/momo`, `POST /internal/jobs/run`, `GET /health`.
- Không có endpoint riêng cho các FR hệ thống tự thực hiện: FR-BOOK-06, FR-EXE-07 (tác vụ nền); FR-PAY-01 (nằm trong endpoint thanh toán); FR-LFC-01, FR-LFC-02 (máy trạng thái); FR-ASG-01 nằm trong `/suggestions`, FR-PET-04 nằm trong `/pets`.

---

## 6. Bảo mật

### 6.1 Xác thực

| Hạng mục | Quy ước |
| --- | --- |
| Cơ chế | JWT Bearer + ASP.NET Core Identity, qua port danh tính và token. |
| Token | Chỉ có Role = Customer, Staff, Manager (A-02); claim UserId, Role. `StaffRole` (Receptionist, SpaStaff) lấy từ dữ liệu Staff. |
| Định danh đăng nhập | `AppUser.UserName` = số điện thoại chuẩn hóa (X-02). Khách hàng: trùng `Customer.Phone`; đổi số phải cập nhật cả hai trong một giao dịch. |
| Access token | 15 phút (`Jwt__AccessTokenMinutes`; Đề xuất – tài liệu này, R-01). |
| Refresh token | 7 ngày (`Jwt__RefreshTokenDays`; Đề xuất – tài liệu này). Lưu băm (`RefreshToken.TokenHash`), thu hồi bằng `RevokedAt`, xoay vòng khi làm mới. Token đã thu hồi bị gửi lại → thu hồi mọi refresh token của tài khoản. |
| Mật khẩu | Băm bằng PasswordHasher của Identity; không trả `PasswordHash` trong response. |
| Tài khoản vô hiệu hóa | `IsActive = false`: từ chối đăng nhập và làm mới token; thu hồi refresh token. Mỗi request đã xác thực kiểm tra `AppUser.IsActive` qua port danh tính và token; `false` → 401 (FR-STF-03; Đề xuất – tài liệu này). |
| Tạo tài khoản | Đăng ký luôn tạo Role = Customer. Tạo nhân viên luôn tạo Role = Staff kèm `StaffRole` do quản lý chọn. Không có chức năng tạo tài khoản quản lý qua giao diện. |
| Tài khoản quản lý đầu tiên | Bước khởi tạo chạy khi triển khai (SA 7.2), đọc `Seed__ManagerUserName`, `Seed__ManagerPassword`; idempotent: không làm gì nếu đã có tài khoản Role = Manager; sau lần chạy đầu, gỡ hai biến khỏi môi trường (Đề xuất – tài liệu này, R-02). |
| Đăng nhập lỗi | 401, thông báo chung không nêu trường sai; ghi log, không ghi mật khẩu. |

### 6.2 Phân quyền

Kiểm tra lại mọi request, không phụ thuộc kiểm tra ở web (kể cả menu bị ẩn). Khi xác thực hoặc kiểm tra quyền gặp lỗi, mặc định **từ chối**.

| Lớp | Nơi thực hiện | Nội dung | Khi vi phạm |
| --- | --- | --- | --- |
| 1. Vai trò | API (Controller) | Role trong token; đối chiếu ma trận R2 5.1 Bảng 1. | 403 FORBIDDEN |
| 2. Sở hữu/phạm vi (BR-16) | Application | Khách hàng: dữ liệu của mình. Nhân viên spa: lịch được phân công. Lễ tân: toàn cửa hàng, không cập nhật tiến độ thực hiện. Quản lý: toàn cửa hàng. Chi tiết: R2 5.1 Bảng 2. | 403 FORBIDDEN, không trả thông tin |

### 6.3 Kiểm soát bổ sung

| Hạng mục | Quy ước |
| --- | --- |
| HTTPS | Bắt buộc ở mọi môi trường triển khai. |
| Rate limiting | Middleware tích hợp của ASP.NET Core cho đăng ký, đăng nhập, làm mới token và đặt lịch; vượt giới hạn → 429 RATE_LIMITED. Đọc IP client từ forwarded headers (backend chạy sau proxy của Render). Ngưỡng ở mục 13. |
| CORS | Chỉ đúng 3 origin của 3 web (`Cors__AllowedOrigins`). |
| Webhook cổng thanh toán | Không JWT; xác minh chữ ký/secret của cổng trước khi xử lý; sai → 401, ghi log, không cập nhật thanh toán. |
| `/internal/jobs/run` | Không JWT; xác minh header `X-Job-Secret` (`Jobs__Secret`); không nhận dữ liệu. |
| Secret | Khóa ký JWT, chuỗi kết nối, secret cổng thanh toán, khóa Supabase, `Jobs__Secret` đặt ở biến môi trường/secret store, không nằm trong mã nguồn. |
| Log bảo mật | Ghi đăng nhập thất bại, request bị từ chối, webhook bị từ chối, kèm danh tính người thực hiện; không ghi mật khẩu, token, secret. |
| Lỗi hệ thống | 500 không lộ chi tiết nội bộ; chi tiết ghi log. |

---

## 7. Nhất quán khi đồng thời (BR-18)

### 7.1 Cơ chế theo quy tắc

| Quy tắc | Cơ chế | Khi vi phạm |
| --- | --- | --- |
| Không vượt số nhân viên khả dụng (BR-13) | Giao dịch đặt lịch lấy `pg_advisory_xact_lock` theo ngày, tính lại `E − Tải đỉnh ≥ n` rồi mới ghi. | 409 SLOT_FULL |
| Không trùng nhân viên spa (BR-04) | Ràng buộc loại trừ `gist` trên `AppointmentStaff (StaffId, khoảng BusyFrom–BusyUntil)` cho dòng `IsHolding`; khóa dòng lịch hẹn khi xác nhận. | 409 STAFF_CONFLICT |
| Không chồng ca làm của một nhân viên | Ràng buộc loại trừ `gist` trên `WorkShift (StaffId, khoảng ca)`. | 409 SHIFT_OVERLAP |
| Không trùng chuồng, không vượt sức chứa (BR-21) | Ràng buộc loại trừ `gist` trên `(CageId, khoảng đêm)` cho lịch lưu trú Confirmed, InStay; khi đặt lưu trú dùng khóa tư vấn theo loài/nhóm kích cỡ để đếm lại chuồng trống (tính cả lịch Pending). | 409 CAGE_CONFLICT / NO_CAPACITY |
| Chuyển trạng thái đúng trình tự (BR-14) | Máy trạng thái ở Domain; cập nhật có điều kiện `WHERE Status = trạng thái cũ` trong giao dịch. | 409 INVALID_TRANSITION |
| Không xử lý lặp webhook/tác vụ nền | `TxnRef` duy nhất; xử lý idempotent; khóa dòng `Payment`. | Bỏ qua bản lặp |

### 7.2 Mẫu giao dịch cho thao tác ghi nhạy cảm

1. Application kiểm tra quyền, khóa đặt lịch, tính hợp lệ nghiệp vụ **trước** khi mở giao dịch.
2. Mở giao dịch; lấy khóa tư vấn (đặt lịch) hoặc `SELECT … FOR UPDATE` dòng lịch hẹn/thanh toán (xác nhận, thanh toán).
3. Đọc lại điều kiện trong giao dịch (số nhân viên khả dụng, chuồng trống, `Status`), gọi Domain.
4. Ghi; vi phạm ràng buộc hoặc điều kiện → rollback và trả mã lỗi 409 tương ứng; ngược lại commit.
5. Sau commit, tạo thông báo (mục 10.3).

Đổi lịch hẹn của khách (UC-14) và của quản lý (UC-15) dùng cùng đường kiểm tra khả dụng như đặt lịch.

---

## 8. Dữ liệu

Chi tiết cột, kiểu, ràng buộc: SA 4.2.

| Hạng mục | Quy ước |
| --- | --- |
| Kiểu dữ liệu | Khóa chính `uuid`; thời gian `timestamptz` lưu UTC; tiền VND `numeric(12,0)`. |
| Múi giờ | Hiển thị và tính “đêm” theo múi giờ cửa hàng (`App__TimeZone`, đề xuất Asia/Ho_Chi_Minh). |
| Ánh xạ lịch hẹn | Lịch spa và lưu trú dùng chung bảng `Appointment`, phân biệt bằng `Type`; cột riêng của loại kia để NULL; ánh xạ sang `SpaAppointment`, `HotelAppointment` ở Domain bằng EF Core. |
| CHECK | Theo `Type` (spa: `SlotStart`, `SlotEnd`, `BusyUntil`, `StaffRequired` bắt buộc, trường lưu trú NULL; lưu trú: ngược lại); `Status = Cancelled` ⇔ `CancelReason` có giá trị; các trường liệt kê (`Status`, `Species`, `SizeGroup`, …). |
| Ràng buộc loại trừ | Extension `btree_gist`, áp dụng cho `AppointmentStaff`, `WorkShift`, `Appointment (CageId, khoảng đêm)` (mục 7). |
| UNIQUE | `AppUser.UserName`, `Customer.Phone`, `RefreshToken.TokenHash`, `Cage.Code`, `PaymentTransaction.TxnRef`, `Payment (AppointmentId, Kind)`. |
| Chỉ mục | `(Status, SlotStart)`, `CustomerId`, `PetId` trên `Appointment`; `StaffId` trên `AppointmentStaff`. |
| Xóa mềm / ngừng | `Pet.IsActive` (BR-25), `Service.IsActive`, `Cage.IsActive`, `AppUser.IsActive`. |
| Giá trị chốt lúc đặt | `BusyUntil`, `StaffRequired` (lịch spa), `ExpiresAt` (xác nhận chi phí): đổi cấu hình không làm sai lịch đã tạo. |
| Dữ liệu cấu hình | `SizeRule`, `WeightTolerance`, `SystemConfig` đọc từ DB; có hiệu lực ngay, không cần triển khai lại. |
| Truy vấn mốc giờ | Chỉ trên dữ liệu một ngày. |
| Khách vãng lai | `Customer.UserId = NULL`. |

---

## 9. Tác vụ nền

| Tác vụ | Điều kiện chọn | Xử lý |
| --- | --- | --- |
| Tự hủy vắng mặt (FR-EXE-07) | Lịch Confirmed chưa tiếp nhận, hiện tại quá giờ hẹn `Booking.HoldMinutes`; giờ hẹn là `SlotStart` (spa) hoặc `PlannedCheckIn` (lưu trú). | Cancelled, lý do NoShow; lưu trú giải phóng chuồng; thông báo. |
| Khóa tự đặt lịch (FR-BOOK-06) | Sau mỗi lần hủy do vắng mặt: đếm lịch NoShow của khách trong `NoShow.WindowDays` theo `CancelledAt`. | Vượt `NoShow.LockThreshold` → `IsBookingLocked = true`. |
| Hết hạn xác nhận chi phí (FR-EXE-11) | `CostConfirmation` Pending có `ExpiresAt` đã qua. | Expired; lịch hẹn Cancelled, lý do CostNotConfirmed; thông báo. |

Quy tắc:

- Hai cách kích hoạt: `POST /internal/jobs/run` (cron-job.org gọi mỗi 5 phút, kèm `X-Job-Secret`, không JWT; trả `200 { processed }`, sai secret trả 401) và `BackgroundService` trong Infrastructure (quét mỗi 1 phút, Đề xuất – tài liệu này). Lần gọi của cron-job.org cũng giữ backend không ngủ và tạo hoạt động DB nhẹ để Supabase không tạm dừng (cần kiểm chứng khi chạy thật).
- Endpoint và BackgroundService chỉ gọi Application Services, không chứa logic xử lý.
- Mốc thời gian đọc từ DB, không dùng bộ đếm bộ nhớ, để xử lý bù sau khi backend khởi động lại hoặc thức dậy.
- Idempotent: cập nhật có điều kiện `WHERE Status = trạng thái cũ` trong giao dịch; chạy lặp hoặc trên nhiều bản không xử lý trùng một lịch hẹn; lịch đã được tiếp nhận kịp thì bị bỏ qua.
- Quy tắc thời gian vẫn kiểm tra ngay tại thao tác: tiếp nhận chỉ hợp lệ khi chưa quá `Booking.HoldMinutes` (UC-16, UC-31); phản hồi xác nhận chi phí sau `ExpiresAt` bị từ chối (UC-30). Tác vụ nền chỉ ảnh hưởng thời điểm đổi trạng thái (Đề xuất – tài liệu này).

---

## 10. Tích hợp và thông báo

### 10.1 Thanh toán trực tuyến VNPAY / MoMo (sandbox) – FR-PAY-03

Khởi tạo (`POST /payments/{id}/online { gateway }`):

- PaymentService kiểm tra: lịch thuộc khách (BR-16), `Kind = Spa`, lịch Completed, `Payment` Unpaid. Lịch lưu trú bị từ chối, chỉ thanh toán tại quầy (BR-09).
- Tạo `PaymentTransaction` với `TxnRef` duy nhất, `RequestedAmount = Payment.Amount` do hệ thống tính; gọi port cổng thanh toán tạo yêu cầu có chữ ký; trả `paymentUrl`.

Webhook (VNPAY: `GET /payments/ipn/vnpay`; MoMo: `POST /payments/ipn/momo`):

1. Xác minh chữ ký qua port cổng thanh toán. Sai → 401, ghi log bảo mật, không cập nhật.
2. Hợp lệ: mở giao dịch, khóa `Payment`.
3. `TxnRef` đã xử lý → bỏ qua.
4. Số tiền cổng xác nhận khác `Amount` → rollback, giữ Unpaid, ghi log (BR-17).
5. Khớp đủ → Paid (`Method = Online`, `PaidAt`), commit, tạo thông báo PaymentRecorded; phản hồi cổng theo đặc tả của cổng.

Web đọc trạng thái bằng `GET /appointments/{id}/payments`.

Xác minh chữ ký (Đề xuất – tài liệu này, R-05): mỗi cổng một adapter riêng; adapter tính lại chữ ký bằng secret của cổng trên đúng tập tham số, theo thuật toán và thứ tự trong tài liệu tích hợp sandbox của cổng đó, rồi so với chữ ký nhận được; ngoài chữ ký còn đối chiếu `TxnRef` đã tạo, kết quả giao dịch và số tiền. Thanh toán tiền mặt và chuyển khoản QR tại quầy là quy trình thủ công, không phải tích hợp API (BR-09).

### 10.2 Ảnh minh chứng – FR-EXE-09 (X-04, Đề xuất)

| Hạng mục | Quy ước |
| --- | --- |
| Kho lưu trữ | Supabase Storage, bucket riêng tư; chỉ backend truy cập; CSDL chỉ lưu `AppointmentPhoto.StorageKey`. |
| Tải lên | `POST /appointments/{id}/photos` (multipart, `kind` = Before hoặc After); chỉ nhân viên spa được phân công; chỉ tệp ảnh; lịch ở Received (ảnh trước) hoặc InProgress (ảnh sau). |
| Xem | `GET /appointments/{id}/photos`: kiểm tra phạm vi (BR-16) rồi trả URL tạm thời. Khách hàng xem ảnh lịch của mình; nhân viên spa được phân công; quản lý. |
| Ảnh trước hợp lệ (BR-20) | Ảnh gần nhất của thú cưng, tải lên trong `Photo.ValidityDays` tính đến thời điểm bắt đầu thực hiện. |
| Giới hạn gói Free | Tối đa 50 MB mỗi tệp; nén, thu nhỏ ảnh trước khi tải lên. |

### 10.3 Thông báo (BP-10, FR-NOT-01 → 06)

- Lưu ở bảng `Notification`, hiển thị trên web; không có SMS/Email.
- Tạo sau commit; chỉ gửi cho actor có tài khoản (khách vãng lai không nhận).
- Người nhận chỉ xem thông báo của mình; chỉ khách hàng và nhân viên spa có chức năng thông báo.

| Sự kiện | `Type` | Người nhận |
| --- | --- | --- |
| Lịch hẹn tạo ở Pending (FR-NOT-01) | BookingReceived | Khách hàng |
| Xác nhận, phân công hoặc điều chỉnh (FR-NOT-02); kèm số tiền tính lại nếu khách đã đổi lịch | ConfirmedAssigned | Khách hàng; nhân viên spa được phân công |
| Chuyển trạng thái thực hiện chính, hoặc về Pending do BR-27 (FR-NOT-03) | StatusChanged | Khách hàng |
| Lịch hẹn Cancelled, kèm lý do (FR-NOT-04) | Cancelled | Khách hàng; nhân viên spa phụ trách (nếu có) |
| Thanh toán thành công (FR-NOT-05) | PaymentRecorded | Khách hàng |
| Cần xác nhận chi phí mới, kèm cân nặng thực tế và chi phí mới (FR-NOT-06) | CostConfirmation | Khách hàng |

---

## 11. Cấu hình, log và tài liệu hóa

### 11.1 Tham số nghiệp vụ (bảng `SystemConfig`, FR-CFG-01)

- Không viết cứng tham số nghiệp vụ trong mã; đọc từ `SystemConfig` (danh sách khóa, mặc định, khoảng cho phép: BA 12.2).
- Quản lý chỉnh qua `GET/PUT /config`; riêng `Hotel.LateFeePerBlock` chỉnh cùng giá lưu trú ở `PUT /hotel/pricing`.
- Giá trị ngoài khoảng cho phép → 400. Có hiệu lực ngay cho thao tác sau đó; lịch hẹn đã tạo giữ giá trị đã chốt.
- `SizeRule` (BR-19) và `WeightTolerance` (BR-23) khởi tạo từ R2 mục 3.4; ngưỡng kích cỡ phải tăng dần, dung sai ≥ 0.
- Dịch vụ, giá, chuồng, giá lưu trú do endpoint riêng quản lý (`/services`, `/cages`, `/hotel/pricing`).

### 11.2 Biến môi trường / secret

| Nhóm | Biến |
| --- | --- |
| CSDL | `ConnectionStrings__Default` |
| JWT | `Jwt__SigningKey`, `Jwt__AccessTokenMinutes`, `Jwt__RefreshTokenDays` |
| Web | `Cors__AllowedOrigins` |
| Rate limiting | `RateLimit__*` |
| Cổng thanh toán | `Payment__Vnpay__*`, `Payment__Momo__*` (mã đối tác, khóa/secret, URL trả về, URL webhook) |
| Lưu ảnh | `Storage__Url`, `Storage__ServiceKey`, `Storage__Bucket` |
| Tác vụ nền | `Jobs__Secret` |
| Hệ thống | `Serilog__MinimumLevel`, `App__TimeZone`, `Seed__ManagerUserName`, `Seed__ManagerPassword` |

### 11.3 Log, health check, tài liệu API

| Hạng mục | Quy ước |
| --- | --- |
| Log | Serilog; mức log theo `Serilog__MinimumLevel`; không ghi mật khẩu, token, secret; ghi sự kiện bảo mật (mục 6.3). |
| Health check | `GET /health`, không JWT, không trả dữ liệu nghiệp vụ (Đề xuất – tài liệu này). |
| API | Swagger/OpenAPI; kiểm thử API bằng Postman (C-03). |

---

## 12. Quy ước mã nguồn, Git và kiểm thử (Đề xuất – quy ước)

BA không quy định nội dung này. Các quy ước dưới đây phù hợp nhóm 4 người, khoảng 75 ngày (SA 3.1); chờ nhóm duyệt.

### 12.1 Đặt tên

Rút từ cách đặt tên BA đã dùng; áp dụng thống nhất cho mọi mã mới.

| Đối tượng | Quy ước | Ví dụ trong BA |
| --- | --- | --- |
| Lớp, phương thức, giá trị enum | PascalCase; riêng `weightCheck.result` giữ nguyên `OK`, `PRICE_DECREASED`, `NEEDS_CONFIRMATION` (BA 4.3) | `SpaAppointment`, `AssignStaff()`, `CustomerCancelled` |
| Hậu tố lớp theo thư mục | `...Controller`, `...Dto`, `...Validator`, `...Service` | thư mục `Controllers/`, `Dtos/`, `Validators/`, `Services/` |
| Interface (port) | Tiền tố `I` | — |
| Trường JSON | camelCase | `confirmOutOfShift`, `receivedAmount`, `pageSize` |
| Route | Chữ thường, nối bằng dấu gạch ngang | `/work-shifts`, `/check-in`, `/cost-confirmation/respond` |
| Mã lỗi `code` | CHỮ_HOA_GẠCH_DƯỚI | `SLOT_FULL`, `STAFF_OUT_OF_SHIFT` |
| Khóa `SystemConfig` | `Nhóm.Tên` | `Booking.HoldMinutes` |
| Biến môi trường | `Nhóm__Tên` | `Jwt__SigningKey` |

Tên bảng, cột CSDL theo SA 4.2.

### 12.2 Mã nguồn

- Định dạng mã thống nhất bằng một tệp `.editorconfig` ở gốc solution, mọi thành viên dùng chung.
- Mã lỗi mới phải được thêm vào SA 5.1.2 và bảng mục 5.3, rồi ánh xạ ở tầng API, trước khi dùng.

### 12.3 Git

- `main` luôn ở trạng thái triển khai được.
- Mỗi công việc một nhánh `feature/<mã UC hoặc FR>-<mô tả ngắn>`; gộp vào `main` qua Pull Request, có ít nhất một thành viên khác duyệt.
- Commit message: `<loại>(<mã UC/FR/BR>): <nội dung>`, loại là `feat`, `fix`, `refactor`, `test` hoặc `docs`; ví dụ `feat(UC-14): khách tự đổi lịch trong hạn`.
- Mỗi thay đổi lược đồ CSDL là một migration EF Core, commit cùng mã sử dụng nó; không sửa migration đã gộp vào `main`.
- Không commit secret (mục 6.3).

### 12.4 Kiểm thử

| Loại | Phạm vi | Nguồn |
| --- | --- | --- |
| Unit test Domain | Máy trạng thái, SlotService, PricingService, `Pet.DetermineSizeGroup`, `Payment.MarkPaid`; Domain không phụ thuộc framework nên chạy không cần CSDL. | Mục 3.1 |
| Kiểm thử API | Bộ Postman chung (C-03); mỗi endpoint mới có mô tả Swagger và ít nhất một request trong bộ Postman; mỗi mã lỗi 409 ở mục 5.3 có ít nhất một ca kiểm thử. | C-03, mục 5.3 |
| Kiểm thử đồng thời | Nhiều request cùng tranh chỗ cuối cùng (mốc giờ, chuồng, nhân viên): chỉ số lượng trong sức chứa thành công. Chạy trên PostgreSQL thật vì ràng buộc `gist` và khóa tư vấn chỉ có ở PostgreSQL. | BA 2.2 (R-04), mục 7 |
| Kiểm thử tải nhỏ | 20 người dùng đồng thời; p95 theo chỉ tiêu ở BA 2.2. | BA 2.2 |

---

## 13. Giá trị và quyết định đề xuất chờ nhóm duyệt

Các mục dưới đây do BA đề xuất (R2 và SA không có căn cứ); các con số là giá trị khởi điểm, thay bằng giá trị chốt của nhóm hoặc cửa hàng (BA 14). Quy ước ở mục 12 do tài liệu này đề xuất, không nằm trong bảng.

| Hạng mục | Giá trị khởi điểm | Mục |
| --- | --- | --- |
| Access token / refresh token | 15 phút / 7 ngày, xoay vòng, phát hiện dùng lại | 6.1 |
| Rate limiting | 10 request/phút: theo IP cho đăng ký, đăng nhập, làm mới token; theo tài khoản cho đặt lịch của khách | 6.3 |
| Chu kỳ BackgroundService / cron-job.org | 1 phút / 5 phút | 9 |
| Đường dẫn health check | `GET /health` | 11.3 |
| Hiệu lực tức thời của vô hiệu hóa tài khoản | Kiểm tra `IsActive` mỗi request đã xác thực | 6.1 |
| Số tiền nhận | Quầy: ≥ phải trả; trực tuyến: bằng đúng | 4.4 |
| Nhân viên ngoài ca | `confirmOutOfShift` + 409 `STAFF_OUT_OF_SHIFT` | 5.4 |
| Chỉ tiêu định lượng (R-03, X-08) | BA 2.2: phản hồi p95 ≤ 1 giây (tra cứu) / ≤ 2 giây (ghi); 20 người dùng đồng thời; sẵn sàng ≥ 99% trong giờ hoạt động (gói trả phí); tác vụ nền xử lý trong 5 phút sau mốc | — |
