# API Notes – Hệ thống quản lý spa thú cưng

Đi kèm `openapi.yaml` (OpenAPI 3.0.3). Danh sách endpoint, request, response, mã HTTP: xem `openapi.yaml`; tài liệu này chỉ ghi quy ước, quy tắc nghiệp vụ gắn với API và điểm còn mở.

**Nguồn:** *System Analysis & UI Design v1.3* (**SA**, mục 5.1, 4.2, 7.2), *Backend Conventions* (**BC**), *Authorization* (**Auth**), *Requirements & Business Analysis v2* (**Req**), *DatabaseDesign* (**DB**), *Usecase*. Mã FR, BR, UC, R, X giữ nguyên theo nguồn.

**Nhãn:** **(Đề xuất)** nội dung nguồn ghi là đề xuất, chờ nhóm duyệt · **(Suy ra)** tài liệu này suy ra từ nguồn, nguồn không ghi trực tiếp.

---

## 1. Quy ước chung (SA 5.1.1)

| Hạng mục | Quy ước |
| --- | --- |
| Giao thức | REST over HTTPS; JSON UTF-8; tiền tố `/api/v1`. |
| Xác thực | `Authorization: Bearer <accessToken>`. Ngoại lệ: nhóm Ẩn danh (`/auth/register`, `/auth/login`, `/auth/refresh`); webhook `/payments/ipn/*` (chữ ký cổng); `POST /internal/jobs/run` (header `X-Job-Secret`); `GET /health` (Đề xuất, BC 5.4). |
| Thời gian, tiền | Thời gian ISO 8601 có múi giờ; tiền là số nguyên VND. |
| Danh sách | `page`, `pageSize`; trả `{ items, page, pageSize, total }`. |
| Lỗi | ProblemDetails `{ status, code, title, detail }` (mục 7). |
| Đặt tên | Trường JSON camelCase; route chữ thường nối gạch ngang; giá trị enum PascalCase (BC 12.1, Đề xuất). |
| Giới hạn tần suất | Đăng ký, đăng nhập, làm mới token: 10 request/phút mỗi IP. Đặt lịch của KH: 10 request/phút mỗi tài khoản. Vượt → 429 `RATE_LIMITED` (Đề xuất, Auth 3.5). |

## 2. Vai trò và token

| Viết tắt | Role trong token | StaffRole | Web |
| --- | --- | --- | --- |
| KH | Customer | — | Web khách hàng |
| LT | Staff | Receptionist | Web nhân viên |
| NVS | Staff | SpaStaff | Web nhân viên |
| QL | Manager | — | Web quản lý |

- Token chứa `UserId`, `Role`; `StaffRole` lấy từ dữ liệu Staff. Danh tính và vai trò không nhận từ client.
- Hai lớp kiểm tra mỗi request: (1) vai trò ở Controller theo ma trận Req 5.1 → 403 `FORBIDDEN`; (2) sở hữu/phạm vi (BR-16) ở Application → 403 `FORBIDDEN`, không trả thông tin. Lỗi xác thực hoặc phân quyền: mặc định từ chối.
- Trong `openapi.yaml`, `x-roles` là vai trò được gọi, `x-fr` là FR tương ứng, `x-proposal` là nội dung đề xuất.

## 3. Dữ liệu do backend quyết định

- Request không chứa, hoặc bỏ qua nếu thừa: `role`, `sizeGroup`, `status`, `amount`.
- `staffIds`, `cageId` chỉ nhận ở `POST /appointments/{id}/confirm` (QL).
- Backend tự tính: giá, thời lượng, số nhân viên cần, khung giữ chỗ (`SlotEnd`, `BusyUntil`), hạn xác nhận chi phí (`ExpiresAt`), `Payment.Amount`.
- Lý do hủy: client chỉ gửi được `StoreUnable` hoặc `CustomerBeyondDeadline` (QL, ở `/cancel`); lý do khác do backend đặt (BC 4.2, Đề xuất).

| Lý do hủy | Ai đặt |
| --- | --- |
| `CustomerCancelled` | Backend, khi KH tự hủy trong hạn (KH không gửi `reason`). |
| `StoreUnable` | `/reject` (luôn) hoặc `/cancel` (QL chọn). |
| `CustomerBeyondDeadline` | QL chọn ở `/cancel`. |
| `NoShow` | Tác vụ nền. |
| `CostNotConfirmed` | KH từ chối ở `/cost-confirmation/respond`, hoặc tác vụ nền khi hết hạn. |

## 4. Quy tắc theo luồng

**Xác thực**
- Đăng nhập sai (không tồn tại, sai mật khẩu, `IsActive = false`): 401, thông báo chung.
- Access token 15 phút, refresh token 7 ngày, xoay vòng khi làm mới; refresh token đã thu hồi bị gửi lại → thu hồi mọi refresh token của tài khoản (Đề xuất, R-01).
- Tài khoản `IsActive = false` bị từ chối ở mọi request đã xác thực (401) (BC 6.1, Đề xuất).
- Đăng ký luôn tạo Role = Customer; `userName` là số điện thoại, bằng `Customer.Phone`.

**Đặt lịch spa** (`GET /spa/slots` → `POST /appointments/spa`)
- Thời lượng `d` = tổng thời lượng dịch vụ theo loài và nhóm kích cỡ; số nhân viên cần `n` = lớn nhất `staffRequired` của các dịch vụ, tối thiểu 2 nếu thú cưng `Difficult`.
- Khoảng giữ chỗ `[s, s + d + Booking.BufferMinutes)`. Mốc `s` còn chỗ khi (1) `s` không muộn hơn mốc bắt đầu muộn nhất của mọi dịch vụ đã chọn, (2) `E − Tải đỉnh ≥ n` (SA 2.3.3). Trạng thái mốc: `Available`, `Full`, `NotAccepted`.
- KH tự đặt khi bị khóa → 403 `BOOKING_LOCKED`. LT đặt thay (kèm `customerId`) không áp dụng khóa (BR-15).
- Giữ chỗ trong một giao dịch có khóa theo ngày; hết chỗ → 409 `SLOT_FULL`. `SlotEnd`, `BusyUntil`, `StaffRequired` chốt lúc đặt.

**Đặt lịch lưu trú** (`GET /hotel/availability` → `POST /appointments/hotel`)
- Hết chuồng phù hợp → 409 `NO_CAPACITY`. Ngày trả phải sau ngày nhận (400).
- Tiền tạm tính = số đêm × (`pricePerNight` + `foodPerNight`) theo loài và nhóm kích cỡ.

**Xác nhận và phân công** (`GET /appointments/{id}/suggestions` → `POST /appointments/{id}/confirm`)
- Chỉ lịch `Pending`. Spa: `staffIds` đủ số nhân viên cần; lưu trú: `cageId`.
- Đề xuất nhân viên: đang hoạt động → có ca phủ khoảng giữ chỗ → chưa có lịch trùng → ít lịch nhất trong `Suggest.LookbackDays` ngày (không tính lịch đã hủy; bằng nhau xếp theo tên) → lấy đủ `n` người (DB 7.2).
- Đề xuất chuồng: đang sử dụng, cùng loài và nhóm kích cỡ, không trùng đêm.
- Chọn tay nhân viên ngoài ca mà chưa gửi `confirmOutOfShift = true` → 409 `STAFF_OUT_OF_SHIFT` (Đề xuất, BC 5.4).
- Lịch từng do KH đổi: tính lại số tiền khi xác nhận (BR-26). Không còn nhân viên/chuồng phù hợp → `/reject`.

**Đổi và hủy**
- KH chỉ được đổi/hủy trước giờ hẹn (`SlotStart` hoặc `PlannedCheckIn`) tối thiểu `Booking.ChangeCancelDeadlineMinutes`; quá hạn → 409 `CHANGE_WINDOW_CLOSED` (hướng dẫn liên hệ hotline).
- KH đổi lịch → `Confirmed` về `Pending`: spa xóa phân công nhân viên, lưu trú bỏ `CageId`; tính lại `SlotStart`, `SlotEnd`, `BusyUntil`, `StaffRequired` theo nội dung mới (BR-26; Đề xuất, BC 4.3).
- QL đổi lịch vẫn kiểm tra BR-13, BR-04, BR-21; QL được gửi thêm `staffIds` (spa) hoặc `cageId` (lưu trú), `confirmOutOfShift` để đổi nhân viên/chuồng (UC-15, Đề xuất #3 mục 8).
- QL hủy bằng `/cancel` với `reason` là `StoreUnable` hoặc `CustomerBeyondDeadline` ở mọi trạng thái trước `Completed`; hủy khi `InProgress` hoặc `InStay` chỉ QL (Đề xuất; SA 5.4 lý do (b), (c)). KH không gửi `reason`.
- Hoàn tiền xử lý ngoài hệ thống, không có trạng thái hoàn tiền (BR-24).

**Tiếp nhận, cân nặng, xác nhận chi phí mới**
- Spa: `POST /check-in { actualWeightKg }`, chỉ khi chưa quá `Booking.HoldMinutes` sau giờ hẹn; → `Received` kèm `weightCheck`.
- Lưu trú: `POST /weight-check` → thu tiền lưu trú (`Stay`) → `POST /check-in` (không body).
- `weightCheck.result` (BR-23): `NEEDS_CONFIRMATION` khi nặng hơn, vượt dung sai và sang nhóm lớn hơn; `PRICE_DECREASED` khi nhẹ hơn và xuống nhóm nhỏ hơn (Suy ra); còn lại `OK`.
- `NEEDS_CONFIRMATION`: tạo `CostConfirmation` Pending, hạn `CostConfirm.TimeoutMinutes`; lịch giữ nguyên trạng thái; chặn `/start` (spa) và `/check-in` (lưu trú) bằng 409 `COST_CONFIRMATION_PENDING`; với lịch lưu trú chặn thêm việc ghi nhận khoản `Stay` ở `POST /payments/{id}/counter` bằng 409 `COST_CONFIRMATION_PENDING` (FR-EXE-10, BR-23).
- `POST /cost-confirmation/respond { accept }`: `true` → cập nhật hồ sơ thú cưng, lịch tiếp tục; `false` hoặc quá hạn → `Cancelled`, lý do `CostNotConfirmed`. Phản hồi sau `ExpiresAt` → 409 `COST_CONFIRMATION_EXPIRED`; không có yêu cầu Pending → 404.
- Khi nhóm kích cỡ đổi: lịch spa giữ nguyên thời lượng, khung giờ, số nhân viên; lịch lưu trú kiểm tra chuồng đã gán còn phù hợp.

**Thực hiện spa**
- `/start`: cần ảnh `Before` hợp lệ (ảnh gần nhất của thú cưng, tải lên trong `Photo.ValidityDays` ngày) và không chờ xác nhận chi phí → 409 `PHOTO_REQUIRED` / `COST_CONFIRMATION_PENDING`.
- `PATCH /services/{serviceId}` đánh dấu từng dịch vụ xong. `/complete`: mọi dịch vụ xong và có ảnh `After` → 409 `SERVICES_INCOMPLETE` / `PHOTO_REQUIRED`; tạo khoản `Spa`.
- Ảnh: `multipart` (`kind`, `file`), chỉ NVS được phân công; `Before` khi `Received`, `After` khi `InProgress`; chỉ tệp ảnh, tối đa 50 MB. Xem ảnh trả URL tạm thời sau khi kiểm tra phạm vi.

**Trả thú cưng lưu trú** (`POST /check-out`)
- Ghi `ActualCheckOut`; phí phạt = ⌈(phút trễ − `Hotel.LateGraceMinutes`) / `Hotel.LateBlockMinutes`⌉ × `Hotel.LateFeePerBlock`; trễ ≤ 30 phút không tính. Có phí chưa thanh toán → 409 `PAYMENT_NOT_DUE`.

**Thanh toán**

| Khoản | Thời điểm ghi nhận (BR-07) | Hình thức |
| --- | --- | --- |
| `Spa` | Lịch `Completed` | Quầy hoặc trực tuyến |
| `Stay` | Lịch lưu trú `Confirmed`, trước tiếp nhận; điều kiện sang `InStay` | Chỉ quầy |
| `LateFee` | Lịch lưu trú `InStay`, lúc trả; điều kiện sang `Completed` nếu có phí | Chỉ quầy |

- Quầy (`/payments/{id}/counter`): `method` là `Cash` hoặc `BankQR`; `receivedAmount` ≥ `amount` (thấp hơn → 409 `AMOUNT_MISMATCH`); sai thời điểm → 409 `PAYMENT_NOT_DUE`.
- Trực tuyến (`/payments/{id}/online { gateway }`): chỉ lịch spa `Completed`, khoản `Unpaid`, thuộc KH (BR-09); trả `paymentUrl`, `txnRef`. Lịch lưu trú bị từ chối.
- Webhook (VNPAY `GET`, MoMo `POST`, không JWT): xác minh chữ ký (sai → 401, ghi log, không cập nhật) → khóa `Payment` → `TxnRef` đã xử lý thì bỏ qua → số tiền cổng xác nhận phải bằng `amount` (khác → giữ `Unpaid`, ghi log) → `Paid`, `Method = Online`. Web đọc kết quả bằng `GET /appointments/{id}/payments`.
- Trực tuyến: số tiền cổng xác nhận bằng đúng `amount` (Đề xuất, BC 4.4).

**Tác vụ nền** (`POST /internal/jobs/run`, cron-job.org mỗi 5 phút; `BackgroundService` quét mỗi 1 phút – Đề xuất)

| Tác vụ | Điều kiện | Kết quả |
| --- | --- | --- |
| Hủy vắng mặt (FR-EXE-07) | Lịch `Confirmed` chưa tiếp nhận, quá `Booking.HoldMinutes` sau giờ hẹn | `Cancelled`, `NoShow`; lưu trú giải phóng chuồng |
| Khóa tự đặt lịch (FR-BOOK-06) | Số lịch `NoShow` của KH trong `NoShow.WindowDays` vượt `NoShow.LockThreshold` | `IsBookingLocked = true` |
| Hết hạn xác nhận chi phí (FR-EXE-11) | `CostConfirmation` Pending quá `ExpiresAt` | `Expired`; lịch `Cancelled`, `CostNotConfirmed` |

Idempotent (cập nhật có điều kiện theo `Status`); trả `200 { processed }`, sai secret → 401.

**Thông báo** (chỉ KH và NVS; tạo sau commit; khách vãng lai không nhận)

| `type` | Sự kiện | Người nhận |
| --- | --- | --- |
| `BookingReceived` | Lịch tạo ở `Pending` | KH |
| `ConfirmedAssigned` | Xác nhận, phân công, điều chỉnh | KH; NVS được phân công |
| `StatusChanged` | Chuyển trạng thái thực hiện chính, hoặc về `Pending` (BR-27) | KH |
| `Cancelled` | Lịch bị hủy, kèm lý do | KH; NVS phụ trách |
| `PaymentRecorded` | Thanh toán thành công | KH |
| `CostConfirmation` | Cần xác nhận chi phí mới | KH |

**Nhân viên, ca làm, cấu hình**
- `GET /services`: KH, LT, NVS chỉ thấy dịch vụ đang cung cấp; QL thấy cả dịch vụ đã ngừng (`isActive`) để mở lại bằng `PATCH /services/{id}/status` (Đề xuất).
- `POST /staff` luôn tạo Role = Staff kèm `staffRole`; không có API tạo tài khoản QL (QL đầu tiên tạo bằng bước khởi tạo khi triển khai, R-02).
- `POST /staff/{id}/deactivate`: `IsActive = false`, thu hồi refresh token; lịch spa `Confirmed` của nhân viên đó về `Pending`, trả `{ returnedToPending }`.
- Ca làm: `shiftEnd` sau `shiftStart`; chồng ca → 409 `SHIFT_OVERLAP`; sửa/xóa khi còn lịch `Confirmed` trong phần ca bị bỏ → 409 `SHIFT_HAS_APPOINTMENTS` (lịch `Pending` không chặn).
- Cấu hình: giá trị ngoài khoảng cho phép → 400; có hiệu lực ngay, lịch đã tạo giữ giá trị đã chốt. `Hotel.LateFeePerBlock` chỉnh ở `PUT /hotel/pricing`.

| Khóa cấu hình | Mặc định | Khoảng cho phép |
| --- | --- | --- |
| `Booking.ChangeCancelDeadlineMinutes` | 60 | 60 – 120 |
| `Booking.HoldMinutes` | 15 | số nguyên dương |
| `Booking.BufferMinutes` | 15 | 15 – 20 |
| `Booking.SlotTimes` | 09:00 … 19:00 mỗi giờ | danh sách `HH:mm` tăng dần |
| `Suggest.LookbackDays` | 30 | số nguyên dương |
| `NoShow.LockThreshold` / `NoShow.WindowDays` | 3 (khóa khi quá 3 lần) / 30 | số nguyên dương |
| `CostConfirm.TimeoutMinutes` | 30 | số nguyên dương |
| `Hotel.LateGraceMinutes` / `Hotel.LateBlockMinutes` | 30 / 60 | số nguyên dương |
| `Photo.ValidityDays` | 7 | số nguyên dương |

## 5. Chuyển trạng thái lịch hẹn theo endpoint (BR-14)

Chỉ chuyển đúng trình tự tiến; `Cancelled` từ mọi trạng thái trước `Completed` và là trạng thái kết thúc; chuyển ngược duy nhất `Confirmed → Pending`. Sai trình tự → 409 `INVALID_TRANSITION`.

| Endpoint | Chuyển | Ai | Điều kiện chính |
| --- | --- | --- | --- |
| `POST /appointments/spa`, `/hotel` | ∅ → Pending | KH, LT | KH: không bị khóa; còn chỗ |
| `POST /{id}/confirm` | Pending → Confirmed | QL | Đủ nhân viên / có chuồng, không trùng |
| `POST /{id}/reject` | Pending → Cancelled (`StoreUnable`) | QL | — |
| `PUT /{id}` (KH) | Confirmed → Pending | KH | Trong hạn tự phục vụ |
| `POST /{id}/check-in` (spa) | Confirmed → Received | LT, QL | Chưa quá `Booking.HoldMinutes` |
| `POST /{id}/start` | Received → InProgress | NVS được phân công, QL | Ảnh `Before` hợp lệ; không chờ xác nhận chi phí |
| `POST /{id}/complete` | InProgress → Completed | NVS được phân công, QL | Mọi dịch vụ xong; có ảnh `After` |
| `POST /{id}/check-in` (lưu trú) | Confirmed → InStay | LT, QL | Đã đối chiếu cân nặng; `Stay` đã `Paid` |
| `POST /{id}/check-out` | InStay → Completed | LT, QL | `LateFee` (nếu có) đã `Paid` |
| `POST /{id}/cancel` | trước Completed → Cancelled | KH (trong hạn), QL | KH: `CustomerCancelled` |
| `POST /staff/{id}/deactivate` | Confirmed → Pending | Hệ thống | Lịch spa của nhân viên bị vô hiệu hóa |
| `POST /internal/jobs/run` | Confirmed → Cancelled; xác nhận chi phí hết hạn → Cancelled | Hệ thống | `NoShow`; `CostNotConfirmed` |

## 6. Hiệu ứng khi chuyển trạng thái (cùng giao dịch)

| Chuyển | Hiệu ứng |
| --- | --- |
| → Confirmed | Spa: tạo `AppointmentStaff` (`IsHolding = true`). Lưu trú: gán `CageId`. |
| → Pending (từ Confirmed) | Spa: xóa `AppointmentStaff`. Lưu trú: bỏ `CageId`. |
| → Completed hoặc Cancelled | Spa: `IsHolding = false`, giữ làm lịch sử công việc. Lưu trú: giải phóng chuồng. |

## 7. Mã lỗi (SA 5.1.2)

| HTTP | `code` | Dùng ở |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Thiếu trường bắt buộc, loài ngoài 4 loài, ngày trả không sau ngày nhận, số tiền không hợp lệ, cấu hình ngoài khoảng |
| 401 | `UNAUTHENTICATED` | Thiếu/sai/hết hạn token; đăng nhập sai; tài khoản vô hiệu hóa; webhook sai chữ ký; `X-Job-Secret` sai |
| 403 | `FORBIDDEN` | Sai vai trò hoặc ngoài phạm vi sở hữu (BR-16) |
| 403 | `BOOKING_LOCKED` | `POST /appointments/spa`, `/hotel` (KH tự đặt khi bị khóa) |
| 404 | `NOT_FOUND` | Endpoint có `{id}` |
| 409 | `CUSTOMER_NOT_LOCKED` (Đề xuất) | `/customers/{id}/unlock-booking` |
| 409 | `DUPLICATE_CAGE_CODE` (Đề xuất) | `POST /cages`, `PUT /cages/{id}` |
| 409 | `COST_CONFIRMATION_EXPIRED` (Đề xuất) | `/cost-confirmation/respond` |
| 409 | `DUPLICATE_CONTACT` | `/auth/register`, `/customers/walk-in`, `PUT /me`, `POST /staff` |
| 409 | `SLOT_FULL` | `POST /appointments/spa`, `PUT /appointments/{id}` |
| 409 | `NO_CAPACITY` | `POST /appointments/hotel`, `PUT /appointments/{id}` |
| 409 | `STAFF_CONFLICT`, `CAGE_CONFLICT`, `STAFF_COUNT_MISMATCH` | `/confirm`; `PUT /appointments/{id}` (QL đổi nhân viên/chuồng) |
| 409 | `STAFF_OUT_OF_SHIFT` (Đề xuất) | `/confirm`; `PUT /appointments/{id}` (QL) |
| 409 | `INVALID_TRANSITION` | Mọi endpoint đổi trạng thái; `/suggestions` khi lịch không `Pending`; `POST /photos` khi lịch không ở `Received`/`InProgress` |
| 409 | `CHANGE_WINDOW_CLOSED` | `PUT /appointments/{id}`, `/cancel` |
| 409 | `PHOTO_REQUIRED` | `/start`, `/complete` |
| 409 | `SERVICES_INCOMPLETE` | `/complete` |
| 409 | `COST_CONFIRMATION_PENDING` | `/start`, `/check-in`, `/payments/{id}/counter` (khoản `Stay`) |
| 409 | `PAYMENT_NOT_DUE` | `/check-in` (lưu trú), `/check-out`, `/payments/{id}/counter`, `/payments/{id}/online` |
| 409 | `AMOUNT_MISMATCH` | `/payments/{id}/counter` |
| 409 | `SHIFT_OVERLAP`, `SHIFT_HAS_APPOINTMENTS` | `/work-shifts` |
| 429 | `RATE_LIMITED` | Đăng ký, đăng nhập, làm mới token, đặt lịch |
| 500 | — | Không lộ chi tiết nội bộ |

## 8. Điểm nguồn chưa quy định và đề xuất đã áp dụng

SA 5.1.3 và các nguồn không quy định các điểm dưới đây; `openapi.yaml` đã áp dụng đề xuất ở cột cuối (chờ nhóm duyệt). Khi duyệt, cập nhật lại SA 5.1.2, 5.1.3; mã lỗi mới phải thêm vào SA 5.1.2 và BC mục 5.3 trước khi dùng (BC 12.2).

| # | Vấn đề | Đề xuất đã áp dụng |
| --- | --- | --- |
| 1 | SA chỉ ghi chung “200 danh sách/chi tiết/hồ sơ” cho Customer, Pet, Service, Appointment, Payment, Cage, Staff, WorkShift, Notification, Photo, `/me`, `/config`. | Field lấy từ SA 4.2, camelCase; bỏ `PasswordHash`, `StorageKey`, `UserId`. Field do tài liệu này đặt tên (Suy ra): `recentAssignmentCount` (SA 5.3 SD-03: “kèm số ca 30 ngày qua”), `occupant` (SA: “thú cưng, khách, trả dự kiến”), `pendingCostConfirmation`, `url` (ảnh: “URL tạm thời”), `phone` ở `/me`. |
| 2 | Lịch hẹn chỉ có id, không có tên để hiển thị danh sách. | Thêm `customerName`, `petName` vào lịch hẹn; `name` vào `services[]`, `fullName` vào `staff[]` của chi tiết lịch hẹn. |
| 3 | UC-15: QL đổi nhân viên/chuồng của lịch đã xác nhận, nhưng `PUT /appointments/{id}` không có `staffIds`, `cageId`; SA 5.1.1 chỉ cho nhận chúng ở `/confirm`. | `PUT /appointments/{id}` nhận thêm `staffIds`/`cageId`/`confirmOutOfShift` chỉ từ QL (KH gửi thì bỏ qua); 409 như `/confirm`. |
| 4 | Body thành công không ghi: 201 của `POST /services`, `/cages`, `/staff`, `/work-shifts`; 200 của `PUT /me`, `/services/{id}`, `/cages/{id}`, `/staff/{id}`, `/work-shifts/{id}`, `/hotel/pricing`, `/config` và `PATCH /appointments/{id}/services/{serviceId}`. | 201 trả `{ <entity>Id }` theo mẫu `{ customerId }`, `{ petId }`, `{ photoId }` của SA; 200 để trống body. |
| 5 | Phân trang: SA 5.1.1 áp cho mọi “danh sách”, SA 5.1.3 chỉ ghi `page` ở `/appointments`, `/payments`, `/notifications`. Mặc định `page`, `pageSize` chưa nêu. | Áp cho `/customers`, `/pets`, `/staff`, `/cages`, `/work-shifts` và 3 endpoint trên; không áp cho `/services`, `/photos`, `/appointments/{id}/payments` (tập nhỏ theo một đối tượng). Không đặt giá trị mặc định. |
| 6 | SA 5.1.3 ghi “409” nhưng chưa có `code`: gỡ khóa khi KH không bị khóa; trùng mã chuồng; phản hồi xác nhận chi phí sau hạn. | 3 mã mới: `CUSTOMER_NOT_LOCKED`, `DUPLICATE_CAGE_CODE`, `COST_CONFIRMATION_EXPIRED`. |
| 7 | `/suggestions` khi lịch không `Pending`; `POST /photos` khi lịch sai trạng thái; thêm ca cho nhân viên đã vô hiệu hóa (UC-35). | Dùng lại mã có sẵn: `INVALID_TRANSITION` (2 trường hợp đầu); 400 `VALIDATION_ERROR` (nhân viên không phải NVS hoặc đã vô hiệu hóa). |
| 8 | UC-36 và SA 7.2 B cho QL sửa SizeRule, WeightTolerance, nhưng SA ghi `PUT /config` body `{ key: value… }`. | Body 3 phần: `settings`, `sizeRules`, `weightTolerances`; `GET /config` trả cùng dạng. `Booking.SlotTimes` là mảng `HH:mm`. |
| 9 | `GET /services` chỉ “đang cung cấp” nhưng `PATCH` có “mở lại”. | QL nhận cả dịch vụ đã ngừng (phân biệt bằng `isActive`); vai trò khác chỉ thấy dịch vụ đang cung cấp. |
| 10 | `AppUser` không có họ tên; QL không có hồ sơ Staff, nhưng SA ghi `fullName` bắt buộc ở `PUT /me`. Đổi `phone` của nhân viên chưa quy định. | `fullName` bắt buộc với KH và nhân viên, QL bỏ qua; `phone` chỉ áp dụng cho KH (nhân viên do QL sửa ở `PUT /staff/{id}`). |
| 11 | `temperament` ở `POST /pets`: SA 5.1.3 không đánh dấu tùy chọn; Req FR-PET-01 không bắt buộc, DB mặc định `Normal`. | Tùy chọn, mặc định `Normal`. |
| 12 | `weightCheck`: SA chỉ minh họa field của `NEEDS_CONFIRMATION`; SD-04 gộp “giảm” vào `OK`, BC 4.5 có `PRICE_DECREASED`. | Dùng 3 giá trị; chỉ `result` bắt buộc, field còn lại tùy chọn. |
| 13 | `slots[].group`: SA chỉ minh họa `Morning`, `Evening`. `409 STAFF_OUT_OF_SHIFT` “kèm danh sách nhân viên”: tên trường chưa nêu. | `group` là chuỗi tự do; danh sách nhân viên chỉ mô tả bằng lời. |
| 14 | Webhook VNPAY/MoMo: tham số và phản hồi theo tài liệu cổng (R-05). | Mô tả tổng quát, không liệt kê field. |
| 15 | `GET /health` (BC) chưa nói có nằm dưới `/api/v1` hay không. | Đặt dưới `/api/v1`, đánh dấu `x-proposal`. |
| 16 | BC 4.2 ghi lý do chọn khi “từ chối hoặc hủy (`/reject`, `/cancel`)”; SA và UC-13 cho `/reject` không body, luôn `StoreUnable`. | Theo SA: `/reject` không body. |
| 17 | SA UC-23 và SA 5.1.3 không nêu việc chặn ghi nhận tiền lưu trú khi lịch đang chờ xác nhận chi phí mới, trong khi Requirements FR-EXE-10 và SA UC-30 yêu cầu. | Chặn `POST /payments/{id}/counter` (khoản `Stay`) bằng 409 `COST_CONFIRMATION_PENDING`. |
| 18 | SA 5.4 không ghi lý do hủy khi `InProgress`/`InStay` và chỉ cho `Received` lý do (b), (e), trong khi `/cancel` của QL không giới hạn theo trạng thái. | QL gửi `StoreUnable` hoặc `CustomerBeyondDeadline` ở mọi trạng thái trước `Completed` (SA 5.4 cập nhật tương ứng). |

## 9. Kiểm tra đã thực hiện

- `openapi.yaml` đọc được bằng trình phân tích YAML, không có khóa trùng lặp; mọi `$ref` đều trỏ tới thành phần có thật; mỗi response có `description`, tham số đường dẫn đều `required`, danh sách `required` của schema đều có trong `properties`.
- 64 operation = 63 endpoint của SA 5.1.3 (đối chiếu từng method + đường dẫn, khớp cả Auth mục 8) + `GET /health` (Đề xuất).
- Với cả 63 endpoint: mọi mã HTTP, tên mã lỗi và mã FR ghi ở dòng tương ứng của SA 5.1.3 đều có trong `openapi.yaml`; tên trường request/response đã đối chiếu từng endpoint. Phần thêm so với SA (mã HTTP, mã lỗi) là các đề xuất ở mục 8 và mã lỗi chung theo SA 5.1.2 / BC 7.1.
- Vai trò `x-roles` khớp Auth mục 8; các cột dữ liệu dùng trong schema khớp SA 4.2 và DB.
- Chưa chạy bộ kiểm tra OpenAPI chuyên dụng (môi trường không có mạng); nên dán vào Swagger Editor hoặc import vào Postman (C-03) để kiểm tra lại.
