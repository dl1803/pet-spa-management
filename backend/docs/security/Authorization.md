# Authorization – Hệ thống quản lý spa thú cưng

*Xác thực và phân quyền*

**Nguồn:** *Requirements & Business Analysis v2* (**Req**: 3.1, 3.4, 4.3, 5.1, 5.2, 6.1, 7.2), *System Analysis & UI Design v1.3* (**SA**: 2.1, 2.4, 3.1, 4.2, 5.1, 5.3, 6.2, 6.6, 7.1, 7.2), *Use Case* (**UC**). Mã FR, BR, R, D, X, UC giữ nguyên như tài liệu nguồn. **(Bổ sung)** là nội dung do SA thêm; **(Đề xuất)** là nội dung chưa có trong Req, do SA hoặc tài liệu này đề xuất để chốt các vấn đề còn mở (mục 10), cần nhóm xác nhận.

---

## 1. Vai trò

Hệ thống có 3 actor người dùng: Khách hàng, Nhân viên (gồm Lễ tân và Nhân viên spa), Quản lý (A-02).

| Vai trò | Viết tắt | Tài khoản | Web | Phạm vi dữ liệu và giới hạn |
| --- | --- | --- | --- | --- |
| Khách hàng (có tài khoản) | KH | Role = Customer | Web khách hàng | Chỉ dữ liệu của mình. |
| Lễ tân | LT | Role = Staff; StaffRole = Receptionist | Web nhân viên | Toàn cửa hàng. Không cập nhật tiến độ thực hiện dịch vụ spa, không phân công, không quản lý danh mục dịch vụ, chuồng, giá hay tài khoản nhân viên. |
| Nhân viên spa | NVS | Role = Staff; StaffRole = SpaStaff | Web nhân viên | Chỉ lịch hẹn spa được phân công cho mình. Không quản lý danh mục dịch vụ, không quản lý tài khoản nhân viên khác, không thực hiện quyết định điều hành cửa hàng. |
| Quản lý | QL | Role = Manager (chỉ có AppUser, không có hồ sơ Staff) | Web quản lý | Toàn cửa hàng. |

Không phải người dùng hệ thống:

| Đối tượng | Mô tả |
| --- | --- |
| Khách vãng lai | Không có tài khoản, không đăng nhập, không nhận thông báo (Customer.UserId = NULL). LT ghi nhận thông tin liên hệ và đặt lịch thay (BR-01); khách thanh toán tại quầy (Req 3.1). |
| Hệ thống (tác vụ nền) | Actor không giao diện; được kích hoạt qua `POST /internal/jobs/run` (xác thực bằng X-Job-Secret). |
| Cổng thanh toán | VNPAY/MoMo (sandbox); nằm ngoài trust boundary của backend (D-02), chỉ được tin sau khi xác minh chữ ký. |

---

## 2. Nguyên tắc phân quyền

1. **Xác thực trước:** mọi chức năng dành riêng cho một vai trò đều yêu cầu xác thực (Req 4.3, 5.2).
2. **Hai lớp kiểm tra (BR-16):** (a) vai trò – chính sách theo vai trò ở tầng API (Controller) theo ma trận mục 4; (b) quyền sở hữu/phạm vi dữ liệu – kiểm tra ở tầng Application. Đã đăng nhập hợp lệ là chưa đủ.
3. **Kiểm tra lại ở backend cho mọi request,** không phụ thuộc việc đã kiểm tra ở web.
4. **Mặc định từ chối:** lỗi xác thực hoặc lỗi phân quyền thì từ chối truy cập.
5. **Danh tính và vai trò lấy từ token đã xác thực,** không nhận từ client. Vai trò LT/NVS do backend xác định từ dữ liệu nhân viên.
6. **Dữ liệu do backend quyết định:** giá, số tiền, role, nhóm kích cỡ, trạng thái lịch hẹn/thanh toán, nhân viên phụ trách, chuồng được gán. Request không có các trường role, sizeGroup, status, amount; staffId và cageId chỉ nhận khi QL xác nhận; trường thừa bị bỏ qua.
7. **Menu theo vai trò:** trang ngoài vai trò không hiện trong menu và vẫn bị backend từ chối khi truy cập trực tiếp.

---

## 3. Xác thực

### 3.1 Cơ chế

| Hạng mục | Quy định |
| --- | --- |
| Cơ chế | JWT Bearer Authentication kết hợp ASP.NET Core Identity (quản lý user, băm mật khẩu). |
| Định danh đăng nhập | Số điện thoại (AppUser.UserName), duy nhất, dùng cho mọi vai trò (X-02, nhóm đã duyệt). |
| Gửi token | Header `Authorization: Bearer <accessToken>` cho mọi endpoint trừ nhóm “Ẩn danh” (mục 8). |
| Access token | JWT thời hạn ngắn, chứa UserId và Role (Customer \| Staff \| Manager). |
| Refresh token | Thời hạn dài hơn; lưu phía backend dạng băm (không lưu token thô) để thu hồi được (RefreshToken.RevokedAt); xoay vòng khi làm mới (Đề xuất). |
| Mật khẩu | Băm bằng PasswordHasher của Identity; không bao giờ trả PasswordHash trong response. |
| Tài khoản bị vô hiệu hóa (IsActive = false) | Bị từ chối đăng nhập và làm mới token; refresh token liên quan bị thu hồi; mất quyền đăng nhập ngay (FR-STF-03). Với access token đã cấp, mỗi request đã xác thực kiểm tra thêm `AppUser.IsActive`; `false` → `401` (Đề xuất – Backend-Architecture 6.1, Backend-Conventions 6.2). |
| Thời hạn token | Access token 15 phút; refresh token 7 ngày (Đề xuất, R-01). Cấu hình qua Jwt__AccessTokenMinutes, Jwt__RefreshTokenDays. |

### 3.2 Tạo tài khoản và gán vai trò

- **Đăng ký (FR-ACC-01):** luôn tạo Role = Customer, không nhận từ client.
- **QL tạo nhân viên (FR-STF-01):** tạo Role = Staff kèm vai trò lễ tân hoặc nhân viên spa do QL chọn.
- **Khách vãng lai:** không có tài khoản đăng nhập (FR-ACC-04).
- **Tài khoản QL:** không có chức năng tạo qua giao diện vận hành. Tạo QL đầu tiên (Đề xuất, R-02): script khởi tạo một lần khi triển khai, chỉ chạy khi chưa có tài khoản Role = Manager; UserName và mật khẩu lấy từ biến môi trường Seed__ManagerUserName, Seed__ManagerPassword, không nằm trong source code.

### 3.3 Luồng đăng nhập và làm mới token (SD-01, UC-02)

1. Web gửi `POST /auth/login {userName, password}`; AuthController kiểm tra đầu vào và rate limiting.
2. AuthService tìm AppUser theo UserName.
3. Không tồn tại, IsActive = false hoặc sai mật khẩu: ghi log đăng nhập thất bại (không ghi mật khẩu), trả `401`.
4. Hợp lệ: cấp access token (UserId, Role) và refresh token (lưu băm), trả `200 {accessToken, refreshToken}`; web điều hướng vào màn hình đúng vai trò.
5. Access token hết hạn: web gửi `POST /auth/refresh {refreshToken}`; backend đối chiếu băm (chưa thu hồi, chưa hết hạn) và kiểm tra IsActive. Hợp lệ: thu hồi token cũ, cấp token mới. Không hợp lệ: `401`, web về màn hình đăng nhập.
6. Đăng xuất: `POST /auth/logout` thu hồi refresh token.

### 3.4 Xác thực không dùng JWT

| Điểm vào | Quy định |
| --- | --- |
| Webhook VNPAY/MoMo | Không mang JWT; xác minh chữ ký/secret của cổng trước khi xử lý. Sai chữ ký: `401`, không cập nhật trạng thái thanh toán, ghi log. Chữ ký hợp lệ chưa đủ: số tiền phải khớp đủ (BR-17). Xử lý idempotent theo TxnRef. Cách xác minh (Đề xuất, R-05): mỗi cổng có một adapter riêng, xác minh chữ ký bằng secret lấy từ biến môi trường theo tài liệu tích hợp sandbox của cổng; thứ tự kiểm tra: chữ ký → TxnRef đã được tạo trước đó và chưa xử lý → số tiền khớp Payment.Amount → ghi nhận kết quả. |
| `POST /internal/jobs/run` | Xác minh header X-Job-Secret (giá trị Jobs__Secret); sai thì `401`. Chỉ kích hoạt tác vụ nền idempotent, không nhận dữ liệu. |

### 3.5 Kiểm soát bảo mật áp dụng cho mọi request

- **Rate limiting** cho đăng ký, đăng nhập, làm mới token và đặt lịch của KH; vượt giới hạn trả `429`. Ngưỡng khởi điểm (Đề xuất): đăng ký, đăng nhập, làm mới token tối đa 10 request/phút mỗi IP; đặt lịch tối đa 10 request/phút mỗi tài khoản; điều chỉnh qua RateLimit__* (SA 7.2 ghi giá trị này chưa chốt).
- **CORS** chỉ cho phép đúng 3 origin web (quản lý, nhân viên, khách hàng); **HTTPS** bắt buộc.
- **Kiểm tra `IsActive` ở mỗi request đã xác thực** (Đề xuất): tài khoản bị vô hiệu hóa nhận `401` ngay cả khi access token chưa hết hạn (FR-STF-03).
- **Không ghi** mật khẩu, token, secret vào log; secret (khóa ký JWT, connection string, secret cổng thanh toán) cấp qua biến môi trường/secret store, không nằm trong source code.
- **Ghi log sự kiện bảo mật** (đăng nhập thất bại, request bị từ chối, webhook bị từ chối) kèm danh tính người thực hiện.

### 3.6 Đăng nhập đúng web theo vai trò (Đề xuất)

- Đối ứng: Role = Customer → web khách hàng; Role = Staff → web nhân viên; Role = Manager → web quản lý.
- Sau khi đăng nhập thành công, web đọc Role trong access token. Nếu Role không thuộc web đang dùng: web không lưu phiên, gọi `POST /auth/logout` để thu hồi refresh token và hiển thị “Tài khoản không có quyền truy cập web này”.
- Đây chỉ là bước kiểm tra ở web; việc bảo vệ dữ liệu vẫn do backend đảm bảo (nguyên tắc 3, mã `403 FORBIDDEN` khi gọi API ngoài vai trò).

---

## 4. Ma trận phân quyền theo nhóm hành động

Nguồn: Req 5.1 (Bảng 1). “Có (của mình)” và “Có (được phân công)” nghĩa là backend còn kiểm tra quyền sở hữu/phạm vi (BR-16).

| Nhóm hành động | KH | LT | NVS | QL |
| --- | --- | --- | --- | --- |
| Quản lý tài khoản cá nhân (của chính mình) | Có | Có | Có | Có |
| Ghi nhận khách vãng lai | Không | Có | Không | Không |
| Quản lý hồ sơ thú cưng (tạo, sửa) | Có (của mình) | Có (khi phục vụ khách tại cửa hàng) | Không | Không |
| Gỡ bỏ hồ sơ thú cưng | Có (của mình) | Không | Không | Không |
| Xem hồ sơ thú cưng gắn với lịch hẹn | Có (của mình) | Có | Có (lịch hẹn được phân công) | Có |
| Quản lý danh mục dịch vụ (thêm, sửa, ngừng) | Không | Không | Không | Có |
| Xem danh mục dịch vụ | Có | Có | Có | Có |
| Quản lý chuồng và giá lưu trú | Không | Không | Không | Có |
| Xem giá và tình trạng còn chỗ lưu trú | Có | Có | Không | Có |
| Xem tình trạng chuồng (thú cưng, khách hàng trong chuồng) | Không | Có | Không | Có |
| Đặt lịch hẹn spa / lưu trú | Có (thú cưng của mình) | Có (thay khách đến trực tiếp) | Không | Không |
| Gỡ khóa quyền tự đặt lịch của khách hàng (do vắng mặt) | Không | Không | Không | Có |
| Xác nhận/từ chối lịch hẹn | Không | Không | Không | Có |
| Xem xét/điều chỉnh nhân viên spa phụ trách; gán chuồng | Không | Không | Không | Có |
| Thay đổi/hủy lịch hẹn (spa, lưu trú) trong hạn tự phục vụ | Có (lịch hẹn của mình) | Không | Không | Có (khi cần can thiệp) |
| Tiếp nhận thú cưng (spa, lưu trú); ghi nhận cân nặng thực tế; trả thú cưng lưu trú | Không | Có | Không | Có (BR-05, khi cần thiết) |
| Xác nhận/từ chối chi phí mới khi cân nặng làm tăng nhóm kích cỡ | Có (lịch hẹn của mình) | Có (ghi nhận thay khách vãng lai hoặc phản hồi trực tiếp) | Không | Không |
| Cập nhật tiến độ, hoàn tất lịch hẹn spa | Không | Không | Có (lịch hẹn được phân công) | Có (BR-05, khi cần thiết) |
| Tải lên ảnh minh chứng trước/sau | Không | Không | Có (lịch hẹn được phân công) | Không |
| Xem ảnh minh chứng trước/sau | Có (lịch hẹn của mình) | Không | Có (lịch hẹn được phân công) | Có |
| Ghi nhận thanh toán tại quầy | Không | Có | Không | Có |
| Thanh toán trực tuyến (lịch hẹn spa) | Có (lịch hẹn của mình) | Không | Không | Không |
| Theo dõi tình hình thanh toán của một lịch hẹn cụ thể | Có (lịch hẹn của mình) | Có | Có (lịch hẹn được phân công) | Có |
| Theo dõi tình hình thanh toán toàn cửa hàng | Không | Không | Không | Có |
| Quản lý tài khoản/hồ sơ nhân viên | Không | Không | Không | Có |
| Xem lịch hẹn/lịch sử | Có (của mình) | Có (toàn cửa hàng) | Có (được phân công/của mình) | Có (toàn cửa hàng) |
| Quản lý phân lịch làm việc (ca làm) cho NVS – (Bổ sung, X-01, FR-STF-04) | Không | Không | Không | Có |
| Quản lý cấu hình tham số hệ thống – (Bổ sung, X-09, FR-CFG-01) | Không | Không | Không | Có |

---

## 5. Quyền sở hữu/phạm vi theo module dữ liệu

Nguồn: Req 5.1 (Bảng 2).

| Module dữ liệu | KH | LT | NVS | QL |
| --- | --- | --- | --- | --- |
| Khách vãng lai | Không có quyền | Ghi nhận, xem | Không có quyền | Không có quyền |
| Hồ sơ thú cưng | Xem/thêm/sửa/xóa – chỉ hồ sơ do mình sở hữu | Xem/thêm/sửa – khi phục vụ khách tại cửa hàng | Chỉ xem – hồ sơ gắn với lịch hẹn được phân công | Chỉ xem – hồ sơ gắn với lịch hẹn trong cửa hàng |
| Danh mục dịch vụ | Chỉ xem | Chỉ xem | Chỉ xem | Toàn quyền: thêm/sửa/ngừng cung cấp |
| Chuồng và giá lưu trú | Chỉ xem giá và tình trạng còn chỗ | Xem giá, tình trạng còn chỗ và tình trạng chuồng | Không có quyền (không có chức năng tương ứng) | Toàn quyền: thêm/sửa/ngừng sử dụng chuồng, thiết lập giá |
| Lịch hẹn spa – danh sách, chi tiết, lịch sử, đổi/hủy, tiếp nhận, tiến độ/trạng thái | Chỉ lịch hẹn của mình: xem, đặt mới, đổi/hủy trong hạn, xác nhận chi phí mới | Toàn cửa hàng: xem, đặt thay khách đến trực tiếp, tiếp nhận, ghi nhận cân nặng | Chỉ lịch hẹn được phân công: xem, cập nhật tiến độ, hoàn tất | Toàn cửa hàng: xem, xác nhận/từ chối, phân công, cập nhật trạng thái, xử lý đổi/hủy khi cần |
| Lịch hẹn lưu trú | Chỉ lịch hẹn của mình: xem, đặt mới, đổi/hủy trong hạn, xác nhận chi phí mới | Toàn cửa hàng: xem, đặt thay khách đến trực tiếp, tiếp nhận, ghi nhận cân nặng, trả thú cưng | Không có quyền (không có chức năng tương ứng) | Toàn cửa hàng: xem, xác nhận/từ chối, gán chuồng, xử lý đổi/hủy |
| Ảnh minh chứng trước/sau | Chỉ xem – ảnh của lịch hẹn của mình | Không có quyền | Tải lên, xem – lịch hẹn được phân công | Chỉ xem – toàn cửa hàng |
| Thanh toán | Của lịch hẹn thuộc sở hữu của mình: thanh toán trực tuyến (lịch spa), xem trạng thái | Toàn cửa hàng: ghi nhận tại quầy, xem trạng thái | Chỉ xem trạng thái – lịch hẹn được phân công | Toàn cửa hàng: ghi nhận tại quầy, theo dõi tổng thể |
| Tài khoản nhân viên | Không có quyền | Không có quyền (không tự quản lý tài khoản khác) | Không có quyền (không tự quản lý tài khoản khác) | Toàn quyền: tạo, sửa, vô hiệu hóa |
| Thông báo | Chỉ thông báo gửi cho mình | Không có chức năng tương ứng | Chỉ thông báo gửi cho mình | Không có chức năng tương ứng |
| Ca làm việc (Bổ sung, X-01) | Không có quyền | Không có quyền | Không có quyền | Toàn quyền: xem, thêm, sửa, xóa ca |
| Cấu hình tham số (Bổ sung, X-09) | Không có quyền | Không có quyền | Không có quyền | Xem, cập nhật tham số |

**Phạm vi theo BR-16:** KH chỉ xem hoặc thao tác trên dữ liệu thuộc sở hữu của mình (hồ sơ thú cưng, lịch hẹn, ảnh minh chứng, lịch sử sử dụng dịch vụ, thông tin thanh toán, thông tin tài khoản cá nhân); NVS chỉ xem hoặc cập nhật lịch hẹn spa được phân công cho mình; LT xem lịch hẹn, hồ sơ khách và thú cưng trong phạm vi cửa hàng để đặt lịch, tiếp nhận, thanh toán nhưng không cập nhật tiến độ thực hiện; QL có toàn quyền truy cập trong phạm vi cửa hàng. Truy cập dữ liệu ngoài phạm vi (kể cả bằng id) bị từ chối và không trả thông tin.

---

## 6. Quyền có điều kiện

| Quy tắc | Nội dung |
| --- | --- |
| BR-08 | KH có tài khoản tự hủy hoặc đổi lịch hẹn (spa, lưu trú) miễn phí trên web nếu thực hiện trước giờ hẹn tối thiểu một khoảng do cửa hàng cấu hình (1–2 tiếng, A-03; SA 7.2: Booking.ChangeCancelDeadlineMinutes mặc định 60 phút, khoảng 60–120 phút). Sau mốc này chức năng tự hủy/đổi bị khóa, KH liên hệ hotline để QL xử lý (FR-CHG-02, FR-CHG-03). |
| BR-09 | Thanh toán trực tuyến chỉ áp dụng cho lịch hẹn spa sau khi hoàn tất, chỉ KH có tài khoản thực hiện. Mọi khoản thanh toán của lịch hẹn lưu trú thực hiện tại quầy. |
| BR-10 | KH không có quyền chỉ định nhân viên spa; hệ thống đề xuất, QL quyết định cuối cùng. |
| BR-15 | KH bị đánh dấu vắng mặt quá 3 lần trong 30 ngày (A-05) bị khóa quyền tự đặt lịch trực tuyến. Khóa không áp dụng khi LT đặt thay. QL gỡ khóa khi KH liên hệ trực tiếp (FR-BOOK-07). |

---

## 7. Quyền thực hiện các bước của lịch hẹn và thanh toán

Lịch spa: Chờ xác nhận → Đã xác nhận → Đã tiếp nhận → Đang thực hiện → Hoàn tất. Lịch lưu trú: Chờ xác nhận → Đã xác nhận → Đang lưu trú → Hoàn tất. Không bỏ bước, không chuyển ngược, trừ hai ngoại lệ: (a) chuyển sang “Đã hủy” từ bất kỳ trạng thái nào trước “Hoàn tất” (không chuyển ngược từ “Đã hủy”); (b) quay từ “Đã xác nhận” về “Chờ xác nhận” theo BR-26, BR-27 (FR-LFC-01, BR-14).

| Bước | Người/cơ chế được phép | Điều kiện chính | Tham chiếu |
| --- | --- | --- | --- |
| Tạo lịch hẹn → Chờ xác nhận | KH (thú cưng của mình); LT (thay khách) | KH tự đặt: tài khoản không bị khóa; LT đặt thay: không áp dụng khóa | FR-BOOK-03, FR-HTL-04; BR-15 |
| Chờ xác nhận → Đã xác nhận | QL | Có nhân viên spa phụ trách (lịch spa) hoặc chuồng phù hợp (lịch lưu trú) | FR-ASG-03, FR-HTL-05; BR-03, BR-10 |
| Chờ xác nhận → Đã hủy (cửa hàng không thể đáp ứng) | QL | — | FR-ASG-04, FR-HTL-06 |
| Đã xác nhận → Chờ xác nhận | KH (tự đổi lịch trong hạn); hệ thống (khi QL vô hiệu hóa NVS phụ trách) | Lịch hẹn của KH, còn trong hạn tự phục vụ | FR-CHG-01, FR-STF-03; BR-26, BR-27 |
| Đã xác nhận → Đã tiếp nhận (spa) | LT; QL khi cần | Còn trong thời gian giữ chỗ 15 phút | FR-EXE-02; BR-05(a), BR-08 |
| Đã tiếp nhận → Đang thực hiện (spa) | NVS được phân công; QL khi cần | Có ảnh trước hợp lệ; không chờ khách xác nhận chi phí mới | FR-EXE-03, FR-EXE-05; BR-05(b), BR-20, BR-23 |
| Đang thực hiện → Hoàn tất (spa) | NVS được phân công; QL khi cần | Mọi dịch vụ đã xong; có ảnh sau | FR-EXE-04, FR-EXE-05; BR-05(b), BR-06, BR-20 |
| Đã xác nhận → Đang lưu trú | LT; QL khi cần | Còn trong thời gian giữ chỗ; đã đối chiếu cân nặng, không chờ xác nhận chi phí; tiền lưu trú đã thanh toán | FR-HTL-07; BR-05(a), BR-07, BR-23 |
| Đang lưu trú → Hoàn tất | LT; QL khi cần | Phí phạt trả muộn (nếu có) đã thanh toán | FR-HTL-09; BR-05(a), BR-07, BR-22 |
| → Đã hủy: khách hàng chủ động hủy | KH (lịch hẹn của mình) | Trong hạn tự phục vụ | FR-CHG-01; BR-08 |
| → Đã hủy: cửa hàng không thể đáp ứng, hoặc theo yêu cầu KH ngoài hạn tự phục vụ | QL | Ở mọi trạng thái trước “Hoàn tất”; khi hủy, QL gửi lý do StoreUnable hoặc CustomerBeyondDeadline (hủy khi “Đang thực hiện”/“Đang lưu trú” chỉ QL – Đề xuất) | FR-CHG-03 |
| → Đã hủy: vắng mặt | Hệ thống (tác vụ nền) | Quá 15 phút sau giờ hẹn đã xác nhận mà chưa được tiếp nhận | FR-EXE-07; BR-08 |
| → Đã hủy: không xác nhận chi phí mới | Hệ thống tự chuyển khi KH từ chối (KH phản hồi; LT ghi nhận phản hồi thay khách vãng lai hoặc phản hồi trực tiếp/qua điện thoại) hoặc quá 30 phút không có phản hồi | Cân nặng thực tế làm tăng nhóm kích cỡ (yêu cầu xác nhận từ FR-EXE-10) | FR-EXE-11; BR-23 |
| Thanh toán: Chưa thanh toán → Đã thanh toán (tại quầy) | LT; QL | Đúng thời điểm (BR-07); số tiền thực nhận không thấp hơn số tiền phải trả (BR-17); riêng tiền lưu trú: lịch không chờ xác nhận chi phí mới (FR-EXE-10) | FR-PAY-02 |
| Thanh toán: Chưa thanh toán → Đã thanh toán (trực tuyến) | KH (lịch spa của mình, đã “Hoàn tất”); kết quả do cổng xác nhận qua webhook | Chữ ký hợp lệ; số tiền khớp đủ | FR-PAY-03; BR-09, BR-17 |

**Lưu ý:** QL không tải được ảnh minh chứng; khi QL cập nhật trực tiếp trạng thái lịch spa vẫn phải thỏa BR-06, BR-20 (FR-EXE-05). Thời điểm ghi nhận thanh toán theo BR-07: lịch spa khi “Hoàn tất”; lịch lưu trú – tiền lưu trú khi “Đã xác nhận” (và không chờ xác nhận chi phí mới – FR-EXE-10), phí phạt trả muộn khi “Đang lưu trú”.

---

## 8. Phân quyền theo API

Tiền tố `/api/v1`. “Ẩn danh” là không cần token; “Đã đăng nhập” là mọi vai trò. Ngoài vai trò, backend luôn kiểm tra quyền sở hữu/phạm vi (BR-16).

| Method | Endpoint | Vai trò (phạm vi) | FR |
| --- | --- | --- | --- |
| **Xác thực và tài khoản** | | | |
| POST | /auth/register | Ẩn danh | FR-ACC-01 |
| POST | /auth/login | Ẩn danh | FR-ACC-02 |
| POST | /auth/refresh | Ẩn danh (refresh token) | Req. 5.2 |
| POST | /auth/logout | Đã đăng nhập | Req. 5.2 |
| GET | /me | Đã đăng nhập | FR-ACC-03 |
| PUT | /me | Đã đăng nhập | FR-ACC-03 |
| **Khách hàng** | | | |
| GET | /customers?search= | LT; QL (chỉ khách bị khóa) | FR-ACC-04, FR-BOOK-07 |
| POST | /customers/walk-in | LT | FR-ACC-04 |
| POST | /customers/{id}/unlock-booking | QL | FR-BOOK-07 |
| **Thú cưng** | | | |
| POST | /pets | KH (của mình); LT (kèm customerId) | FR-PET-01, FR-PET-04 |
| GET | /pets | KH (của mình); LT (?customerId) | FR-PET-02 |
| GET | /pets/{id} | KH (của mình); LT; NVS (lịch được phân công); QL | FR-PET-02 |
| PUT | /pets/{id} | KH (của mình); LT | FR-PET-02, FR-PET-04 |
| DELETE | /pets/{id} | KH (của mình) | FR-PET-03 |
| **Danh mục dịch vụ** | | | |
| GET | /services | Đã đăng nhập | FR-SVC-04 |
| POST | /services | QL | FR-SVC-01 |
| PUT | /services/{id} | QL | FR-SVC-02 |
| PATCH | /services/{id}/status | QL | FR-SVC-03 |
| **Lịch hẹn – đặt lịch và truy vấn** | | | |
| GET | /spa/slots | KH; LT | FR-BOOK-01, FR-BOOK-02 |
| POST | /appointments/spa | KH (của mình); LT (thay) | FR-BOOK-03 |
| GET | /hotel/availability | KH; LT; QL | FR-HTL-04 |
| POST | /appointments/hotel | KH (của mình); LT (thay) | FR-HTL-04 |
| GET | /appointments | KH; LT; NVS; QL (theo phạm vi) | FR-BOOK-04, FR-BOOK-05, FR-EXE-01, FR-EXE-06, FR-EXE-08 |
| GET | /appointments/{id} | KH; LT; NVS; QL (theo phạm vi) | FR-BOOK-04 |
| **Lịch hẹn – xác nhận, đổi, hủy** | | | |
| GET | /appointments/{id}/suggestions | QL | FR-ASG-01, FR-HTL-05 |
| POST | /appointments/{id}/confirm | QL | FR-ASG-02, FR-ASG-03, FR-HTL-05 |
| POST | /appointments/{id}/reject | QL | FR-ASG-04, FR-HTL-06 |
| PUT | /appointments/{id} | KH (trong hạn); QL | FR-CHG-01, FR-CHG-03 |
| POST | /appointments/{id}/cancel | KH (trong hạn); QL | FR-CHG-01, FR-CHG-02, FR-CHG-03 |
| **Lịch hẹn – thực hiện** | | | |
| POST | /appointments/{id}/check-in | LT; QL | FR-EXE-02, FR-HTL-07 |
| POST | /appointments/{id}/weight-check | LT; QL | FR-EXE-10 |
| POST | /appointments/{id}/cost-confirmation/respond | KH (của mình); LT (thay) | FR-EXE-11 |
| POST | /appointments/{id}/start | NVS được phân công; QL | FR-EXE-03, FR-EXE-05 |
| PATCH | /appointments/{id}/services/{serviceId} | NVS được phân công; QL | FR-EXE-03 |
| POST | /appointments/{id}/complete | NVS được phân công; QL | FR-EXE-04, FR-EXE-05 |
| POST | /appointments/{id}/check-out | LT; QL | FR-HTL-09 |
| POST | /appointments/{id}/photos | NVS được phân công | FR-EXE-09 |
| GET | /appointments/{id}/photos | KH (của mình); NVS được phân công; QL | FR-EXE-09 |
| **Thanh toán** | | | |
| GET | /appointments/{id}/payments | KH; LT; NVS; QL (theo phạm vi) | FR-PAY-04 |
| GET | /payments | QL | FR-PAY-04 |
| POST | /payments/{id}/counter | LT; QL | FR-PAY-02 |
| POST | /payments/{id}/online | KH (của mình) | FR-PAY-03 |
| GET | /payments/ipn/vnpay | Ẩn danh + chữ ký cổng | FR-PAY-03 |
| POST | /payments/ipn/momo | Ẩn danh + chữ ký cổng | FR-PAY-03 |
| **Lưu trú – chuồng và giá** | | | |
| GET | /hotel/pricing | KH; LT; QL | FR-HTL-03 |
| PUT | /hotel/pricing | QL | FR-HTL-03 |
| GET | /cages | LT; QL | FR-HTL-08 |
| POST | /cages | QL | FR-HTL-01 |
| PUT | /cages/{id} | QL | FR-HTL-02 |
| PATCH | /cages/{id}/status | QL | FR-HTL-02 |
| **Nhân viên, lịch làm việc, cấu hình, tác vụ nền** | | | |
| GET | /staff | QL | FR-STF-02 |
| POST | /staff | QL | FR-STF-01 |
| PUT | /staff/{id} | QL | FR-STF-02 |
| POST | /staff/{id}/deactivate | QL | FR-STF-03 |
| GET | /work-shifts | QL | FR-STF-04 |
| POST | /work-shifts | QL | FR-STF-04 |
| PUT | /work-shifts/{id} | QL | FR-STF-04 |
| DELETE | /work-shifts/{id} | QL | FR-STF-04 |
| GET | /config | QL | FR-CFG-01 |
| PUT | /config | QL | FR-CFG-01 |
| POST | /internal/jobs/run | Bí mật (header X-Job-Secret) | FR-BOOK-06, FR-EXE-07, FR-EXE-11 |
| **Thông báo** | | | |
| GET | /notifications | KH; NVS (thông báo của chính mình) | FR-NOT-01 → FR-NOT-06 |
| POST | /notifications/{id}/read | KH; NVS (thông báo của chính mình) | FR-NOT-01 → FR-NOT-06 |

**Mã lỗi liên quan xác thực và phân quyền:**

| HTTP | Mã (code) | Trường hợp |
| --- | --- | --- |
| 401 | UNAUTHENTICATED | Thiếu/sai/hết hạn token; đăng nhập sai; tài khoản bị vô hiệu hóa; webhook sai chữ ký; X-Job-Secret sai. |
| 403 | FORBIDDEN | Sai vai trò hoặc ngoài phạm vi sở hữu (BR-16). |
| 403 | BOOKING_LOCKED | KH tự đặt lịch khi tài khoản bị khóa (BR-15). |
| 409 | CHANGE_WINDOW_CLOSED | KH tự đổi/hủy quá mốc BR-08; hướng dẫn liên hệ hotline. |
| 429 | RATE_LIMITED | Vượt giới hạn tần suất: đăng ký, đăng nhập, làm mới token, đặt lịch. |

---

## 9. Phân quyền giao diện

Menu hiển thị theo vai trò. Web nhân viên dùng chung khung và hiển thị mục theo LT hoặc NVS.

| Web | Vai trò | Màn hình |
| --- | --- | --- |
| Web khách hàng | KH | CW-01 Đăng ký, CW-02 Đăng nhập; sau đăng nhập: CW-03 → CW-13 |
| Web nhân viên | LT, NVS | SW-01 Đăng nhập |
| Web nhân viên | LT | SW-02 Lịch hẹn (cả cửa hàng), SW-03 Chi tiết lịch hẹn, SW-04 → SW-10, SW-14 Danh mục dịch vụ, SW-15 Hồ sơ cá nhân |
| Web nhân viên | NVS | SW-02 Lịch hẹn (được phân công), SW-03 Chi tiết lịch hẹn, SW-11 → SW-13, SW-14 Danh mục dịch vụ, SW-15 Hồ sơ cá nhân |
| Web quản lý | QL | MW-01 Đăng nhập; sau đăng nhập: MW-02 → MW-13 |

- Chỉ KH (CW-12) và NVS (SW-13) có màn hình thông báo; LT và QL không có chức năng thông báo.
- Web xử lý lỗi theo mã HTTP: `401` thử làm mới token, thất bại thì về màn hình đăng nhập; `403` hiện trang “Bạn không có quyền”; `429` nhắc thử lại sau.

---

## 10. Vấn đề chưa chốt và lưu ý đối chiếu

Các đề xuất dưới đây cần nhóm xác nhận; sau khi xác nhận có thể đóng R-01, R-02, R-05 trong Req.

| Vấn đề | Đề xuất chốt | Vị trí |
| --- | --- | --- |
| R-01 (D-01): cơ chế, chiến lược xác thực; thời hạn token | Giữ JWT Bearer + ASP.NET Core Identity như SA; access token 15 phút, refresh token 7 ngày; xác nhận lại ở giai đoạn thiết kế kiến trúc kỹ thuật. | 3.1 |
| R-02: tạo tài khoản QL đầu tiên | Script khởi tạo một lần khi triển khai, chỉ chạy khi chưa có Role = Manager, thông tin lấy từ biến môi trường. | 3.2 |
| R-05 (X-08): xác minh chữ ký webhook từng cổng | Adapter riêng cho mỗi cổng, secret từ biến môi trường, thuật toán theo tài liệu sandbox của cổng; thêm kiểm tra TxnRef và số tiền. | 3.4 |
| Ngưỡng rate limiting (SA 7.2) | 10 request/phút mỗi IP (đăng ký, đăng nhập, làm mới token); 10 request/phút mỗi tài khoản (đặt lịch); cấu hình được. | 3.5 |
| Đăng nhập khác web theo vai trò | Web kiểm tra Role trong token sau khi đăng nhập, không đúng thì không lưu phiên và thu hồi refresh token; backend vẫn từ chối API ngoài vai trò. | 3.6 |

**Lưu ý đối chiếu giữa các tài liệu nguồn:**

- **FR-PAY-04:** Req 4.2.9 chỉ nêu actor QL; việc KH, LT, NVS xem thanh toán của một lịch hẹn theo Req 5.1 và SA 5.1.3 (UC-25).
- **Ca làm việc, cấu hình tham số:** ma trận Req 5.1 chưa có; thêm theo SA (X-01, X-09), cần cập nhật lại Req.
