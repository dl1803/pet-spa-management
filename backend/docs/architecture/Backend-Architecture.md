# Backend Architecture – Hệ thống quản lý spa thú cưng

Kiến trúc backend ASP.NET Core Web API · Phiên bản 1.0 · Ngày lập: 15/10/2026

Căn cứ: *Requirements & Business Analysis v2* (viết tắt **R2**) và *System Analysis & UI Design v1.3* (viết tắt **SA**). Mã FR, BR, BP, A, C, R, D, UC, X-xx giữ nguyên theo hai tài liệu; số mục dẫn kèm tiền tố (ví dụ SA 4.2, R2 5.2).

---

## 1. Giới thiệu

### 1.1 Mục đích và phạm vi

Tài liệu mô tả kiến trúc của **một backend ASP.NET Core Web API duy nhất** phục vụ 3 web (khách hàng, nhân viên, quản lý): các tầng và thành phần, nơi áp dụng quy tắc nghiệp vụ, bảo mật, nhất quán khi đồng thời, tác vụ nền, tích hợp ngoài, triển khai và cấu hình.

Không lặp lại nội dung đã đầy đủ ở SA: từ điển dữ liệu (SA 4.2), danh sách endpoint chi tiết (SA 5.1.3), đặc tả use case (SA 2.3.4), giao diện (SA VI).

### 1.2 Quy ước

| Nhãn | Ý nghĩa |
| --- | --- |
| (Đề xuất) | Quyết định thiết kế chưa có trong R2, lấy từ SA. |
| (Đề xuất – tài liệu này) | Quyết định do tài liệu này đưa ra để giải quyết điểm R2/SA chưa chốt hoặc để hiện thực; không có trong R2 và SA; chờ nhóm duyệt. Tổng hợp ở mục 14. |
| (Bổ sung) | Nội dung nhóm yêu cầu thêm so với R2 (theo SA). |

### 1.3 Điểm SA khác R2 mà backend áp dụng theo SA

| Mã | Nội dung áp dụng cho backend | Liên quan đến R2 |
| --- | --- | --- |
| X-06, X-10, X-11 | Mốc giờ còn chỗ tính theo số nhân viên spa có ca làm, thời lượng dịch vụ và thời gian dọn dẹp; lịch spa cần 1–2 nhân viên; đề xuất nhân viên theo 3 tiêu chí. | Thay BR-13, A-07 và “1 nhân viên spa phụ trách”. |
| X-01 | Bảng WorkShift, FR-STF-04, UC-35. | Bổ sung. |
| X-09 | FR-CFG-01, UC-36: tham số lưu trong DB, có hiệu lực ngay. | Bổ sung. |
| X-02 | Số điện thoại là định danh đăng nhập và liên hệ duy nhất. | R2 chỉ nêu “thông tin liên hệ”. |
| X-12 | Clean Architecture 4 tầng. | R2 không quy định kiểu kiến trúc. |

---

## 2. Ràng buộc và yêu cầu chất lượng

### 2.1 Ràng buộc đầu vào

| Nguồn | Ràng buộc |
| --- | --- |
| A-01, C-01 | Một cửa hàng; 3 web (khách hàng, nhân viên, quản lý). |
| C-02 | ASP.NET Core Web API, Entity Framework Core, FluentValidation, Serilog, Swagger/OpenAPI; CSDL Supabase PostgreSQL; web giao tiếp backend hoàn toàn qua RESTful API, không truy cập CSDL. |
| C-04 | Không thêm chức năng ngoài nghiệp vụ và yêu cầu hệ thống. |
| SA 3.1 | Nhóm 4 người, khoảng 75 ngày: một backend triển khai thành một đơn vị, không dùng microservices. |
| X-05 | Hạ tầng 0đ (chỉ gói miễn phí), xem mục 12. |
| A-02, R2 5.2 | Token chỉ có Role = Customer, Staff, Manager; vai trò lễ tân/nhân viên spa lấy từ dữ liệu Staff. |

### 2.2 Yêu cầu chất lượng và cơ chế đáp ứng

| Nhóm (R2 4.3, Phần 5) | Cơ chế | Mục |
| --- | --- | --- |
| Bảo mật, phân quyền | JWT Bearer + ASP.NET Core Identity; chính sách vai trò ở API; kiểm tra sở hữu/phạm vi (BR-16) ở Application; mặc định từ chối. | 6 |
| Toàn vẹn dữ liệu | Máy trạng thái ở Domain; ràng buộc loại trừ, khóa tư vấn, khóa dòng ở CSDL; số tiền do backend tính và đối chiếu. | 4, 7 |
| Độ tin cậy | Tác vụ nền idempotent, dựa trên mốc thời gian lưu trong DB. | 8 |
| Hiệu năng | Phân trang và lọc ở backend; chỉ mục; truy vấn mốc giờ chỉ trên dữ liệu một ngày; backend không giữ phiên. | 10, 11 |
| Sẵn sàng | cron-job.org giữ backend thức; job xử lý bù khi khởi động lại; health check. | 8, 12 |
| Tương thích | REST/JSON chuẩn; CORS cho đúng 3 origin. | 6, 11 |

**Chỉ tiêu định lượng (Đề xuất – tài liệu này, giải quyết R-03, X-08)** – dùng làm tiêu chí kiểm thử, theo quy mô một cửa hàng (A-01). R2 và SA 2.4 chưa đặt chỉ tiêu nên các con số dưới đây là giả định khởi điểm, không có căn cứ trong hai tài liệu; thay bằng số liệu thực của cửa hàng khi có, không ảnh hưởng thiết kế:

| Chỉ tiêu | Mục tiêu đề xuất | Ghi chú |
| --- | --- | --- |
| Thời gian phản hồi (p95, tại backend) | Tra cứu, danh sách: ≤ 1 giây. Ghi (đặt lịch, đổi trạng thái, ghi nhận thanh toán): ≤ 2 giây. | Không tính request đánh thức backend sau khi ngủ (gói Free) và tải ảnh. |
| Người dùng đồng thời | 20 | Kiểm tra bằng kiểm thử tải nhỏ. |
| Độ sẵn sàng | ≥ 99% trong giờ hoạt động của cửa hàng khi chạy thật trên gói trả phí | Gói miễn phí không cam kết SLA (SA 2.4). Giờ hoạt động do cửa hàng xác nhận. |
| Độ trễ tác vụ nền | Tự hủy vắng mặt, hết hạn xác nhận chi phí: xử lý trong vòng 5 phút sau mốc | Quy tắc thời gian vẫn được kiểm tra ngay tại thao tác (mục 8). |
| Đồng thời (kiểm thử chấp nhận cho R-04) | Nhiều request cùng tranh chỗ cuối cùng (mốc giờ, chuồng, nhân viên): chỉ số lượng trong sức chứa thành công | Không vượt sức chứa, không trùng nhân viên/chuồng (mục 7). |

---

## 3. Kiểu kiến trúc và các tầng

### 3.1 Tổng quan

Backend theo **Clean Architecture** (X-12): 4 tầng đồng tâm, mã nguồn chỉ phụ thuộc hướng vào trong. Quy tắc nghiệp vụ (BR-xx) nằm ở tầng trong, không phụ thuộc ASP.NET Core, EF Core, PostgreSQL hay dịch vụ ngoài; chi tiết kỹ thuật nằm ở tầng ngoài, nối vào qua interface (port).

```
 Web khách hàng · Web nhân viên · Web quản lý        cron-job.org         VNPAY / MoMo
        (Next.js)  HTTPS · REST/JSON · JWT         X-Job-Secret          webhook (chữ ký)
              │                                          │                     │
              ▼                                          ▼                     ▼
┌──────────────────── Backend ASP.NET Core Web API (một đơn vị triển khai) ──────────────────┐
│ API             Controllers · DTO · FluentValidation · Rate limiting · CORS · JWT/Policy   │
│                 · endpoint webhook · /internal/jobs/run · Swagger · Serilog · Composition  │
│                 root                                                                       │
│ Application     Application Services (use case) · Port (interface)                         │
│ Domain          Thực thể · máy trạng thái · SlotService · PricingService                   │
│ Infrastructure  Adapter: EF Core/Npgsql · Identity + JWT · Supabase Storage ·              │
│                 cổng thanh toán · BackgroundService                                        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
              │                         │                           │
     Supabase PostgreSQL        Supabase Storage          VNPAY / MoMo (sandbox)
```

| Quyết định | Nội dung | Nguồn |
| --- | --- | --- |
| Kiểu kiến trúc | Clean Architecture, 4 tầng Domain, Application, Infrastructure, API. | X-12 (Đề xuất) |
| Triển khai | Một backend duy nhất; không microservices. | SA 3.1 |
| Giao tiếp | REST/JSON qua HTTPS, tiền tố `/api/v1`; web không truy cập CSDL. | C-02, SA 5.1.1 |
| Xác thực | JWT Bearer + ASP.NET Core Identity; refresh token băm, thu hồi được. | R2 5.2; chốt tại mục 14 (R-01) |
| Đồng thời | Khóa tư vấn theo ngày + ràng buộc loại trừ PostgreSQL + khóa dòng. | X-03 (Đề xuất); chốt tại mục 14 (R-04) |
| Tác vụ nền | BackgroundService + `POST /internal/jobs/run` do cron-job.org gọi. | SA 3.1, 3.2 (Đề xuất) |
| Lưu ảnh | Supabase Storage, bucket riêng tư. | X-04 (Đề xuất) |
| Hạ tầng | Render Free (Docker), Vercel Hobby, Supabase Free, cron-job.org. | X-05 (Đề xuất) |

### 3.2 Quy tắc phụ thuộc (Dependency Rule)

| Tầng | Được phụ thuộc | Không được phụ thuộc |
| --- | --- | --- |
| Domain | Không tầng nào | Application, Infrastructure, API; EF Core, ASP.NET Core, Identity |
| Application | Domain | Infrastructure, API |
| Infrastructure | Application, Domain | API |
| API | Application; Infrastructure chỉ tại composition root (nối port với adapter) | — |

### 3.3 Trách nhiệm từng tầng

| Tầng | Chịu trách nhiệm | Không làm |
| --- | --- | --- |
| API | Nhận request; kiểm tra cú pháp/định dạng đầu vào (FluentValidation); xác thực JWT, lấy UserId/Role từ token; áp chính sách vai trò (R2 5.1); rate limiting, CORS; gọi Application Service; ánh xạ kết quả/lỗi nghiệp vụ sang HTTP và mã lỗi (mục 11); endpoint webhook và endpoint job. | Chứa quy tắc nghiệp vụ; DTO không có trường quan trọng do hệ thống quyết định. |
| Application | Hiện thực use case; kiểm tra sở hữu/phạm vi (BR-16) cho mọi request; mở giao dịch, lấy khóa; gọi Domain; gọi port; tạo thông báo; định nghĩa port. | Biết EF Core, Identity, Supabase, cổng thanh toán, HTTP. |
| Domain | Thực thể; chuyển trạng thái đúng trình tự (BR-14); SlotService, PricingService (chỉ tính toán trên dữ liệu được truyền vào). | Truy cập dữ liệu, gọi dịch vụ ngoài, phụ thuộc framework. |
| Infrastructure | Hiện thực port (adapter): EF Core/Npgsql và migration, giao dịch và khóa, Identity + JWT, Supabase Storage, cổng thanh toán, BackgroundService. | Chứa quy tắc nghiệp vụ. |

### 3.4 Application Services

Nhóm theo SA 3.1; phân bổ use case theo BP của SA 2.2 (Đề xuất – tài liệu này). Tên lớp chốt khi cài đặt.

| Nhóm | Trách nhiệm | Use case | Quy tắc chính |
| --- | --- | --- | --- |
| Auth | Đăng ký, đăng nhập, làm mới/thu hồi token, tài khoản cá nhân, ghi nhận khách vãng lai. | UC-01 → UC-04 | BR-01, BR-16 |
| Pet / Catalog / Staff / Config | Hồ sơ thú cưng; danh mục dịch vụ; chuồng và giá lưu trú; nhân viên; tham số cấu hình. | UC-05 → UC-09, UC-26, UC-27, UC-36 | BR-11, BR-12, BR-19, BR-22, BR-25, BR-27 |
| Booking / Slot | Mốc giờ còn chỗ; đặt lịch spa/lưu trú; xem lịch hẹn và lịch sử; khóa/gỡ khóa tự đặt lịch; khách tự đổi/hủy, quản lý đổi/hủy. | UC-10, UC-11, UC-14, UC-15, UC-22, UC-28 | BR-02, BR-08, BR-13, BR-15, BR-18, BR-26 |
| Assignment / Lifecycle / Shift | Đề xuất và xác nhận nhân viên/chuồng; từ chối; tiếp nhận, đối chiếu cân nặng, xác nhận chi phí mới; thực hiện, ảnh minh chứng, hoàn tất; trả thú cưng; tình trạng chuồng; ca làm; tự hủy vắng mặt. | UC-12, UC-13, UC-16 → UC-21, UC-29 → UC-33, UC-35 | BR-04, BR-05, BR-06, BR-14, BR-20, BR-21, BR-23 |
| Pricing / Payment | Xác định số tiền; ghi nhận tại quầy; thanh toán trực tuyến và webhook; theo dõi thanh toán. | UC-23 → UC-25 | BR-07, BR-09, BR-11, BR-17, BR-22 |
| Notification | Tạo và truy vấn thông báo. | UC-34 | FR-NOT-01 → 06 |

### 3.5 Port và Adapter

| Port (Application) | Mục đích | Adapter (Infrastructure) |
| --- | --- | --- |
| Truy cập dữ liệu | Đọc/ghi thực thể Domain. | EF Core Repositories + Npgsql |
| Giao dịch và khóa đồng thời | Bắt đầu/kết thúc giao dịch; khóa theo ngày hoặc theo loài/nhóm kích cỡ; khóa dòng. | Giao dịch EF Core; `pg_advisory_xact_lock`; `SELECT … FOR UPDATE` |
| Danh tính và token | Kiểm tra mật khẩu; phát hành, xoay vòng, thu hồi token. | ASP.NET Core Identity + JWT |
| Lưu trữ ảnh | Tải lên và truy cập ảnh minh chứng. | Supabase Storage |
| Cổng thanh toán | Tạo yêu cầu thanh toán; xác minh chữ ký webhook. | Adapter VNPAY / MoMo (sandbox) |

### 3.6 Cấu trúc solution (Đề xuất – tài liệu này)

Bốn project tương ứng bốn tầng; tham chiếu giữa các project tuân theo mục 3.2.

```
Domain/          Entities/ · StateMachine/ · Services/ (SlotService, PricingService)
Application/     Services/ (theo 6 nhóm ở 3.4) · Ports/
Infrastructure/  Persistence/ (DbContext, Repositories, Migrations) · Identity/ · Storage/
                 · Payments/ (VNPAY, MoMo) · BackgroundJobs/
Api/             Controllers/ · Dtos/ · Validators/ · Middleware/ · Program.cs (composition root)
```

---

## 4. Tầng Domain

### 4.1 Thực thể có hành vi (SA 5.2)

| Lớp | Hành vi | Quy tắc |
| --- | --- | --- |
| Appointment (trừu tượng) | Confirm(), Cancel(reason), ReturnToPending(), RecordWeight(kg) | BR-14, BR-23, BR-26, BR-27 |
| SpaAppointment | AssignStaff(staffList), Receive(kg), Start(), Complete() | BR-04, BR-05, BR-06, BR-20 |
| HotelAppointment | AssignCage(cage), CheckIn(), CheckOut(time), Nights() | BR-07, BR-21, BR-22 |
| Pet | DetermineSizeGroup() | BR-19 |
| CostConfirmation | Accept(), Reject(), Expire() | BR-23 |
| Payment | MarkPaid(received) | BR-07, BR-17 |
| Customer | HasAccount() | BR-01 |

Các lớp còn lại chủ yếu mang dữ liệu: AppUser, Staff, WorkShift, Cage, Service, ServicePricing, AppointmentService, AppointmentPhoto, PaymentTransaction, Notification. Mọi chuyển trạng thái lịch hẹn đi qua phương thức của Appointment và lớp con.

### 4.2 Máy trạng thái (FR-LFC-01, FR-LFC-02, BR-14)

Quy tắc chung: chỉ chuyển đúng trình tự tiến, không bỏ bước, không chuyển ngược; **Cancelled** đến được từ mọi trạng thái trước Completed và là trạng thái kết thúc; chuyển ngược duy nhất là **Confirmed → Pending** (BR-26, BR-27). Không có trạng thái hoàn tiền (BR-24).

**Lịch spa**

| Từ | Đến | Điều kiện / tác nhân |
| --- | --- | --- |
| (đầu) | Pending | Khách hoặc lễ tân đặt lịch (FR-BOOK-03). |
| Pending | Confirmed | Quản lý xác nhận, đủ số nhân viên cần (FR-ASG-03). |
| Confirmed | Pending | Khách thay đổi (BR-26) hoặc nhân viên được phân công bị vô hiệu hóa (BR-27). |
| Confirmed | Received | Lễ tân/quản lý tiếp nhận, ghi cân nặng; không quá 15 phút sau giờ hẹn (FR-EXE-02). |
| Received | InProgress | Có ảnh trước hợp lệ (BR-20); không có yêu cầu xác nhận chi phí đang Pending (BR-23); nhân viên spa được phân công hoặc quản lý. |
| InProgress | Completed | Mọi dịch vụ `IsDone` và có ảnh sau (BR-06, BR-20). |
| Pending | Cancelled | Lý do (a), (b), (c). |
| Confirmed | Cancelled | Lý do (a), (b), (c), (d). |
| Received | Cancelled | Lý do (b), (c), (e). |
| InProgress | Cancelled | Lý do (b), (c) (chỉ quản lý). |

**Lịch lưu trú**

| Từ | Đến | Điều kiện / tác nhân |
| --- | --- | --- |
| (đầu) | Pending | Khách hoặc lễ tân đặt lưu trú (FR-HTL-04). |
| Pending | Confirmed | Quản lý gán chuồng, xác nhận (FR-HTL-05). |
| Confirmed | Pending | Khách thay đổi (BR-26). |
| Confirmed | InStay | Đã đối chiếu cân nặng, không chờ xác nhận chi phí, tiền lưu trú đã Paid (BR-07), không quá 15 phút sau giờ nhận (FR-HTL-07). |
| InStay | Completed | Lễ tân/quản lý trả thú cưng; phí phạt trả muộn (nếu có) đã Paid; giải phóng chuồng (FR-HTL-09). |
| Pending | Cancelled | Lý do (a), (b), (c). |
| Confirmed | Cancelled | Lý do (a), (b), (c), (d), (e). |
| InStay | Cancelled | Lý do (b), (c) (chỉ quản lý). |

**Lý do hủy** (cột `Appointment.CancelReason`; `Status = Cancelled` ⇔ có lý do)

| Mã | Giá trị | Ý nghĩa |
| --- | --- | --- |
| (a) | CustomerCancelled | Khách tự hủy trong hạn. |
| (b) | StoreUnable | Cửa hàng không thể đáp ứng. |
| (c) | CustomerBeyondDeadline | Khách hủy ngoài hạn, quản lý xử lý. |
| (d) | NoShow | Vắng mặt quá 15 phút. |
| (e) | CostNotConfirmed | Khách từ chối hoặc quá 30 phút không xác nhận chi phí mới. |

**Nguồn đặt lý do hủy** (Đề xuất – tài liệu này): chỉ quản lý được gửi lý do từ client; mọi lý do khác do backend đặt theo luồng.

| Lý do | Do ai / luồng nào đặt |
| --- | --- |
| CustomerCancelled | Khách hàng tự hủy trong hạn (`POST /appointments/{id}/cancel`). |
| StoreUnable | `POST /appointments/{id}/reject` (không body, luôn StoreUnable) hoặc quản lý chọn ở `/cancel`. |
| CustomerBeyondDeadline | Quản lý chọn ở `/cancel`. |
| NoShow | Tác vụ nền (mục 8). |
| CostNotConfirmed | Khách từ chối (`/cost-confirmation/respond`) hoặc tác vụ nền khi hết hạn. |

Hủy khi lịch đang InProgress hoặc InStay (SA 5.4: lý do (b), (c)): chỉ quản lý thực hiện (FR-CHG-03), với lý do StoreUnable hoặc CustomerBeyondDeadline; khách không còn quyền tự hủy vì đã quá giờ hẹn (BR-08). Hoàn tiền xử lý ngoài hệ thống (BR-24).

**Các máy trạng thái phụ**

| Đối tượng | Trạng thái | Quy tắc |
| --- | --- | --- |
| Payment | Unpaid → Paid | Chỉ đúng thời điểm theo BR-07 và khi số tiền thực nhận đủ (BR-17); Paid là kết thúc. Tại quầy: `receivedAmount` ≥ `Amount` (thấp hơn → AMOUNT_MISMATCH; phần thừa xử lý tại quầy, ngoài hệ thống). Trực tuyến: số tiền cổng xác nhận = `Amount` (Đề xuất – tài liệu này). |
| CostConfirmation | Pending → Accepted, Rejected, Expired | Tối đa một yêu cầu Pending mỗi lịch hẹn; Rejected/Expired ⇒ hủy lịch hẹn (lý do (e)). |
| Quyền tự đặt lịch (`Customer.IsBookingLocked`) | false → true → false | Khóa khi vắng mặt lần thứ 4 trong 30 ngày (BR-15); quản lý gỡ khóa (FR-BOOK-07). |

**Thời điểm ghi nhận từng khoản thanh toán (BR-07)**

| Khoản (`Payment.Kind`) | Khi nào | Phương thức |
| --- | --- | --- |
| Spa | Lịch Completed. | Quầy hoặc trực tuyến. |
| Stay (tiền lưu trú) | Lịch Confirmed, trước khi tiếp nhận và không chờ xác nhận chi phí mới (BR-23); là điều kiện để sang InStay. | Chỉ quầy. |
| LateFee (phí phạt trả muộn) | Lịch InStay, lúc trả thú cưng; là điều kiện để sang Completed (nếu có phí). | Chỉ quầy. |

### 4.3 Domain service

**SlotService** – quy tắc mốc giờ còn chỗ (SA 2.3.3, thay BR-13)

```
d         = tổng DurationMinutes của các dịch vụ đã chọn (theo loài, nhóm kích cỡ)      (BR-12)
n         = lớn nhất StaffRequired của các dịch vụ; n ≥ 2 nếu Pet.Temperament = Difficult
Khoảng giữ chỗ R = [s, s + d + Booking.BufferMinutes)
E         = số nhân viên spa đang hoạt động có ca làm bao phủ trọn R
Tải đỉnh  = tổng StaffRequired lớn nhất tại một thời điểm trong R của các lịch đang giữ chỗ
            (Pending, Confirmed, Received, InProgress; khoảng giữ chỗ của lịch khác gồm cả dọn dẹp)

Mốc s là Available khi: s ≤ LatestStartTime của mọi dịch vụ đã chọn  VÀ  E − Tải đỉnh ≥ n
Mốc s > LatestStartTime → NotAccepted;  không đủ chỗ → Full
```

- Mốc giờ hiển thị lấy từ `Booking.SlotTimes`.
- `AvailableCages()` (Đề xuất – tài liệu này, SA chưa nêu công thức): mỗi chuồng chỉ có một loài và một nhóm kích cỡ (BR-21). Lịch lưu trú được nhận khi **với mọi đêm** trong khoảng đặt: số chuồng đang hoạt động đúng loài/nhóm − số lịch lưu trú cùng loài/nhóm đang giữ chỗ (Pending, Confirmed, InStay) trùng đêm đó ≥ 1. Lịch Pending (chưa gán chuồng) vì vậy cũng chiếm sức chứa, để phần vượt bị từ chối như hết chỗ (FR-HTL-04). Đêm quy theo múi giờ cửa hàng. Khi quản lý xác nhận, chuồng cụ thể được gán và ràng buộc loại trừ ở mục 7 chặn trùng.
- `SuggestStaff()`: lọc nhân viên spa đang hoạt động theo thứ tự (1) có ca bao phủ khung giữ chỗ, (2) chưa có lịch trùng, (3) ít lịch được phân công nhất trong `Suggest.LookbackDays` (30 ngày), không tính lịch đã hủy; bằng nhau xếp theo tên; lấy đủ n người (X-11).

**PricingService** – BR-11, BR-22, FR-PAY-01

| Khoản | Công thức |
| --- | --- |
| Spa | Tổng `Price` của các dịch vụ trong lịch, theo loài và `Appointment.SizeGroup` đã đối chiếu, tính theo đơn giá hiện có. |
| Tiền lưu trú | `Nights() × (PricePerNight + FoodPerNight)` theo loài và nhóm kích cỡ; số đêm tính theo ngày nhận và ngày trả dự kiến. |
| Phí phạt trả muộn | `số lần × Hotel.LateFeePerBlock`; số lần = 0 nếu trễ ≤ 30 phút, ngược lại ⌈(phút trễ − 30) / 60⌉; thời gian trễ tính từ thời điểm trả dự kiến đến khi nhận lại thú cưng. Trả sớm: không đổi, không hoàn tiền. |

**Xác định nhóm kích cỡ** (`Pet.DetermineSizeGroup`, BR-19): theo `SizeRule` (loài, tiêu chí Weight/Height); chó lấy nhóm cao hơn giữa cân nặng và chiều cao; bỏ qua nhóm do client gửi.

**Đối chiếu cân nặng thực tế** (BR-23, FR-EXE-10): ngưỡng theo ranh giới nhóm cao nhất mà cân nặng thực tế vượt qua (`WeightTolerance`); chênh lệch bằng ngưỡng vẫn tính trong ngưỡng; chiều cao của chó giữ theo hồ sơ.

| Trường hợp | Kết quả (`weightCheck.result`) | Xử lý |
| --- | --- | --- |
| Nhẹ hơn khai báo | `OK`, hoặc `PRICE_DECREASED` nếu xuống nhóm nhỏ hơn | Ghi cân nặng mới; giảm chi phí theo nhóm mới. |
| Nặng hơn trong ngưỡng, hoặc vượt ngưỡng nhưng cùng nhóm | `OK` | Chỉ ghi cân nặng; chi phí không đổi. |
| Nặng hơn, vượt ngưỡng và sang nhóm lớn hơn | `NEEDS_CONFIRMATION` | Tính lại chi phí; tạo `CostConfirmation` Pending (hạn `CostConfirm.TimeoutMinutes` = 30 phút); trạng thái lịch hẹn giữ nguyên; cập nhật hồ sơ thú cưng sau khi khách xác nhận. |

Khi nhóm kích cỡ đổi: lịch spa giữ nguyên thời lượng, khung giờ và số nhân viên (BR-23, X-10). Lịch lưu trú kiểm tra chuồng đã gán còn phù hợp; nếu không, quản lý gán chuồng khác; hết chuồng phù hợp thì quản lý từ chối với lý do StoreUnable.

---

## 5. Phân bổ quy tắc nghiệp vụ theo tầng

| Tầng | Quy tắc | Cách thực thi |
| --- | --- | --- |
| API | Cú pháp/định dạng dữ liệu; vai trò được gọi endpoint (R2 5.1 Bảng 1); tần suất request; origin | FluentValidation; chính sách vai trò; rate limiting; CORS. |
| Application | BR-16 sở hữu/phạm vi; BR-15 khóa tự đặt lịch (không áp dụng khi lễ tân đặt thay); BR-08 hạn tự đổi/hủy và giữ chỗ; BR-02 thú cưng thuộc khách, dịch vụ áp dụng cho loài; BR-05 ai được cập nhật trạng thái; BR-07 thời điểm thanh toán; BR-09 thanh toán trực tuyến chỉ cho lịch spa; BR-25 xóa hẳn/xóa mềm hồ sơ thú cưng; BR-18 giao dịch và khóa; BR-26, BR-27 hệ quả khi về Pending; ca làm không được rút ngắn/xóa khi còn lịch Confirmed của nhân viên đó trong phần ca bị bỏ (UC-35) | Application Services; tải dữ liệu qua port, gọi Domain, mở giao dịch. |
| Domain | BR-14, BR-06, BR-20 điều kiện chuyển trạng thái; BR-13 (SlotService); BR-04, BR-21 khi đề xuất; BR-11, BR-22 (PricingService); BR-19, BR-23; BR-17 (`Payment.MarkPaid`) | Thực thể và domain service, tính trên dữ liệu được truyền vào. |
| Infrastructure / CSDL | BR-04, BR-21, ca làm không chồng; BR-18; BR-14 khi đồng thời; không xử lý lặp webhook | Ràng buộc loại trừ, UNIQUE, CHECK, khóa tư vấn, khóa dòng, cập nhật có điều kiện (mục 7). |

BR-24 (hoàn tiền) nằm ngoài hệ thống; backend không có trạng thái hoàn tiền.

**Hiệu ứng đi kèm khi chuyển trạng thái** (thực hiện trong cùng giao dịch)

| Chuyển | Hiệu ứng |
| --- | --- |
| → Pending (từ Confirmed) | Xóa các dòng `AppointmentStaff` của lịch (spa) hoặc bỏ gán `CageId` (lưu trú) để giải phóng nhân viên/chuồng (BR-26, BR-27; SA 4.1, Đề xuất). Khi khách đổi lịch, dữ liệu giữ chỗ (`SlotStart`, `SlotEnd`, `BusyUntil`, `StaffRequired`) tính lại theo nội dung mới (Đề xuất – tài liệu này). |
| → Confirmed | Spa: tạo `AppointmentStaff` (`IsHolding = true`, sao chép `SlotStart`, `BusyUntil`); lưu trú: gán `CageId`. Nếu lịch từng do khách đổi: tính lại số tiền (BR-26). |
| → Completed hoặc Cancelled | Spa: `AppointmentStaff.IsHolding = false`, giữ lại làm lịch sử công việc (FR-EXE-06); lưu trú: chuồng được giải phóng. |
| Vô hiệu hóa nhân viên spa (FR-STF-03) | `AppUser.IsActive = false`, thu hồi refresh token; mọi lịch spa Confirmed có nhân viên đó quay về Pending (xóa các dòng `AppointmentStaff` của lịch) và khách được thông báo; nếu không còn nhân viên rảnh thì quản lý từ chối lịch (UC-13). |
| Hủy do vắng mặt | Đếm số lần vắng mặt để xét khóa tự đặt lịch (mục 8). |

---

## 6. Bảo mật

### 6.1 Xác thực

| Hạng mục | Thiết kế |
| --- | --- |
| Cơ chế | JWT Bearer + ASP.NET Core Identity (qua port danh tính và token). |
| Định danh đăng nhập | `AppUser.UserName` = số điện thoại chuẩn hóa (X-02). Với khách hàng, trùng `Customer.Phone`; đổi số phải cập nhật cả hai trong một giao dịch. |
| Access token | JWT ngắn hạn; claim UserId, Role (Customer, Staff, Manager). Thời hạn đề xuất 15 phút (`Jwt__AccessTokenMinutes`; Đề xuất – tài liệu này, R-01). |
| Refresh token | Lưu băm (`RefreshToken.TokenHash`), thu hồi bằng `RevokedAt`; xoay vòng khi làm mới (Đề xuất). Thời hạn đề xuất 7 ngày (`Jwt__RefreshTokenDays`). Nếu một refresh token đã thu hồi bị gửi lại, thu hồi mọi refresh token của tài khoản đó (Đề xuất – tài liệu này). |
| Mật khẩu | Băm bằng PasswordHasher của Identity; không bao giờ trả `PasswordHash` trong response. |
| Tài khoản vô hiệu hóa | `IsActive = false`: từ chối đăng nhập và làm mới token; thu hồi các refresh token của tài khoản. Với access token đã cấp, mỗi request đã xác thực kiểm tra thêm `AppUser.IsActive` qua port danh tính và token; `false` → 401, để tài khoản mất quyền ngay (FR-STF-03) mà không chờ token hết hạn (Đề xuất – tài liệu này; một truy vấn theo khóa chính mỗi request là chấp nhận được ở quy mô một cửa hàng). |
| Tạo tài khoản | Đăng ký luôn tạo Role = Customer. Tạo nhân viên luôn tạo Role = Staff kèm `StaffRole` (Receptionist hoặc SpaStaff) do quản lý chọn. Không có chức năng tạo tài khoản quản lý qua giao diện; tài khoản quản lý đầu tiên tạo bằng bước khởi tạo chạy khi triển khai (SA 7.2), đọc `Seed__ManagerUserName`, `Seed__ManagerPassword`; idempotent: không làm gì nếu đã có tài khoản Role = Manager; sau lần chạy đầu, gỡ hai biến này khỏi môi trường (Đề xuất – tài liệu này, R-02). |
| Đăng nhập lỗi | 401, thông báo chung không nêu trường sai; ghi log (không ghi mật khẩu). |

### 6.2 Phân quyền

Backend luôn kiểm tra lại mọi request, không phụ thuộc kiểm tra ở web (kể cả menu bị ẩn). Khi xác thực hoặc kiểm tra quyền gặp lỗi, kết quả mặc định là **từ chối**.

| Lớp | Nơi thực hiện | Nội dung | Khi vi phạm |
| --- | --- | --- | --- |
| 1. Vai trò | API (Controller) | Role trong token; `StaffRole` (lễ tân/nhân viên spa) backend lấy từ dữ liệu Staff; đối chiếu ma trận R2 5.1 Bảng 1. | 403 FORBIDDEN |
| 2. Sở hữu/phạm vi (BR-16) | Application | Khách hàng: dữ liệu của mình. Nhân viên spa: lịch được phân công. Lễ tân: toàn cửa hàng, không cập nhật tiến độ thực hiện. Quản lý: toàn cửa hàng. Chi tiết theo module: R2 5.1 Bảng 2. | 403 FORBIDDEN, không trả thông tin |

Ma trận quyền chi tiết theo module dữ liệu giữ nguyên ở R2 5.1, không lặp lại ở đây.

### 6.3 Dữ liệu do backend quyết định (R2 5.2, SA 5.1.1)

Request không chứa, hoặc trường thừa bị bỏ qua: `role`, `sizeGroup`, `status`, `amount`; `staffId` và `cageId` chỉ nhận khi quản lý xác nhận lịch hẹn. Giá, thời lượng, số nhân viên cần, khung giữ chỗ, hạn xác nhận chi phí đều do backend tính từ dữ liệu và cấu hình.

### 6.4 Kiểm soát bổ sung

| Hạng mục | Thiết kế |
| --- | --- |
| HTTPS | Bắt buộc ở mọi môi trường triển khai. |
| Rate limiting | Middleware tích hợp của ASP.NET Core cho đăng ký, đăng nhập, làm mới token và đặt lịch; vượt giới hạn → 429 RATE_LIMITED. Ngưỡng đề xuất (cấu hình qua `RateLimit__*`): đăng ký, đăng nhập, làm mới token 10 request/phút theo IP; đặt lịch do khách hàng tự thực hiện 10 request/phút theo tài khoản (Đề xuất – tài liệu này). Backend chạy sau proxy của Render nên phải đọc IP client từ forwarded headers khi giới hạn theo IP. |
| CORS | Chỉ đúng 3 origin của 3 web (`Cors__AllowedOrigins`). |
| Webhook cổng thanh toán | Không dùng JWT; xác minh chữ ký/secret của cổng trước khi xử lý; sai → 401, ghi log, không cập nhật thanh toán (mục 9.1). |
| `/internal/jobs/run` | Không dùng JWT; xác minh header `X-Job-Secret` (`Jobs__Secret`); không nhận dữ liệu (mục 8). |
| Secret | Khóa ký JWT, chuỗi kết nối, secret cổng thanh toán, khóa Supabase, `Jobs__Secret` đặt ở biến môi trường/secret store, không nằm trong mã nguồn. |
| Log bảo mật | Ghi đăng nhập thất bại, request bị từ chối, webhook bị từ chối, kèm danh tính người thực hiện; không ghi mật khẩu, token, secret. |
| Lỗi hệ thống | 500 không lộ chi tiết nội bộ; chi tiết ghi log. |

---

## 7. Nhất quán khi đồng thời (X-03 – R-04, BR-18)

Cơ chế (Đề xuất; chốt tại mục 14 – R-04; kiểm chứng bằng kiểm thử đồng thời ở mục 2.2):

| Quy tắc | Cơ chế | Tầng thực hiện | Khi vi phạm |
| --- | --- | --- | --- |
| Không vượt số nhân viên khả dụng (BR-13) | Giao dịch đặt lịch lấy `pg_advisory_xact_lock` theo ngày, tính lại `E − Tải đỉnh ≥ n` rồi mới ghi. | Application điều phối giao dịch; Domain tính; Infrastructure hiện thực khóa | 409 SLOT_FULL |
| Không trùng nhân viên spa (BR-04) | Ràng buộc loại trừ `gist` trên `AppointmentStaff (StaffId, khoảng BusyFrom–BusyUntil)` cho dòng `IsHolding`; khóa dòng lịch hẹn khi xác nhận. | Infrastructure (ràng buộc, khóa dòng); Application điều phối | 409 STAFF_CONFLICT |
| Không chồng ca làm của một nhân viên | Ràng buộc loại trừ `gist` trên `WorkShift (StaffId, khoảng ca)`. | Infrastructure | 409 SHIFT_OVERLAP |
| Không trùng chuồng, không vượt sức chứa (BR-21) | Ràng buộc loại trừ `gist` trên `(CageId, khoảng đêm)` cho lịch lưu trú Confirmed, InStay; khi đặt lưu trú dùng khóa tư vấn theo loài/nhóm kích cỡ để đếm lại chuồng trống theo công thức ở mục 4.3 (tính cả lịch Pending). | Application; Domain đếm chuồng; Infrastructure | 409 CAGE_CONFLICT / NO_CAPACITY |
| Chuyển trạng thái đúng trình tự (BR-14) | Máy trạng thái ở Domain; cập nhật có điều kiện `WHERE Status = trạng thái cũ` trong giao dịch. | Domain; Infrastructure | 409 INVALID_TRANSITION |
| Không xử lý lặp webhook/tác vụ nền | `TxnRef` duy nhất; xử lý idempotent; khóa dòng `Payment`. | Application; Infrastructure | Bỏ qua bản lặp |

**Mẫu giao dịch cho thao tác ghi nhạy cảm**

1. Application kiểm tra quyền, khóa đặt lịch, tính hợp lệ nghiệp vụ trước khi mở giao dịch.
2. Mở giao dịch; lấy khóa tư vấn (đặt lịch) hoặc `SELECT … FOR UPDATE` dòng lịch hẹn/thanh toán (xác nhận, thanh toán).
3. Đọc lại điều kiện trong giao dịch (số nhân viên khả dụng, chuồng trống, `Status`), gọi Domain.
4. Ghi; nếu vi phạm ràng buộc hoặc điều kiện → rollback và trả mã lỗi 409 tương ứng; ngược lại commit.
5. Sau commit, tạo thông báo (mục 9.3).

Đổi lịch hẹn của khách (UC-14) và của quản lý (UC-15) dùng cùng đường kiểm tra khả dụng như đặt lịch (SA UC-14, UC-15).

---

## 8. Tác vụ nền

| Tác vụ | Điều kiện chọn | Xử lý |
| --- | --- | --- |
| Tự hủy vắng mặt (FR-EXE-07) | Lịch Confirmed chưa tiếp nhận, thời điểm hiện tại quá giờ hẹn `Booking.HoldMinutes` (15 phút); giờ hẹn là `SlotStart` (spa) hoặc `PlannedCheckIn` (lưu trú). | Chuyển Cancelled, lý do NoShow; lưu trú giải phóng chuồng; thông báo. |
| Khóa tự đặt lịch (FR-BOOK-06) | Sau mỗi lần hủy do vắng mặt: đếm lịch NoShow của khách trong `NoShow.WindowDays` (30 ngày) theo `CancelledAt`. | Nếu vượt `NoShow.LockThreshold` (quá 3 lần) → `IsBookingLocked = true`. |
| Hết hạn xác nhận chi phí (FR-EXE-11) | `CostConfirmation` Pending có `ExpiresAt` đã qua. | Chuyển Expired; lịch hẹn Cancelled, lý do CostNotConfirmed; thông báo. |

**Cách kích hoạt**

- `POST /internal/jobs/run` do cron-job.org gọi mỗi 5 phút, kèm `X-Job-Secret`, không JWT; trả `200 { processed }`, sai secret trả 401. Lần gọi cũng giữ backend không ngủ và tạo hoạt động DB nhẹ để Supabase không tạm dừng (cần kiểm chứng khi chạy thật).
- `BackgroundService` trong cùng backend (Infrastructure), quét mỗi 1 phút (Đề xuất – tài liệu này); cron-job.org bảo đảm quét tối thiểu mỗi 5 phút và đánh thức backend khi ngủ.
- Endpoint và BackgroundService chỉ gọi Application Services, không chứa logic xử lý.

**Bảo đảm độ tin cậy (R2 4.3)**

- Mốc thời gian đọc từ DB, không dùng bộ đếm bộ nhớ: backend khởi động lại hoặc vừa thức dậy vẫn xử lý bù các mục quá hạn.
- Idempotent: cập nhật có điều kiện `WHERE Status = trạng thái cũ`, trong giao dịch; chạy lặp hoặc chạy trên nhiều bản không xử lý trùng một lịch hẹn.
- Lịch đã được tiếp nhận kịp thì bị bỏ qua.
- Quy tắc thời gian cũng được kiểm tra ngay tại thao tác, không chờ tác vụ nền: tiếp nhận chỉ hợp lệ khi chưa quá `Booking.HoldMinutes` (UC-16, UC-31); phản hồi xác nhận chi phí sau `ExpiresAt` bị từ chối (UC-30). Độ trễ của tác vụ nền chỉ ảnh hưởng thời điểm đổi trạng thái, không cho phép thao tác quá hạn (Đề xuất – tài liệu này).

---

## 9. Tích hợp và thông báo

### 9.1 Cổng thanh toán VNPAY / MoMo (sandbox) – FR-PAY-03

1. Khách gọi `POST /payments/{id}/online { gateway }`.
2. PaymentService kiểm tra: lịch thuộc khách (BR-16), `Kind = Spa`, lịch Completed, `Payment` Unpaid. Lịch lưu trú bị từ chối (chỉ thanh toán tại quầy, BR-09).
3. Tạo `PaymentTransaction` (`TxnRef` duy nhất, `RequestedAmount = Payment.Amount` do hệ thống tính); gọi port cổng thanh toán tạo yêu cầu có chữ ký; trả `paymentUrl`.
4. Khách thanh toán ở cổng; cổng gọi webhook về backend (VNPAY: `GET /payments/ipn/vnpay`; MoMo: `POST /payments/ipn/momo`), không mang JWT.
5. Xác minh chữ ký qua port cổng thanh toán. Sai: 401, ghi log bảo mật, không cập nhật.
6. Hợp lệ: mở giao dịch, khóa `Payment`. `TxnRef` đã xử lý → bỏ qua. Số tiền cổng xác nhận khác `Amount` → rollback, giữ Unpaid, ghi log (BR-17). Khớp đủ → Paid (`Method = Online`, `PaidAt`), commit, tạo thông báo PaymentRecorded; phản hồi cổng theo đặc tả của cổng.
7. Web đọc trạng thái bằng `GET /appointments/{id}/payments`.

Xác minh chữ ký (Đề xuất – tài liệu này, R-05): mỗi cổng có một adapter riêng; adapter tính lại chữ ký bằng secret của cổng trên đúng tập tham số, theo thuật toán và thứ tự trong tài liệu tích hợp sandbox của cổng đó, rồi so với chữ ký nhận được; ngoài chữ ký còn đối chiếu `TxnRef` đã tạo, kết quả giao dịch và số tiền (BR-17). Chi tiết thuật toán chốt khi cài đặt theo tài liệu của VNPAY/MoMo. Thanh toán tiền mặt và chuyển khoản QR tại quầy là quy trình thủ công, không phải tích hợp API (BR-09).

### 9.2 Lưu trữ ảnh minh chứng – FR-EXE-09 (X-04, Đề xuất)

| Hạng mục | Thiết kế |
| --- | --- |
| Kho lưu trữ | Supabase Storage, bucket riêng tư; chỉ backend truy cập; CSDL chỉ lưu `AppointmentPhoto.StorageKey`. |
| Tải lên | `POST /appointments/{id}/photos` (multipart: `kind` = Before hoặc After); chỉ nhân viên spa được phân công; chỉ tệp ảnh; lịch ở Received (ảnh trước) hoặc InProgress (ảnh sau). |
| Xem | `GET /appointments/{id}/photos`: backend kiểm tra phạm vi (BR-16) rồi trả URL tạm thời. Khách hàng xem ảnh của lịch mình; nhân viên spa được phân công; quản lý. |
| Ảnh trước hợp lệ (BR-20) | Là ảnh gần nhất của thú cưng và tải lên trong `Photo.ValidityDays` (7 ngày) tính đến thời điểm bắt đầu thực hiện. |
| Giới hạn gói Free | 1 GB, tối đa 50 MB mỗi tệp; xử lý: nén, thu nhỏ ảnh trước khi tải lên. |

### 9.3 Thông báo (BP-10, FR-NOT-01 → 06)

Thông báo lưu ở bảng `Notification`, hiển thị trên web; không có SMS/Email. Chỉ gửi cho actor có tài khoản (khách vãng lai không nhận). Người nhận chỉ xem thông báo của mình; chỉ khách hàng và nhân viên spa có chức năng thông báo. Web làm mới định kỳ bằng TanStack Query (Đề xuất; R2 không yêu cầu thời gian thực).

| Sự kiện | `Type` | Người nhận |
| --- | --- | --- |
| Lịch hẹn tạo ở Pending (FR-NOT-01) | BookingReceived | Khách hàng |
| Xác nhận, phân công hoặc điều chỉnh (FR-NOT-02); kèm số tiền tính lại nếu khách đã đổi lịch | ConfirmedAssigned | Khách hàng; nhân viên spa được phân công |
| Chuyển trạng thái thực hiện chính, hoặc về Pending do BR-27 (FR-NOT-03) | StatusChanged | Khách hàng |
| Lịch hẹn Cancelled, kèm lý do (FR-NOT-04) | Cancelled | Khách hàng; nhân viên spa phụ trách (nếu có) |
| Thanh toán thành công (FR-NOT-05) | PaymentRecorded | Khách hàng |
| Cần xác nhận chi phí mới, kèm cân nặng thực tế và chi phí mới (FR-NOT-06) | CostConfirmation | Khách hàng |

---

## 10. Dữ liệu

Chi tiết cột, kiểu, ràng buộc: SA 4.2. Dưới đây là các điểm ảnh hưởng đến kiến trúc backend.

**Quy ước:** khóa chính `uuid`; thời gian `timestamptz` lưu UTC, hiển thị và tính “đêm” theo múi giờ cửa hàng (`App__TimeZone`, đề xuất Asia/Ho_Chi_Minh); tiền VND `numeric(12,0)`.

**21 bảng**

| Nhóm | Bảng |
| --- | --- |
| Tài khoản | AppUser, RefreshToken |
| Người | Customer (`UserId = NULL` là khách vãng lai), Staff, WorkShift |
| Danh mục | Service, ServicePricing, Cage, HotelPricing |
| Cấu hình | SizeRule, WeightTolerance, SystemConfig |
| Nghiệp vụ | Pet, Appointment, AppointmentStaff, AppointmentService, CostConfirmation, AppointmentPhoto |
| Thanh toán | Payment, PaymentTransaction |
| Thông báo | Notification |

**Ánh xạ và ràng buộc**

| Hạng mục | Thiết kế |
| --- | --- |
| Ánh xạ lịch hẹn | Lịch spa và lưu trú dùng chung bảng `Appointment`, phân biệt bằng `Type`; cột riêng của loại kia để NULL; ánh xạ sang `SpaAppointment`, `HotelAppointment` ở Domain bằng EF Core. |
| CHECK | Theo `Type` (spa: `SlotStart`, `SlotEnd`, `BusyUntil`, `StaffRequired` bắt buộc, trường lưu trú NULL; lưu trú: ngược lại); `Status = Cancelled` ⇔ `CancelReason` có giá trị; các trường liệt kê (`Status`, `Species`, `SizeGroup`, …). |
| Ràng buộc loại trừ (extension `btree_gist`) | `AppointmentStaff`, `WorkShift`, `Appointment (CageId, khoảng đêm)` – xem mục 7. |
| UNIQUE | `AppUser.UserName`, `Customer.Phone`, `RefreshToken.TokenHash`, `Cage.Code`, `PaymentTransaction.TxnRef`, `Payment (AppointmentId, Kind)`. |
| Chỉ mục | `(Status, SlotStart)`, `CustomerId`, `PetId` trên `Appointment`; `StaffId` trên `AppointmentStaff`. |
| Xóa mềm / ngừng | `Pet.IsActive` (BR-25), `Service.IsActive`, `Cage.IsActive`, `AppUser.IsActive`. |
| Giá trị chốt lúc đặt | `BusyUntil`, `StaffRequired` (lịch spa), `ExpiresAt` (xác nhận chi phí): đổi cấu hình không làm sai lịch đã tạo. |
| Giá tiền | Giá và thời lượng không lưu ở `AppointmentService` (SA 4.2.12); `Payment.Amount` do PricingService tính theo đơn giá hiện có khi đến thời điểm ghi nhận (FR-PAY-01). |
| Dữ liệu cấu hình | `SizeRule`, `WeightTolerance`, `SystemConfig` đọc từ DB; có hiệu lực ngay, không cần triển khai lại. |

---

## 11. Thiết kế API

Đặc tả đầy đủ từng endpoint (request, response, mã HTTP, FR): **SA 5.1.3**.

### 11.1 Quy ước (SA 5.1.1)

| Hạng mục | Quy ước |
| --- | --- |
| Giao thức | REST over HTTPS; JSON UTF-8; tiền tố `/api/v1`; tài liệu hóa bằng Swagger/OpenAPI. |
| Xác thực | `Authorization: Bearer <accessToken>` cho mọi endpoint trừ nhóm Ẩn danh (đăng ký, đăng nhập, làm mới token). Webhook dùng chữ ký của cổng; `/internal/jobs/run` dùng `X-Job-Secret`. |
| Thời gian, tiền | Thời gian ISO 8601 có múi giờ; tiền là số nguyên VND. |
| Danh sách | `page`, `pageSize`; trả `{ items, page, pageSize, total }`. |
| Lỗi | ProblemDetails kèm `code` nghiệp vụ: `{ status, code, title, detail }`. |

### 11.2 Nhóm endpoint

| Nhóm | Route gốc | Vai trò |
| --- | --- | --- |
| Xác thực, tài khoản | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/me` | Ẩn danh (đăng ký, đăng nhập, làm mới); còn lại đã đăng nhập |
| Khách hàng | `/customers` | Lễ tân; quản lý (khách bị khóa) |
| Thú cưng | `/pets` | Khách hàng, lễ tân, nhân viên spa (xem, lịch được phân công), quản lý (xem) |
| Danh mục dịch vụ | `/services` | Đã đăng nhập (xem); quản lý (ghi) |
| Đặt lịch, truy vấn lịch hẹn | `/spa/slots`, `/appointments/spa`, `/hotel/availability`, `/appointments/hotel`, `/appointments` | Khách hàng, lễ tân, nhân viên spa, quản lý (theo phạm vi) |
| Xác nhận, đổi, hủy | `/appointments/{id}/suggestions`, `/confirm`, `/reject`, `PUT /appointments/{id}`, `/cancel` | Quản lý; khách hàng (đổi/hủy trong hạn) |
| Thực hiện dịch vụ | `/appointments/{id}/check-in`, `/weight-check`, `/cost-confirmation/respond`, `/start`, `/services/{serviceId}`, `/complete`, `/check-out`, `/photos` | Lễ tân, nhân viên spa, quản lý, khách hàng (xác nhận chi phí, xem ảnh) |
| Thanh toán | `/appointments/{id}/payments`, `/payments`, `/payments/{id}/counter`, `/payments/{id}/online`, `/payments/ipn/vnpay`, `/payments/ipn/momo` | Theo phạm vi; webhook: chữ ký cổng |
| Chuồng, giá lưu trú | `/cages`, `/hotel/pricing` | Lễ tân, quản lý (xem chuồng); khách hàng, lễ tân, quản lý (xem giá); quản lý (ghi) |
| Ca làm, cấu hình | `/work-shifts`, `/config` | Quản lý |
| Nhân viên | `/staff` | Quản lý |
| Thông báo | `/notifications` | Khách hàng, nhân viên spa |
| Tác vụ nền | `/internal/jobs/run` | `X-Job-Secret` |

Bổ sung cho SA 5.1.3 (Đề xuất – tài liệu này):

- `POST /appointments/{id}/confirm` có thêm trường tùy chọn `confirmOutOfShift`. Nếu quản lý chọn tay nhân viên nằm ngoài ca làm mà chưa gửi `confirmOutOfShift = true`, backend trả 409 `STAFF_OUT_OF_SHIFT` kèm danh sách nhân viên; xác nhận lại với `true` thì lưu (UC-12).
- `POST /appointments/{id}/cancel`: khách hàng không gửi `reason` (backend đặt CustomerCancelled); quản lý gửi `reason` là StoreUnable hoặc CustomerBeyondDeadline (mục 4.2).

FR không có endpoint riêng vì do hệ thống tự thực hiện: FR-BOOK-06, FR-EXE-07 (tác vụ nền); FR-PAY-01 (tính tiền trong các endpoint thanh toán); FR-LFC-01, FR-LFC-02 (máy trạng thái); FR-ASG-01 và FR-PET-04 nằm trong `/suggestions` và `/pets`.

### 11.3 Mã lỗi (SA 5.1.2)

| HTTP | Mã lỗi (`code`) |
| --- | --- |
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHENTICATED (thiếu/sai/hết hạn token; đăng nhập sai; tài khoản vô hiệu hóa; webhook sai chữ ký) |
| 403 | FORBIDDEN (sai vai trò hoặc ngoài phạm vi sở hữu); BOOKING_LOCKED |
| 404 | NOT_FOUND |
| 409 | DUPLICATE_CONTACT; SLOT_FULL; NO_CAPACITY; STAFF_CONFLICT; CAGE_CONFLICT; INVALID_TRANSITION; CHANGE_WINDOW_CLOSED; PHOTO_REQUIRED; SERVICES_INCOMPLETE; STAFF_COUNT_MISMATCH; SHIFT_OVERLAP; SHIFT_HAS_APPOINTMENTS; COST_CONFIRMATION_PENDING; PAYMENT_NOT_DUE; AMOUNT_MISMATCH; STAFF_OUT_OF_SHIFT (Đề xuất – tài liệu này); CUSTOMER_NOT_LOCKED; DUPLICATE_CAGE_CODE; COST_CONFIRMATION_EXPIRED (3 mã này Đề xuất theo API-Notes mục 8 #6) |
| 429 | RATE_LIMITED |
| 500 | Lỗi hệ thống, không lộ chi tiết nội bộ |

Lỗi nghiệp vụ mang `code` từ Application/Domain; tầng API ánh xạ sang HTTP status.

---

## 12. Triển khai và cấu hình

### 12.1 Triển khai 0đ (X-05, Đề xuất)

Giữ ràng buộc C-04: web → backend → CSDL. Thông số gói miễn phí đối chiếu tháng 10/2026 (SA 3.2), cần kiểm tra lại khi triển khai.

| Nút | Nền tảng | Giới hạn gói miễn phí và cách xử lý |
| --- | --- | --- |
| 3 web | Vercel Hobby | Chỉ phi thương mại. |
| Backend | Render Web Service Free, Docker ASP.NET Core; 3 origin web đưa vào CORS | Ngủ sau 15 phút không có request, thức lại mất khoảng một phút; có thể khởi động lại bất cứ lúc nào; cấu hình thấp. Xử lý: cron-job.org gọi mỗi 5 phút; job xử lý bù. |
| CSDL | Supabase Free PostgreSQL (500 MB), nối bằng Npgsql qua SSL | Tự tạm dừng sau 1 tuần không hoạt động. Xử lý: lời gọi cron-job.org kèm truy vấn DB nhẹ (cần kiểm chứng). |
| Ảnh | Supabase Storage Free (1 GB) | Tối đa 50 MB mỗi tệp. |
| Kích hoạt job | cron-job.org | Tối đa 1 lần/phút mỗi job, timeout 30 giây mỗi request, không cam kết SLA. |
| Cổng thanh toán | VNPAY / MoMo sandbox | Webhook cần URL HTTPS công khai của backend (có sẵn trên Render). |

Gói miễn phí không cam kết thời gian hoạt động. Khi chạy thật cho cửa hàng nên nâng gói backend để hết ngủ (không cần đổi mã).

### 12.2 Tham số nghiệp vụ trong DB (bảng `SystemConfig`, FR-CFG-01)

Quản lý chỉnh qua `GET/PUT /config` (riêng `Hotel.LateFeePerBlock` chỉnh cùng giá lưu trú ở `PUT /hotel/pricing`); backend kiểm tra khoảng hợp lệ (ngoài khoảng → 400); có hiệu lực ngay cho thao tác sau đó; lịch hẹn đã tạo giữ giá trị đã chốt.

| Khóa | Mặc định | Khoảng cho phép | Nguồn |
| --- | --- | --- | --- |
| `Booking.ChangeCancelDeadlineMinutes` | 60 phút | 60 – 120 | BR-08, A-03 |
| `Booking.HoldMinutes` | 15 phút | Số nguyên dương | BR-08, A-04 |
| `Booking.BufferMinutes` | 15 phút | 15 – 20 | SA 2.3.3 |
| `Booking.SlotTimes` | 09:00, 10:00, …, 19:00 | Danh sách HH:mm tăng dần | SA 2.3.3 |
| `Suggest.LookbackDays` | 30 ngày | Số nguyên dương | SA 2.3.3 |
| `NoShow.LockThreshold` / `NoShow.WindowDays` | Quá 3 lần / 30 ngày | Số nguyên dương | BR-15, A-05 |
| `CostConfirm.TimeoutMinutes` | 30 phút | Số nguyên dương | BR-23 |
| `Hotel.LateGraceMinutes` / `Hotel.LateBlockMinutes` | 30 phút / 60 phút | Số nguyên dương | BR-22 |
| `Photo.ValidityDays` | 7 ngày | Số nguyên dương | BR-20 |
| `Hotel.LateFeePerBlock` | Do quản lý thiết lập | ≥ 0 | BR-22, FR-HTL-03 |

Bảng mốc kích cỡ (`SizeRule`, BR-19) và ngưỡng dung sai (`WeightTolerance`, BR-23) khởi tạo từ R2 mục 3.4; ngưỡng kích cỡ phải tăng dần, dung sai ≥ 0. Dịch vụ, giá, chuồng, giá lưu trú do các endpoint riêng quản lý (`/services`, `/cages`, `/hotel/pricing`).

### 12.3 Biến môi trường / secret (không chỉnh trên giao diện)

| Nhóm | Biến |
| --- | --- |
| CSDL | `ConnectionStrings__Default` |
| JWT | `Jwt__SigningKey`, `Jwt__AccessTokenMinutes` (đề xuất 15), `Jwt__RefreshTokenDays` (đề xuất 7) |
| Web | `Cors__AllowedOrigins` (đúng 3 origin) |
| Rate limiting | `RateLimit__*` (giá trị đề xuất ở mục 6.4) |
| Cổng thanh toán | `Payment__Vnpay__*`, `Payment__Momo__*` (mã đối tác, khóa/secret, URL trả về, URL webhook) |
| Lưu ảnh | `Storage__Url`, `Storage__ServiceKey`, `Storage__Bucket` |
| Tác vụ nền | `Jobs__Secret` |
| Hệ thống | `Serilog__MinimumLevel`, `App__TimeZone`, `Seed__ManagerUserName`, `Seed__ManagerPassword` |

---

## 13. Ghi log và tài liệu hóa

| Hạng mục | Thiết kế |
| --- | --- |
| Log | Serilog; mức log theo `Serilog__MinimumLevel`; không ghi mật khẩu, token, secret; ghi sự kiện bảo mật (mục 6.4). |
| Health check | Có điểm kiểm tra sức khỏe cho giám sát (SA 2.4); đường dẫn đề xuất `GET /health`, không JWT, không trả dữ liệu nghiệp vụ (Đề xuất – tài liệu này). |
| API | Swagger/OpenAPI; kiểm thử API bằng Postman (C-03). |

---

## 14. Quyết định đề xuất cho các điểm R2/SA chưa chốt

Các quyết định dưới đây là đề xuất của tài liệu này (D-01), chờ nhóm duyệt. Nội dung chi tiết nằm ở mục được dẫn. Các con số (thời hạn token, ngưỡng rate limit, chu kỳ quét, chỉ tiêu mục 2.2) là giá trị khởi điểm do tài liệu này giả định, R2 và SA không có căn cứ; thay bằng giá trị chốt của nhóm hoặc cửa hàng.

| # | Điểm chưa chốt | Đề xuất | Lý do | Mục |
| --- | --- | --- | --- | --- |
| 1 | R-01: chiến lược xác thực, thời hạn token | Giữ JWT + Identity; access token 15 phút; refresh token 7 ngày, xoay vòng, phát hiện dùng lại. | Access token ngắn giảm thiệt hại khi lộ token; refresh token thu hồi được nên có thể dài hơn. | 6.1 |
| 2 | R-02: tài khoản quản lý đầu tiên | Bước khởi tạo idempotent khi triển khai đọc `Seed__*`; không có chức năng trên giao diện. | Không mở đường tạo tài khoản quản lý qua giao diện (R2 5.2). | 6.1 |
| 3 | R-03: chỉ tiêu định lượng | Bảng chỉ tiêu ở mục 2.2. | Làm tiêu chí kiểm thử; phù hợp một cửa hàng và gói miễn phí. | 2.2 |
| 4 | R-04: cơ chế đồng thời | Giữ cơ chế X-03; bổ sung công thức đếm chuồng (cả lịch Pending); kiểm thử chấp nhận ở mục 2.2. | Ràng buộc CSDL chặn trùng ngay cả khi logic ứng dụng sai. | 4.3, 7 |
| 5 | R-05: xác minh chữ ký webhook | Adapter riêng cho từng cổng, theo tài liệu sandbox; đối chiếu thêm `TxnRef`, kết quả, số tiền. | Chữ ký hợp lệ chưa đủ để ghi nhận Paid (R2 6.1). | 9.1 |
| 6 | Ngưỡng rate limit; chu kỳ BackgroundService; đường dẫn health check | 10 request/phút (IP cho nhóm ẩn danh, tài khoản cho đặt lịch của khách); quét mỗi 1 phút; `GET /health`. | Đủ chặn spam mà không cản người dùng thật; cron 5 phút làm lưới bảo đảm. | 6.4, 8, 13 |
| 7 | Hiệu lực tức thời của vô hiệu hóa tài khoản | Kiểm tra `IsActive` mỗi request đã xác thực. | FR-STF-03 yêu cầu mất quyền ngay; không phụ thuộc thời hạn token. | 6.1 |
| 8 | Số tiền nhận: “khớp đủ” hay “≥” | Quầy: nhận ≥ phải trả; trực tuyến: bằng đúng. | R2 FR-PAY-02 và SA UC-23 chỉ từ chối khi thấp hơn; tiền mặt có thể thừa; cổng luôn thu đúng số yêu cầu. | 4.2 |
| 9 | Cảnh báo nhân viên ngoài ca | `confirmOutOfShift` + mã 409 `STAFF_OUT_OF_SHIFT`. | UC-12 cần xác nhận lại mà API chưa có chỗ thể hiện. | 11.2 |
| 10 | Chỗ giữ cho lịch lưu trú Pending | Pending tính vào sức chứa theo loài/nhóm kích cỡ. | Phù hợp FR-HTL-04: phần vượt sức chứa bị từ chối khi đặt. | 4.3 |
| 11 | Lý do hủy khi InProgress/InStay | Chỉ quản lý hủy, lý do StoreUnable hoặc CustomerBeyondDeadline. | Khách đã quá hạn tự hủy (BR-08); FR-CHG-03 giao quản lý. | 4.2 |

**Cần nhóm xử lý ở tài liệu khác (không thuộc backend)**

| Nội dung | Tài liệu |
| --- | --- |
| Cập nhật các mục không còn đúng sau X-06: thuật ngữ “Khung giờ”, “Năng lực phục vụ”, “Lịch hẹn”; BP-04; BR-13; FR-BOOK-02; A-07. | R2 |
| Thêm `confirmOutOfShift` và `STAFF_OUT_OF_SHIFT` vào API. | SA 5.1.2, 5.1.3 |
| R2 và SA không có chức năng đổi hoặc đặt lại mật khẩu; tài liệu này không bổ sung (C-04). | R2 / SA |
| FR-SVC-02 (đổi giá áp dụng cho lượt đặt tiếp theo) cần ghi rõ cùng với FR-PAY-01 và SA 4.2.12 (tính theo đơn giá hiện có lúc ghi nhận, không lưu giá lúc đặt): backend theo SA 4.2.12, nên thay đổi giá có hiệu lực ngay cả với lịch chưa thanh toán; muốn giữ giá lúc đặt phải thêm cột giá vào lược đồ, nằm ngoài phạm vi tài liệu này. | R2 / SA |
