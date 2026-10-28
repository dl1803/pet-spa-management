# Hệ thống quản lý spa thú cưng – System Analysis & UI Design

Phân tích hệ thống và thiết kế giao diện người dùng · Phiên bản 1.3 · Ngày lập: 04/10/2026 · Cập nhật: 15/10/2026 (chuyển kiến trúc backend từ Modular Monolith sang Clean Architecture – X-12)
Tài liệu kèm theo *Requirements & Business Analysis (v2)*.

> Ghi chú về bản md: các hình trong bản gốc được chuyển thành danh sách đánh số (luồng nghiệp vụ, kiến trúc, triển khai, ERD, lớp, tuần tự, trạng thái, luồng màn hình), bảng (use case tổng thể, sitemap) hoặc mô tả bằng chữ (wireframe, mockup). Các mã FR, BR, BP, A, C, R, D, NFR được lấy từ tài liệu Requirements & Business Analysis (v2) và giữ nguyên.

## Mục lục

- **I. Giới thiệu chung (Introduction)**
  - 1.1 Mục đích tài liệu (Purpose)
  - 1.2 Phạm vi dự án (Project Scope)
  - 1.3 Thuật ngữ & Viết tắt (Glossary & Acronyms)
- **II. Phân tích Yêu cầu Hệ thống (System Requirements Analysis)**
  - 2.1 Mô tả người dùng (User Classes & Characteristics)
  - 2.2 Bối cảnh & Luồng nghiệp vụ (Business Process/Workflow)
  - 2.3 Yêu cầu chức năng (Functional Requirements)
  - 2.4 Yêu cầu phi chức năng (Non-functional Requirements)
- **III. Thiết kế Kiến trúc (Architecture Design)**
  - 3.1 Kiến trúc tổng thể (System Architecture)
  - 3.2 Sơ đồ triển khai (Deployment Diagram)
  - 3.3 Công nghệ sử dụng (Technology Stack)
- **IV. Thiết kế Dữ liệu (Database Design)**
  - 4.1 Sơ đồ thực thể liên kết (ERD)
  - 4.2 Thiết kế lược đồ CSDL và Từ điển dữ liệu (Database Schema & Data Dictionary)
- **V. Thiết kế Chi tiết Hệ thống (Detailed System Design)**
  - 5.1 Thiết kế API (API Specification)
  - 5.2 Biểu đồ lớp (Class Diagram)
  - 5.3 Biểu đồ tuần tự (Sequence Diagram)
  - 5.4 Biểu đồ trạng thái (State Diagram)
- **VI. Thiết kế Giao diện Người dùng (UI/UX Design)**
  - 6.1 Nguyên tắc thiết kế (Design Guidelines & System)
  - 6.2 Sơ đồ trang / Điều hướng (Sitemap & Navigation Flow)
  - 6.3 Luồng màn hình (User Flow)
  - 6.4 Phác thảo (Wireframes)
  - 6.5 Thiết kế chi tiết (UI Mockups)
  - 6.6 Nguyên tắc tương tác (Micro-interactions & Animations)
- **VII. Ràng buộc & Cấu hình (Constraints & Configurations)**
  - 7.1 Tích hợp bên thứ ba (Third-party Integrations)
  - 7.2 Tham số cấu hình (System Configurations)

---

# I. Giới thiệu chung (Introduction)

## 1.1 Mục đích tài liệu (Purpose)

Tài liệu **System Analysis & UI Design** chuyển các yêu cầu trong *Requirements & Business Analysis (v2)* thành thiết kế hệ thống: use case, kiến trúc, cơ sở dữ liệu, API và giao diện người dùng của **Hệ thống quản lý spa thú cưng**.

- **Người đọc:** nhóm phát triển (backend, frontend), kiểm thử (QC) và các bên liên quan của đồ án.

- **Quy ước tham chiếu:** mã FR, BR, BP, A, C, R, D lấy nguyên từ Requirements. Mã UC-xx, SD-xx và màn hình CW/SW/MW-xx là mã mới của tài liệu này.

- **Quy ước đánh dấu:** “(Đề xuất)” là quyết định thiết kế chưa có trong Requirements; “(Bổ sung)” là nội dung nhóm yêu cầu thêm so với Requirements v2 (cần cập nhật lại Requirements). Danh sách tổng hợp ở bảng 1.2.

## 1.2 Phạm vi dự án (Project Scope)

Hệ thống số hóa hoạt động của **một cửa hàng spa thú cưng** (A-01) phục vụ chó, mèo, thỏ, chuột lang (BR-19) với hai nhóm dịch vụ tại cửa hàng: **chăm sóc spa** và **lưu trú** tính theo đêm. Hệ thống gồm một backend ASP.NET Core Web API phục vụ 3 web (khách hàng, nhân viên, quản lý) và cơ sở dữ liệu PostgreSQL (C-01, C-02).

**Trong phạm vi (In-scope):**

- Tài khoản khách hàng, nhân viên, quản lý; ghi nhận khách vãng lai
- Hồ sơ thú cưng, phân nhóm kích cỡ, đối chiếu cân nặng thực tế
- Danh mục dịch vụ spa; chuồng và giá lưu trú
- Đặt lịch spa/lưu trú, xác nhận, đổi, hủy
- Phân lịch làm việc (ca) cho nhân viên spa; phân công nhân viên spa, gán chuồng
- Cấu hình tham số hệ thống trên web quản lý
- Theo dõi thực hiện, ảnh minh chứng trước/sau
- Thanh toán (quầy; trực tuyến sandbox cho lịch spa)
- Thông báo nghiệp vụ trên web; lịch sử sử dụng dịch vụ

**Ngoài phạm vi (Out-of-scope):**

- Đa chi nhánh, franchise, multi-tenant, marketplace
- Quản lý kho, bán lẻ; CRM/marketing phức tạp
- Chức năng AI
- Nhân sự chuyên sâu, kế toán doanh nghiệp
- Mạng xã hội, logistics, giao hàng
- Hoàn tiền (xử lý ngoài hệ thống – BR-24)
- Xử lý sự cố khi chăm sóc (chỉ có ghi chú của nhân viên spa)
- Chức năng ngoài Requirements v2 chỉ thêm khi nhóm yêu cầu (X-01, X-09; C-04)

**Bảng 1.2 – Quyết định thiết kế và điểm khác Requirements v2**

| Mã | Nội dung | Trạng thái | Mục |
| --- | --- | --- | --- |
| X-01 | Quản lý phân lịch làm việc (ca) cho nhân viên spa: FR-STF-04, UC-35, MW-12, bảng WorkShift. | (Bổ sung) | 2.3, 4.2 |
| X-02 | Số điện thoại là định danh đăng nhập và liên hệ duy nhất. | Nhóm đã duyệt | 4.2 |
| X-03 | Nhất quán khi đồng thời: khóa tư vấn theo ngày + ràng buộc loại trừ PostgreSQL (R-04, BR-18). | (Đề xuất) | 3.1 |
| X-04 | Ảnh minh chứng lưu trên Supabase Storage gói Free. | (Đề xuất, 0đ) | 3.2 |
| X-05 | Hạ tầng 0đ: Vercel Hobby, Render Free, Supabase Free, cron-job.org; giới hạn nêu ở 3.2. | (Đề xuất, 0đ) | 3.2, 7.1 |
| X-06 | Mốc giờ tròn 09:00–19:00, giữ chỗ theo thời lượng, 1–2 nhân viên, dọn dẹp 15 phút. **Thay BR-13 và A-07 của v2** (v2: khả dụng không phân biệt dịch vụ); cũng làm các mục sau của v2 không còn đúng: thuật ngữ “Khung giờ”, “Năng lực phục vụ”, BP-04, FR-BOOK-02 (mô tả và tiêu chí nghiệm thu). | Nhóm yêu cầu (Bổ sung) | 2.3.3 |
| X-07 | Bảng màu, phông chữ, bộ thành phần giao diện (tài nguyên miễn phí). | (Đề xuất, 0đ) | 6.1 |
| X-08 | Chưa có chỉ tiêu định lượng phi chức năng (R-03); chưa chốt xác minh webhook từng cổng (R-05). | Cần chốt | 2.4, 7.1 |
| X-09 | Màn hình cấu hình tham số hệ thống: FR-CFG-01, UC-36, MW-13. | (Bổ sung) | 7.2 |
| X-10 | Tính cách thú cưng là danh mục Hiền / Bình thường / Khó tính-dữ; Khó tính-dữ cần tối thiểu 2 nhân viên; thời lượng và số nhân viên không đổi khi đổi nhóm kích cỡ lúc tiếp nhận. Lịch hẹn spa cần 1–2 nhân viên, khác thuật ngữ “Lịch hẹn” của v2 (1 nhân viên spa phụ trách). | (Đề xuất theo yêu cầu nhóm) | 2.3.3, 4.2 |
| X-11 | Đề xuất nhân viên theo 3 tiêu chí; “tháng qua” = 30 ngày, không tính lịch đã hủy; bằng nhau xếp theo tên; quản lý chọn tay được cả nhân viên ngoài ca (có cảnh báo). | (Bổ sung) | 2.3.3 |
| X-12 | Backend theo **Clean Architecture** (thay Modular Monolith của bản 1.2): 4 tầng Domain, Application, Infrastructure, API; phụ thuộc chỉ hướng vào trong (Dependency Rule); vẫn là một backend triển khai duy nhất. Requirements v2 không quy định kiểu kiến trúc nên không phải cập nhật. | (Đề xuất theo yêu cầu nhóm) | 1.3, 2.4, 3.1, 3.3, 5.2, 5.3 |

## 1.3 Thuật ngữ & Viết tắt (Glossary & Acronyms)

Thuật ngữ nghiệp vụ chi tiết xem Requirements, mục 1.1. Bảng dưới chỉ gồm các thuật ngữ dùng trong thiết kế.

| Thuật ngữ / viết tắt | Giải thích |
| --- | --- |
| KH / LT / NVS / QL | Khách hàng / Lễ tân / Nhân viên spa / Quản lý (vai trò nhân viên gồm LT và NVS). |
| Lịch hẹn (Appointment) | Yêu cầu dịch vụ gắn một khách hàng và một thú cưng; có hai loại: spa và lưu trú. |
| Mốc giờ / Khung giờ | Mốc giờ tròn khách chọn (09:00 → 19:00); khung giờ là khoảng từ mốc đó, dài bằng tổng thời lượng dịch vụ (BR-12). |
| Năng lực phục vụ | Số nhân viên spa có ca làm bao phủ khung giờ, trừ phần đã giữ chỗ cho các lịch hẹn khác; quy tắc ở 2.3.3. |
| Ca làm (WorkShift) | Khoảng thời gian một nhân viên spa làm việc trong ngày do quản lý phân lịch (FR-STF-04). |
| Thời gian dọn dẹp (buffer) | Khoảng 15 phút sau mỗi lịch spa để dọn lông, khử trùng; nhân viên chưa nhận lịch mới trong thời gian này. |
| Nhóm kích cỡ (SizeGroup) | Nhỏ / Vừa / Lớn, hệ thống xác định theo BR-19; quyết định giá, thời lượng, chuồng. |
| Vắng mặt (No-show) | Quá 15 phút sau giờ hẹn đã xác nhận mà thú cưng chưa được tiếp nhận (BR-08). |
| Xác nhận chi phí mới | Khách chấp nhận chi phí tăng khi cân nặng thực tế làm tăng nhóm kích cỡ, trong 30 phút (BR-23). |
| Ảnh minh chứng | Ảnh thú cưng trước và sau chăm sóc do nhân viên spa tải lên (BR-20). |
| Webhook / IPN | Lời gọi ngược từ cổng thanh toán về backend để báo kết quả giao dịch. |
| FR / BR / BP / NFR | Yêu cầu chức năng / Quy tắc nghiệp vụ / Quy trình nghiệp vụ / Yêu cầu phi chức năng. |
| UC / SD | Use Case / Sequence Diagram (mã trong tài liệu này). |
| CW / SW / MW | Mã màn hình của web khách hàng / web nhân viên / web quản lý. |
| JWT | JSON Web Token – access token của phiên đăng nhập (Requirements 5.2). |
| Clean Architecture | Kiểu kiến trúc chia backend thành các tầng đồng tâm; mã nguồn chỉ phụ thuộc hướng vào trong, tầng trong (nghiệp vụ) không biết tầng ngoài (framework, cơ sở dữ liệu, dịch vụ ngoài). Chi tiết ở 3.1. |
| Domain / Application / Infrastructure / API | Bốn tầng của backend: Domain (thực thể, quy tắc nghiệp vụ thuần), Application (use case, cổng/interface), Infrastructure (hiện thực kỹ thuật: EF Core, Identity, lưu trữ ảnh, cổng thanh toán, tác vụ nền), API (Controllers, DTO, middleware). |
| Dependency Rule | Quy tắc phụ thuộc: API → Application → Domain; Infrastructure → Application → Domain; Domain không phụ thuộc tầng nào. |
| Port / Adapter | Port là interface do tầng Application định nghĩa (ví dụ truy cập dữ liệu, lưu ảnh, cổng thanh toán); Adapter là lớp hiện thực port nằm ở tầng Infrastructure. |

# II. Phân tích Yêu cầu Hệ thống (System Requirements Analysis)

## 2.1 Mô tả người dùng (User Classes & Characteristics)

Hệ thống có 3 actor người dùng (A-02); nhân viên gồm hai vai trò. Token chỉ chứa Role = Customer | Staff | Manager, vai trò lễ tân/nhân viên spa do backend lấy từ dữ liệu nhân viên (Requirements 5.2).

| Nhóm người dùng | Đặc điểm | Quyền chính | Phạm vi dữ liệu / web |
| --- | --- | --- | --- |
| Khách hàng (có tài khoản) | Chủ sở hữu thú cưng; tự đăng ký, tự đặt lịch trên web khách hàng (giao diện responsive – Đề xuất). | Quản lý thú cưng của mình; đặt, đổi, hủy lịch; xác nhận chi phí mới; xem ảnh; thanh toán trực tuyến (lịch spa). | Chỉ dữ liệu của mình (BR-16). Web khách hàng. |
| Khách vãng lai | Đến trực tiếp, không có tài khoản, không đăng nhập; không nhận thông báo. Không phải người dùng hệ thống. | Được lễ tân ghi nhận, đặt lịch thay. | Bản ghi Customer (UserId = NULL). |
| Lễ tân | Tiếp đón khách tại cửa hàng; không cập nhật tiến độ thực hiện, không phân công (Requirements 3.1). | Ghi nhận khách vãng lai; đặt lịch thay; tiếp nhận, ghi cân nặng; trả thú cưng lưu trú; thu tiền tại quầy; xem chuồng. | Toàn cửa hàng; không cập nhật tiến độ thực hiện. Web nhân viên. |
| Nhân viên spa | Người trực tiếp thực hiện dịch vụ chăm sóc thú cưng. | Cập nhật tiến độ, tải ảnh trước/sau, hoàn tất lịch spa; xem thông báo. | Chỉ lịch hẹn được phân công. Web nhân viên. |
| Quản lý | Người điều hành hoạt động của cửa hàng; quyết định cuối cùng về nhân viên và chuồng (BR-10). | Quản lý danh mục, chuồng, giá, nhân viên; phân lịch làm việc cho nhân viên spa; xác nhận/từ chối; phân công nhân viên, gán chuồng; xử lý đổi/hủy; giám sát; gỡ khóa; theo dõi thanh toán; chỉnh tham số cấu hình. | Toàn cửa hàng. Web quản lý. |
| Hệ thống (tác vụ nền) | Actor không giao diện. | Tính mốc giờ còn chỗ; đề xuất nhân viên; tự hủy vắng mặt; khóa tự đặt lịch; hết hạn xác nhận chi phí; tạo thông báo. | — |
| Cổng thanh toán | Hệ thống ngoài VNPAY/MoMo (sandbox), nằm ngoài trust boundary (D-02). | Gọi webhook báo kết quả giao dịch. | Chỉ tin sau khi xác minh chữ ký. |

## 2.2 Bối cảnh & Luồng nghiệp vụ (Business Process/Workflow)

Hai luồng chính (Requirements 3.3) được vẽ dưới dạng flowchart có phân làn theo vai trò. Quy trình hỗ trợ (BP-01 → BP-03, BP-09 → BP-11) là các thao tác quản lý, thể hiện qua use case ở 2.3.

| BP | Quy trình | Use case |
| --- | --- | --- |
| BP-01 | Quản lý tài khoản | UC-01 → UC-04 |
| BP-02 | Quản lý hồ sơ thú cưng | UC-05 → UC-07 |
| BP-03 | Quản lý danh mục dịch vụ | UC-08, UC-09 |
| BP-04 | Đặt lịch hẹn spa | UC-10, UC-11, UC-22 |
| BP-05 | Xác nhận lịch hẹn spa và phân công | UC-12, UC-13 |
| BP-06 | Thay đổi hoặc hủy lịch hẹn | UC-14, UC-15 |
| BP-07 | Thực hiện dịch vụ | UC-16 → UC-21, UC-30 |
| BP-08 | Thanh toán | UC-23 → UC-25 |
| BP-09 | Quản lý nhân viên | UC-26, UC-35 |
| BP-10 | Thông báo | UC-34 |
| — | Cấu hình hệ thống (bổ sung theo yêu cầu nhóm) | UC-36 |
| BP-11 | Quản lý chuồng và giá lưu trú | UC-27 |
| BP-12 | Lưu trú thú cưng | UC-28, 29, 31, 32, 33 (kèm UC-13, 17, 23, 30) |

Sơ đồ phân làn theo vai trò: Khách hàng / Lễ tân, Hệ thống, Quản lý, Lễ tân, Nhân viên spa. Các bước theo thứ tự:

1. **Khách hàng / Lễ tân:** chọn thú cưng, dịch vụ, mốc giờ (BP-04).
2. **Hệ thống:** kiểm tra mốc giờ còn chỗ (quy tắc 2.3.3). Còn trống không?
   - Hết → quay lại bước 1 để chọn mốc giờ khác.
   - Còn → sang bước 3.
3. **Hệ thống:** tạo lịch hẹn spa ở trạng thái **Chờ xác nhận**.
4. **Hệ thống:** thông báo cho khách hàng (nếu có tài khoản).
5. **Quản lý:** xem lịch hẹn; xem đề xuất nhân viên spa (BP-05). Cửa hàng đáp ứng được không?
   - Không → từ chối → **Đã hủy** (cửa hàng không thể đáp ứng). Kết thúc.
   - Có → xác nhận / điều chỉnh nhân viên spa phụ trách, sang bước 6.
6. **Hệ thống:** lịch hẹn **Đã xác nhận**; thông báo KH + NV spa.
7. **Khách hàng / Lễ tân:** đưa thú cưng đến trong 15 phút sau giờ hẹn?
   - Không → hệ thống tự động **Đã hủy** (vắng mặt, BR-08). Kết thúc.
   - Có → sang bước 8.
8. **Lễ tân:** tiếp nhận thú cưng, ghi nhận cân nặng thực tế → **Đã tiếp nhận** (BP-07).
9. **Hệ thống:** tăng nhóm kích cỡ vượt ngưỡng dung sai không? (BR-23)
   - Có → hệ thống yêu cầu khách xác nhận chi phí mới. Khách xác nhận trong 30 phút?
     - Xác nhận → sang bước 10.
     - Không xác nhận / từ chối → hệ thống tự động **Đã hủy** (lỗi do khách hàng). Kết thúc.
   - Không → sang bước 10.
10. **Nhân viên spa:** chụp ảnh trước (BR-20) → **Đang thực hiện**.
11. **Nhân viên spa:** thực hiện và đánh dấu từng dịch vụ.
12. **Nhân viên spa:** chụp ảnh sau → **Hoàn tất** (BR-06).
13. **Khách hàng / Lễ tân:** thanh toán tại quầy (LT/QL xác nhận) hoặc trực tuyến (BP-08).
14. **Hệ thống:** kiểm tra số tiền khớp (BR-17) → **Đã thanh toán**.
15. **Hệ thống:** thông báo kết quả thanh toán. Kết thúc.

*Hình 2.1 – Luồng nghiệp vụ spa (BP-04 → BP-08)*

Sơ đồ phân làn theo vai trò: Khách hàng / Lễ tân, Hệ thống, Quản lý, Lễ tân. Các bước theo thứ tự:

1. **Khách hàng / Lễ tân:** chọn thú cưng, thời điểm nhận và trả (BP-12).
2. **Hệ thống:** kiểm tra còn chuồng phù hợp trong toàn bộ các đêm; tính tiền tạm tính. Còn chỗ không?
   - Hết → quay lại bước 1.
   - Còn → sang bước 3.
3. **Hệ thống:** tạo lịch hẹn lưu trú ở trạng thái **Chờ xác nhận**.
4. **Quản lý:** xem đề xuất chuồng (BR-21). Còn chuồng phù hợp không?
   - Không → từ chối → **Đã hủy** (cửa hàng không thể đáp ứng). Kết thúc.
   - Có → xác nhận / chọn chuồng khác → **Đã xác nhận**.
5. **Khách hàng / Lễ tân:** thú cưng đến trong 15 phút sau giờ nhận?
   - Không → hệ thống tự động **Đã hủy** (vắng mặt), giải phóng chuồng. Kết thúc.
   - Có → sang bước 6.
6. **Lễ tân:** ghi nhận cân nặng thực tế.
7. **Hệ thống:** tăng nhóm kích cỡ vượt ngưỡng không? (BR-23)
   - Có → hệ thống tính lại chi phí; khách xác nhận trong 30 phút. Chuồng đã gán còn phù hợp không?
     - Còn → sang bước 8.
     - Không → quản lý gán chuồng khác; hết chuồng → từ chối, **Đã hủy**. Sơ đồ nối tiếp sang bước 8.
   - Không → sang bước 8.
8. **Khách hàng / Lễ tân:** thanh toán **tiền lưu trú** tại quầy (BR-07).
9. **Lễ tân:** tiếp nhận → **Đang lưu trú**.
10. **Khách hàng / Lễ tân:** đến đón thú cưng.
11. **Lễ tân:** ghi nhận thời điểm trả thực tế.
12. **Hệ thống:** trễ quá 30 phút không?
    - Có → tính phí phạt trả muộn (BR-22); khách thanh toán **phí phạt** tại quầy; sang bước 13.
    - Không / trả sớm → sang bước 13.
13. **Lễ tân:** trả thú cưng → **Hoàn tất**; giải phóng chuồng. Kết thúc.

*Hình 2.2 – Luồng nghiệp vụ lưu trú (BP-12, BP-08)*

## 2.3 Yêu cầu chức năng (Functional Requirements)

### 2.3.1 Sơ đồ Use Case tổng thể

Sơ đồ gom 36 use case thành 16 nhóm chức năng để dễ đọc; mã UC trong ngoặc trỏ tới danh sách và đặc tả ở 2.3.2 – 2.3.3.

Sơ đồ gom 36 use case thành 16 nhóm chức năng. Các actor trên sơ đồ: **Khách hàng**, **Lễ tân**, **Nhân viên spa**, **Quản lý**, **Hệ thống** (tác vụ tự động) và **Cổng thanh toán** (VNPAY / MoMo). Actor chính của từng use case xem bảng 2.3.2.

| STT | Nhóm chức năng (trên sơ đồ) | Use case |
| --- | --- | --- |
| 1 | Tài khoản & khách vãng lai | UC-01 → UC-04 |
| 2 | Hồ sơ thú cưng | UC-05 → UC-07 |
| 3 | Danh mục dịch vụ | UC-08, UC-09 |
| 4 | Đặt lịch hẹn spa / lưu trú | UC-10, UC-28 |
| 5 | Xem lịch hẹn & lịch sử | UC-11 |
| 6 | Xác nhận, phân công NV spa, gán chuồng, từ chối | UC-12, UC-13, UC-29 |
| 7 | Đổi / hủy lịch hẹn | UC-14, UC-15 |
| 8 | Tiếp nhận (spa, lưu trú), đối chiếu cân nặng, xác nhận chi phí mới | UC-16, UC-17, UC-30, UC-31 |
| 9 | Thực hiện dịch vụ spa, ảnh minh chứng | UC-18 → UC-20 |
| 10 | Hủy vắng mặt, khóa / gỡ khóa quyền tự đặt lịch | UC-21, UC-22 |
| 11 | Thanh toán | UC-23 → UC-25 |
| 12 | Quản lý nhân viên & phân lịch làm việc | UC-26, UC-35 |
| 13 | Quản lý chuồng & giá lưu trú | UC-27 |
| 14 | Trả thú cưng lưu trú, tình trạng chuồng | UC-32, UC-33 |
| 15 | Thông báo | UC-34 |
| 16 | Cấu hình hệ thống | UC-36 |

*Hình 2.3 – Sơ đồ Use Case tổng thể*

### 2.3.2 Danh sách Use Case

| Mã | Tên use case | Actor chính | FR |
| --- | --- | --- | --- |
| UC-01 | Đăng ký tài khoản | Khách hàng | FR-ACC-01 |
| UC-02 | Đăng nhập | Khách hàng, Lễ tân, Nhân viên spa, Quản lý | FR-ACC-02; Requirements 5.2 |
| UC-03 | Cập nhật thông tin cá nhân | Khách hàng | FR-ACC-03 |
| UC-04 | Ghi nhận khách vãng lai | Lễ tân | FR-ACC-04 |
| UC-05 | Tạo hồ sơ thú cưng | Khách hàng | FR-PET-01, FR-PET-04 |
| UC-06 | Xem và cập nhật hồ sơ thú cưng | Khách hàng | FR-PET-02, FR-PET-04 |
| UC-07 | Gỡ bỏ hồ sơ thú cưng | Khách hàng | FR-PET-03 |
| UC-08 | Quản lý danh mục dịch vụ | Quản lý | FR-SVC-01, FR-SVC-02, FR-SVC-03 |
| UC-09 | Xem danh mục dịch vụ | Khách hàng, Lễ tân, Nhân viên spa, Quản lý | FR-SVC-04 |
| UC-10 | Đặt lịch hẹn spa | Khách hàng | FR-BOOK-01, FR-BOOK-02, FR-BOOK-03 |
| UC-11 | Xem lịch hẹn và lịch sử | Khách hàng | FR-BOOK-04, FR-BOOK-05, FR-EXE-01, FR-EXE-06, FR-EXE-08 |
| UC-12 | Xác nhận lịch hẹn spa và phân công nhân viên spa | Quản lý | FR-ASG-01, FR-ASG-02, FR-ASG-03 |
| UC-13 | Từ chối lịch hẹn khi cửa hàng không thể đáp ứng | Quản lý | FR-ASG-04, FR-HTL-06 |
| UC-14 | Khách hàng tự đổi hoặc hủy lịch hẹn | Khách hàng | FR-CHG-01, FR-CHG-02 |
| UC-15 | Quản lý xử lý đổi hoặc hủy lịch hẹn | Quản lý | FR-CHG-03 |
| UC-16 | Tiếp nhận thú cưng (lịch hẹn spa) | Lễ tân | FR-EXE-02 |
| UC-17 | Ghi nhận và đối chiếu cân nặng thực tế | Lễ tân | FR-EXE-10 |
| UC-18 | Thực hiện dịch vụ spa | Nhân viên spa được phân công | FR-EXE-03, FR-EXE-04 |
| UC-19 | Tải lên và xem ảnh minh chứng | Nhân viên spa được phân công | FR-EXE-09 |
| UC-20 | Quản lý cập nhật trực tiếp trạng thái thực hiện | Quản lý | FR-EXE-05 |
| UC-21 | Tự động hủy do vắng mặt và khóa tự đặt lịch | Hệ thống | FR-EXE-07, FR-BOOK-06 |
| UC-22 | Gỡ khóa quyền tự đặt lịch trực tuyến | Quản lý | FR-BOOK-07 |
| UC-23 | Ghi nhận thanh toán tại quầy | Lễ tân, Quản lý | FR-PAY-01, FR-PAY-02 |
| UC-24 | Thanh toán trực tuyến | Khách hàng | FR-PAY-03, FR-PAY-01 |
| UC-25 | Theo dõi tình hình thanh toán | Quản lý | FR-PAY-04 |
| UC-26 | Quản lý nhân viên | Quản lý | FR-STF-01, FR-STF-02, FR-STF-03 |
| UC-27 | Quản lý chuồng và giá lưu trú | Quản lý | FR-HTL-01, FR-HTL-02, FR-HTL-03 |
| UC-28 | Đặt lịch hẹn lưu trú | Khách hàng | FR-HTL-04 |
| UC-29 | Gán chuồng và xác nhận lịch hẹn lưu trú | Quản lý | FR-HTL-05 |
| UC-30 | Xác nhận chi phí mới | Khách hàng | FR-EXE-11, FR-NOT-06 |
| UC-31 | Tiếp nhận thú cưng lưu trú | Lễ tân | FR-HTL-07 |
| UC-32 | Trả thú cưng lưu trú | Lễ tân | FR-HTL-09 |
| UC-33 | Xem tình trạng chuồng | Lễ tân, Quản lý | FR-HTL-08 |
| UC-34 | Nhận thông báo | Khách hàng có tài khoản | FR-NOT-01 → FR-NOT-05 (FR-NOT-06 qua UC-30) |
| UC-35 | Quản lý phân lịch làm việc (ca làm) cho nhân viên spa | Quản lý | FR-STF-04 (bổ sung theo yêu cầu của nhóm) |
| UC-36 | Quản lý cấu hình tham số hệ thống | Quản lý | FR-CFG-01 (bổ sung theo yêu cầu của nhóm) |

**Phủ FR:** 59 FR của Requirements được ánh xạ trực tiếp vào UC ở bảng trên; hai FR bổ sung theo yêu cầu của nhóm là FR-STF-04 (UC-35) và FR-CFG-01 (UC-36). Hai FR xuyên suốt không thành UC riêng: **FR-LFC-01** (kiểm soát chuyển trạng thái) áp dụng cho mọi UC làm đổi trạng thái lịch hẹn (UC-10 → UC-21, UC-28 → UC-32) và **FR-LFC-02** (kiểm soát trạng thái thanh toán) áp dụng cho UC-23, UC-24, UC-31, UC-32. Hai FR này được hiện thực bằng máy trạng thái ở mục 5.4.

### 2.3.3 Quy tắc khung giờ và giữ chỗ nhân sự

Quy tắc theo yêu cầu của nhóm (X-06, X-11); công thức tính ở dưới do tài liệu này đề xuất để hiện thực. **Lưu ý:** nó thay BR-13 và A-07 của Requirements v2, vì mốc giờ còn chỗ nay phụ thuộc dịch vụ và thú cưng đã chọn. Cần cập nhật lại Requirements ở các mục còn nêu năng lực phục vụ chung không phân biệt dịch vụ hoặc 1 nhân viên phụ trách: thuật ngữ “Khung giờ”, “Năng lực phục vụ”, “Lịch hẹn”; BP-04; BR-13; FR-BOOK-02; A-07.

| Thông số | Quy tắc |
| --- | --- |
| **Mốc giờ hiển thị** | Sáng: 09:00, 10:00, 11:00 · Trưa: 12:00, 13:00, 14:00 · Chiều/tối: 15:00, 16:00, 17:00, 18:00, 19:00. Lưu trong cấu hình Booking.SlotTimes. |
| **Mốc bắt đầu muộn nhất** | Mỗi dịch vụ có một mốc: cắt tỉa tối đa 18:00; chỉ tắm / vệ sinh nhẹ tối đa 19:00. Lịch gồm nhiều dịch vụ lấy mốc sớm nhất, nên combo cắt tỉa + tắm chỉ chọn được đến 18:00. |
| **Thời lượng d** | Tổng thời lượng các dịch vụ đã chọn, tra theo loài và nhóm kích cỡ (BR-12). |
| **Số nhân viên cần n** | Lớn nhất của “số nhân viên” các dịch vụ đã chọn (cấu hình theo loài và nhóm kích cỡ, ví dụ chó nhóm Lớn: 2); tối thiểu 2 nếu thú cưng có tính cách Khó tính/dữ. |
| **Thời gian giữ chỗ** | Từ giờ bắt đầu s đến s + d + dọn dẹp. Dọn dẹp mặc định 15 phút, chỉnh trong khoảng 15–20 phút (Booking.BufferMinutes). |

**Mốc giờ s còn chỗ khi** thỏa cả hai điều kiện: (1) s không muộn hơn mốc bắt đầu muộn nhất của mọi dịch vụ đã chọn; (2) **E − Tải đỉnh ≥ n**, trong đó E là số nhân viên spa đang hoạt động có ca làm bao phủ trọn khoảng giữ chỗ [s, s + d + dọn dẹp), và Tải đỉnh là tổng số nhân viên cần lớn nhất tại một thời điểm trong khoảng đó của các lịch hẹn đang giữ chỗ (Chờ xác nhận, Đã xác nhận, Đã tiếp nhận, Đang thực hiện). Khoảng giữ chỗ của lịch khác được tính cả thời gian dọn dẹp. Mốc không đạt hiển thị “Đã kín” (hoặc “không nhận dịch vụ ở mốc này”).

Cách tính này giữ chỗ theo số lượng nhân viên, chưa gắn tên người (quản lý gắn tên khi xác nhận) và thận trọng: chỉ đếm nhân viên có ca phủ trọn khoảng giữ chỗ nên không nhận quá số người thực có.

| Ví dụ | Kết quả |
| --- | --- |
| Combo cắt tỉa + tắm: 1 nhân viên, 2 giờ. Khách chọn 09:00. | Giữ 1 nhân viên từ 09:00 đến 11:00, cộng dọn dẹp đến 11:15. Tiệm có 3 nhân viên và cả 3 đã có khách từ 09:00 thì 10:00 hiển thị “Đã kín”; 11:00 vẫn kín vì còn dọn dẹp; 12:00 còn chỗ (nhân viên rảnh lại từ 11:15, mốc hiển thị gần nhất là 12:00). |
| Chó lớn (Alaska, Golden) hoặc khó tính: 2 nhân viên, 3 giờ. Khách chọn 09:00. | Trừ 2 nhân viên từ 09:00 đến 12:00, cộng dọn dẹp đến 12:15. Mốc 09:00 chỉ còn chỗ khi có ít nhất 2 nhân viên khả dụng. |
| Combo cắt tỉa + tắm, khách chọn 19:00. | Không nhận (mốc bắt đầu muộn nhất của cắt tỉa là 18:00). Mốc 19:00 chỉ hiển thị còn chỗ với lịch chỉ gồm tắm / vệ sinh nhẹ. |

**Đề xuất nhân viên khi quản lý xác nhận (FR-ASG-01).** Hệ thống lọc nhân viên spa đang hoạt động theo ba tiêu chí lần lượt: (1) có ca làm bao phủ khung giờ giữ chỗ; (2) lúc đó chưa có lịch; (3) trong số đó, ít lịch được phân công nhất trong 30 ngày gần nhất. Hệ thống lấy đủ n người đầu danh sách. Quản lý chỉ cần bấm xác nhận, hoặc tự đổi sang nhân viên khác (đủ n người; không được trùng lịch; chọn người ngoài ca làm thì có cảnh báo).

### 2.3.4 Đặc tả Use Case chi tiết

#### UC-01 – Đăng ký tài khoản

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (web khách hàng) |
| Tham chiếu | FR-ACC-01; BR-01 |
| Tiền điều kiện | Người dùng chưa có tài khoản. |
| Hậu điều kiện | Tạo AppUser (Role = Customer) và Customer; khách hàng có thể đăng nhập. |
| Luồng cơ bản | 1. Nhập họ tên, thông tin liên hệ và thông tin xác thực.<br>2. Hệ thống kiểm tra tính hợp lệ và thông tin liên hệ chưa được dùng.<br>3. Hệ thống tạo tài khoản; vai trò luôn là Customer, không nhận từ client.<br>4. Hệ thống cho phép đăng nhập. |
| Luồng ngoại lệ | Thông tin liên hệ đã dùng cho tài khoản khác → từ chối, báo trùng.<br>Thông tin không hợp lệ → từ chối, nêu lý do.<br>Vượt giới hạn rate limiting → từ chối (429). |

#### UC-02 – Đăng nhập

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng, Lễ tân, Nhân viên spa, Quản lý |
| Tham chiếu | FR-ACC-02; Requirements 5.2 |
| Tiền điều kiện | Tài khoản tồn tại và đang hoạt động (IsActive = true). |
| Hậu điều kiện | Phiên hợp lệ: access token (UserId, Role) và refresh token (lưu dạng băm). |
| Luồng cơ bản | 1. Nhập thông tin xác thực.<br>2. Backend xác thực bằng ASP.NET Core Identity.<br>3. Backend cấp access token JWT thời hạn ngắn và refresh token.<br>4. Web điều hướng vào màn hình đúng vai trò. |
| Luồng ngoại lệ | Sai thông tin xác thực → từ chối, báo lỗi; ghi log đăng nhập thất bại (không ghi mật khẩu).<br>Tài khoản bị vô hiệu hóa → từ chối đăng nhập và làm mới token.<br>Vượt giới hạn rate limiting → từ chối (429). |

#### UC-03 – Cập nhật thông tin cá nhân

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (các vai trò khác dùng cùng chức năng theo ma trận 5.1) |
| Tham chiếu | FR-ACC-03; BR-16 |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Thông tin cá nhân của chính tài khoản được lưu. |
| Luồng cơ bản | 1. Mở trang hồ sơ cá nhân; hệ thống lấy tài khoản từ token, không từ tham số client.<br>2. Chỉnh sửa và lưu.<br>3. Hệ thống kiểm tra hợp lệ (liên hệ không trùng) và lưu. |
| Luồng ngoại lệ | Yêu cầu nhắm đến tài khoản khác → từ chối (BR-16).<br>Thông tin liên hệ trùng → từ chối. |

#### UC-04 – Ghi nhận khách vãng lai

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân (web nhân viên) |
| Tham chiếu | FR-ACC-04; BR-01 |
| Tiền điều kiện | Lễ tân đã đăng nhập; khách đến trực tiếp và chưa có tài khoản. |
| Hậu điều kiện | Có bản ghi Customer (UserId = NULL), không có thông tin đăng nhập. |
| Luồng cơ bản | 1. Tìm khách theo thông tin liên hệ.<br>2. Chưa có → nhập họ tên, thông tin liên hệ.<br>3. Hệ thống lưu khách vãng lai.<br>4. Chuyển sang tạo hồ sơ thú cưng hoặc đặt lịch thay. |
| Luồng ngoại lệ | Thông tin liên hệ đã thuộc khách hiện có → từ chối tạo trùng, yêu cầu chọn khách hiện có. |

#### UC-05 – Tạo hồ sơ thú cưng

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (thú cưng của mình); Lễ tân (thay khách) |
| Tham chiếu | FR-PET-01, FR-PET-04; BR-01, BR-02, BR-19 |
| Tiền điều kiện | Khách hàng đã đăng nhập; hoặc lễ tân đã chọn/ghi nhận khách hàng (UC-04). |
| Hậu điều kiện | Pet được lưu, gắn khách hàng, có SizeGroup do hệ thống xác định. |
| Luồng cơ bản | 1. Nhập tên, loài (chó, mèo, thỏ, chuột lang), giống, tính cách (hiền / bình thường / khó tính-dữ), cân nặng, chiều cao (bắt buộc với chó), đặc điểm lông, ghi chú.<br>2. Hệ thống kiểm tra bắt buộc và loài được phục vụ.<br>3. Hệ thống xác định nhóm kích cỡ theo bảng mốc BR-19 (chó: lấy nhóm cao hơn giữa cân nặng và chiều cao); bỏ qua nhóm do client gửi.<br>4. Lưu hồ sơ. |
| Luồng ngoại lệ | Thiếu tên, loài, giống, cân nặng (hoặc chiều cao với chó) → từ chối.<br>Loài không thuộc 4 loài phục vụ → từ chối. |

#### UC-06 – Xem và cập nhật hồ sơ thú cưng

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (của mình); Lễ tân (kể cả cập nhật cân nặng khi tiếp nhận); Nhân viên spa (chỉ xem, lịch hẹn được phân công); Quản lý (chỉ xem) |
| Tham chiếu | FR-PET-02, FR-PET-04; BR-16, BR-19 |
| Tiền điều kiện | Đã đăng nhập; hồ sơ nằm trong phạm vi của actor. |
| Hậu điều kiện | Thay đổi (nếu có) được lưu; nhóm kích cỡ được xác định lại khi đổi cân nặng/chiều cao. |
| Luồng cơ bản | 1. Mở hồ sơ thú cưng.<br>2. Backend kiểm tra quyền sở hữu/phạm vi theo vai trò.<br>3. Hiển thị hồ sơ; khách hàng/lễ tân chỉnh sửa và lưu.<br>4. Hệ thống xác định lại nhóm kích cỡ. |
| Luồng ngoại lệ | Hồ sơ ngoài phạm vi (của khách khác; lịch hẹn không được phân công) → từ chối.<br>Nhân viên spa hoặc quản lý cố cập nhật → từ chối. |

#### UC-07 – Gỡ bỏ hồ sơ thú cưng

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng |
| Tham chiếu | FR-PET-03; BR-16, BR-25 |
| Tiền điều kiện | Hồ sơ thuộc sở hữu của khách hàng đang đăng nhập. |
| Hậu điều kiện | Hồ sơ bị xóa hẳn, hoặc chuyển ngừng hoạt động (IsActive = false) và ẩn khỏi giao diện khách hàng. |
| Luồng cơ bản | 1. Chọn gỡ bỏ và xác nhận.<br>2. Backend kiểm tra quyền sở hữu.<br>3. Chưa từng có lịch hẹn → xóa hẳn; đã có lịch hẹn → xóa mềm, giữ dữ liệu cho các lịch hẹn liên quan. |
| Luồng ngoại lệ | Hồ sơ không thuộc sở hữu → từ chối. |

#### UC-08 – Quản lý danh mục dịch vụ

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-SVC-01, FR-SVC-02, FR-SVC-03; BR-11, BR-12, BR-13, BR-19 |
| Tiền điều kiện | Quản lý đã đăng nhập. |
| Hậu điều kiện | Danh mục dịch vụ được cập nhật. |
| Luồng cơ bản | 1. Thêm/sửa dịch vụ: tên, mô tả, mốc giờ bắt đầu muộn nhất (ví dụ cắt tỉa 18:00; tắm / vệ sinh nhẹ 19:00), loài áp dụng; với từng nhóm kích cỡ của loài đó: giá, thời lượng dự kiến và số nhân viên cần (1 hoặc 2).<br>2. Hoặc chọn ngừng cung cấp dịch vụ.<br>3. Hệ thống kiểm tra và lưu. |
| Luồng ngoại lệ | Thiếu giá, thời lượng hoặc số nhân viên cho một nhóm kích cỡ của loài áp dụng; mốc giờ muộn nhất không thuộc danh sách mốc giờ → từ chối.<br>Người dùng không phải quản lý → từ chối. |

#### UC-09 – Xem danh mục dịch vụ

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng, Lễ tân, Nhân viên spa, Quản lý |
| Tham chiếu | FR-SVC-04; BR-11, BR-12 |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Không thay đổi dữ liệu. |
| Luồng cơ bản | 1. Mở danh mục dịch vụ.<br>2. Hệ thống hiển thị dịch vụ đang cung cấp kèm giá và thời lượng theo loài và nhóm kích cỡ. |
| Luồng ngoại lệ | Không có dịch vụ cho loài/nhóm được chọn → hiển thị trạng thái rỗng. |

#### UC-10 – Đặt lịch hẹn spa

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (thú cưng của mình); Lễ tân (thay khách đến trực tiếp) |
| Tham chiếu | FR-BOOK-01, FR-BOOK-02, FR-BOOK-03; BR-01, BR-02, BR-10, BR-11, BR-12, BR-13, BR-15, BR-18; quy tắc 2.3.3 |
| Tiền điều kiện | Khách tự đặt: đã đăng nhập, có hồ sơ thú cưng hợp lệ, tài khoản không bị khóa tự đặt lịch. Lễ tân đặt thay: đã chọn khách (có tài khoản hoặc vãng lai) và thú cưng (BR-15 không áp dụng). |
| Hậu điều kiện | Tạo lịch hẹn spa ở trạng thái “Chờ xác nhận”; thông báo khách có tài khoản (UC-34). |
| Luồng cơ bản | 1. Chọn thú cưng; hệ thống chỉ hiện dịch vụ áp dụng cho loài, kèm giá theo nhóm kích cỡ.<br>2. Chọn một hoặc nhiều dịch vụ; hệ thống tính thời lượng, số nhân viên cần và mốc bắt đầu muộn nhất (2.3.3).<br>3. Chọn ngày; hệ thống hiển thị các mốc giờ tròn 09:00 – 19:00 chia Sáng / Trưa / Chiều-tối, mỗi mốc là còn chỗ, đã kín hoặc không nhận dịch vụ ở mốc đó.<br>4. Chọn mốc giờ và gửi yêu cầu (không chọn nhân viên – BR-10).<br>5. Backend kiểm tra lại quyền, khóa đặt lịch và số nhân viên khả dụng trong một giao dịch (BR-18), rồi tạo lịch hẹn và giữ chỗ nhân sự cho cả thời lượng cộng thời gian dọn dẹp. |
| Luồng ngoại lệ | Tự đặt khi bị khóa (BR-15) → từ chối, hướng dẫn liên hệ hotline.<br>Mốc giờ đã kín (kể cả do đặt đồng thời) → từ chối, yêu cầu chọn mốc khác.<br>Mốc giờ muộn hơn mốc bắt đầu muộn nhất của một dịch vụ đã chọn → không cho chọn.<br>Dịch vụ không áp dụng cho loài của thú cưng → không cho chọn. |

#### UC-11 – Xem lịch hẹn và lịch sử

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (của mình); Lễ tân, Quản lý (toàn cửa hàng); Nhân viên spa (được phân công) |
| Tham chiếu | FR-BOOK-04, FR-BOOK-05, FR-EXE-01, FR-EXE-06, FR-EXE-08; BR-16 |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Không thay đổi dữ liệu. |
| Luồng cơ bản | 1. Mở danh sách lịch hẹn; backend lọc theo phạm vi của vai trò.<br>2. Hiển thị trạng thái hiện tại của từng lịch hẹn (spa và lưu trú).<br>3. Mở chi tiết; backend kiểm tra phạm vi theo id.<br>4. Xem lịch sử: khách hàng – lịch hẹn đã hoàn tất của thú cưng mình; nhân viên spa – công việc đã thực hiện; quản lý – tổng quan tiến độ toàn cửa hàng. |
| Luồng ngoại lệ | Truy cập lịch hẹn/thú cưng ngoài phạm vi (kể cả bằng id) → từ chối, không trả thông tin. |

#### UC-12 – Xác nhận lịch hẹn spa và phân công nhân viên spa

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý; Hệ thống (đề xuất nhân viên) |
| Tham chiếu | FR-ASG-01, FR-ASG-02, FR-ASG-03; BR-03, BR-04, BR-10, BR-12, BR-13, BR-18, BR-26 |
| Tiền điều kiện | Lịch hẹn spa ở trạng thái “Chờ xác nhận” (mới tạo, khách đã thay đổi hoặc nhân viên được phân công bị vô hiệu hóa). |
| Hậu điều kiện | Lịch hẹn “Đã xác nhận” kèm các nhân viên spa được phân công (đủ số cần); khách có tài khoản và các nhân viên được thông báo. |
| Luồng cơ bản | 1. Quản lý mở lịch hẹn; hệ thống đề xuất đủ số nhân viên cần: nhân viên spa đang hoạt động, có ca làm bao phủ từ giờ bắt đầu đến hết thời gian dọn dẹp, chưa có lịch trùng; xếp theo số lịch được phân công trong 30 ngày gần nhất từ ít đến nhiều (2.3.3).<br>2. Quản lý bấm xác nhận đề xuất, hoặc tự đổi sang nhân viên khác (đủ số người cần).<br>3. Backend kiểm tra không trùng khung giờ (kể cả dọn dẹp) trong giao dịch (BR-04, BR-18).<br>4. Chuyển “Đã xác nhận”; nếu lịch từng do khách thay đổi thì tính lại số tiền (BR-26). |
| Luồng ngoại lệ | Có nhân viên đã có lịch trùng khung giờ → từ chối, báo xung đột.<br>Số nhân viên chọn khác số cần → từ chối.<br>Nhân viên chọn tay nằm ngoài ca làm → cảnh báo, chỉ lưu khi quản lý xác nhận lại.<br>Không còn nhân viên phù hợp → quản lý từ chối lịch hẹn (UC-13).<br>Lịch hẹn không còn “Chờ xác nhận” → từ chối. |

#### UC-13 – Từ chối lịch hẹn khi cửa hàng không thể đáp ứng

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-ASG-04, FR-HTL-06; BR-03 |
| Tiền điều kiện | Lịch hẹn (spa hoặc lưu trú) ở trạng thái “Chờ xác nhận”. |
| Hậu điều kiện | Lịch hẹn “Đã hủy”, lý do “cửa hàng không thể đáp ứng”; các bên được thông báo. |
| Luồng cơ bản | 1. Quản lý chọn từ chối lịch hẹn.<br>2. Hệ thống chuyển “Đã hủy” với lý do StoreUnable, giải phóng phân công/chuồng.<br>3. Hệ thống thông báo (UC-34). |
| Luồng ngoại lệ | Lịch hẹn không ở “Chờ xác nhận” → từ chối. |

#### UC-14 – Khách hàng tự đổi hoặc hủy lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng; Hệ thống |
| Tham chiếu | FR-CHG-01, FR-CHG-02; BR-02, BR-08, BR-13, BR-14, BR-16, BR-21, BR-26 |
| Tiền điều kiện | Lịch hẹn của chính khách hàng, chưa hoàn tất/chưa hủy, còn trong hạn tự phục vụ trước giờ hẹn (BR-08). |
| Hậu điều kiện | Đổi: lịch hẹn về “Chờ xác nhận”. Hủy: “Đã hủy”, lý do “Khách hàng chủ động hủy”. |
| Luồng cơ bản | 1. Mở chi tiết lịch hẹn; backend kiểm tra quyền sở hữu và thời hạn.<br>2. Đổi khung giờ (spa) / thời điểm nhận-trả (lưu trú), thú cưng, dịch vụ: hệ thống kiểm tra khung giờ/chuồng còn khả dụng, thú cưng thuộc khách, dịch vụ áp dụng cho loài; lịch về “Chờ xác nhận” để quản lý duyệt (BR-26).<br>3. Hoặc hủy miễn phí.<br>4. Hệ thống thông báo (UC-34). |
| Luồng ngoại lệ | Quá mốc tự phục vụ → khóa chức năng, hướng dẫn liên hệ hotline (FR-CHG-02).<br>Lịch hẹn không thuộc sở hữu → từ chối.<br>Khung giờ/thời điểm mới không còn khả dụng → từ chối. |

#### UC-15 – Quản lý xử lý đổi hoặc hủy lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-CHG-03; BR-04, BR-08, BR-13, BR-14, BR-21, BR-24 |
| Tiền điều kiện | Lịch hẹn (spa hoặc lưu trú) chưa hoàn tất, chưa hủy; cửa hàng không thể đáp ứng hoặc khách yêu cầu ngoài hạn tự phục vụ. |
| Hậu điều kiện | Lịch hẹn được đổi hoặc “Đã hủy” kèm lý do; các bên được thông báo. |
| Luồng cơ bản | 1. Quản lý mở lịch hẹn và chọn đổi (khung giờ, nhân viên spa, ngày lưu trú/chuồng) hoặc hủy.<br>2. Khi đổi, hệ thống vẫn kiểm tra BR-13, BR-04, BR-21.<br>3. Khi hủy, quản lý chọn lý do: cửa hàng không thể đáp ứng, hoặc theo yêu cầu khách ngoài hạn.<br>4. Hệ thống cập nhật và thông báo (UC-34). |
| Luồng ngoại lệ | Vi phạm năng lực/trùng nhân viên/trùng chuồng → từ chối, báo xung đột.<br>Chuyển trạng thái sai trình tự → từ chối.<br>Hoàn tiền xử lý ngoài hệ thống (BR-24). |

#### UC-16 – Tiếp nhận thú cưng (lịch hẹn spa)

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân (quản lý khi cần) |
| Tham chiếu | FR-EXE-02; BR-05, BR-08 |
| Tiền điều kiện | Lịch spa “Đã xác nhận”, có nhân viên được phân công; khách đưa thú cưng đến, chưa quá 15 phút sau giờ hẹn. |
| Hậu điều kiện | Lịch hẹn “Đã tiếp nhận”, đã ghi nhận cân nặng thực tế. |
| Luồng cơ bản | 1. Lễ tân mở lịch hẹn và nhập cân nặng thực tế (UC-17).<br>2. Xác nhận tiếp nhận.<br>3. Hệ thống chuyển “Đã tiếp nhận” và thông báo khách (UC-34). |
| Luồng ngoại lệ | Quá 15 phút → lịch đã bị tự động hủy do vắng mặt (UC-21).<br>Lịch hẹn không ở “Đã xác nhận” hoặc người thao tác không phải lễ tân/quản lý → từ chối. |

#### UC-17 – Ghi nhận và đối chiếu cân nặng thực tế

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân (quản lý khi cần); Hệ thống |
| Tham chiếu | FR-EXE-10; BR-05, BR-19, BR-21, BR-23 |
| Tiền điều kiện | Spa: “Đã tiếp nhận”, chưa “Đang thực hiện”. Lưu trú: “Đã xác nhận”, thú cưng đã đến, chưa thu tiền lưu trú. |
| Hậu điều kiện | Cân nặng được ghi nhận; chi phí/nhóm kích cỡ cập nhật theo kết quả đối chiếu. |
| Luồng cơ bản | 1. Lễ tân nhập cân nặng thực tế.<br>2. Hệ thống đối chiếu với hồ sơ: (a) nhẹ hơn → ghi nhận, xuống nhóm nhỏ hơn thì giảm chi phí; (b) nặng hơn trong ngưỡng dung sai, hoặc vượt ngưỡng nhưng cùng nhóm → chỉ ghi nhận, chi phí không đổi; (c) nặng hơn, vượt ngưỡng và sang nhóm lớn hơn → tính lại chi phí, tạo yêu cầu xác nhận (UC-30), trạng thái lịch hẹn giữ nguyên.<br>3. Cập nhật hồ sơ thú cưng (trường hợp (c): sau khi khách xác nhận).<br>4. Lưu trú: kiểm tra chuồng đã gán còn phù hợp nhóm mới. |
| Luồng ngoại lệ | Lưu trú, chuồng không còn phù hợp → quản lý gán chuồng khác (UC-29).<br>Lưu trú, hết chuồng phù hợp → thông báo khách; quản lý từ chối, hủy với lý do “cửa hàng không thể đáp ứng” (UC-13). |

#### UC-18 – Thực hiện dịch vụ spa

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên spa được phân công (quản lý khi cần) |
| Tham chiếu | FR-EXE-03, FR-EXE-04; BR-05, BR-06, BR-20, BR-23 |
| Tiền điều kiện | Lịch spa “Đã tiếp nhận” hoặc “Đang thực hiện”; người thao tác là nhân viên được phân công (hoặc quản lý). |
| Hậu điều kiện | Lịch hẹn “Đang thực hiện” hoặc “Hoàn tất”; khoản thanh toán spa được hình thành khi hoàn tất. |
| Luồng cơ bản | 1. Tải ảnh trước (UC-19).<br>2. Chuyển “Đang thực hiện” khi ảnh trước hợp lệ và không chờ xác nhận chi phí.<br>3. Đánh dấu từng dịch vụ đã xong, có thể kèm ghi chú.<br>4. Tải ảnh sau (UC-19).<br>5. Chuyển “Hoàn tất” khi mọi dịch vụ đã xong và có ảnh sau; thông báo khách (UC-34). |
| Luồng ngoại lệ | Chưa có ảnh trước hợp lệ hoặc đang chờ xác nhận chi phí mới → chặn chuyển “Đang thực hiện”.<br>Còn dịch vụ chưa xong hoặc chưa có ảnh sau → chặn “Hoàn tất”.<br>Người thao tác không được phân công (và không phải quản lý) → từ chối. |

#### UC-19 – Tải lên và xem ảnh minh chứng

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên spa được phân công (tải lên, xem); Khách hàng, Quản lý (xem) |
| Tham chiếu | FR-EXE-09; BR-16, BR-20 |
| Tiền điều kiện | Spa “Đã tiếp nhận” (ảnh trước) hoặc “Đang thực hiện” (ảnh sau). |
| Hậu điều kiện | Ảnh được lưu gắn lịch hẹn, phân biệt trước/sau; người có quyền xem được ảnh. |
| Luồng cơ bản | 1. Nhân viên chọn loại ảnh (trước/sau) và tải lên.<br>2. Backend kiểm tra quyền được phân công, lưu ảnh vào kho lưu trữ và bản ghi AppointmentPhoto.<br>3. Khi xem, backend kiểm tra phạm vi rồi trả ảnh. |
| Luồng ngoại lệ | Người tải lên không phải nhân viên được phân công → từ chối.<br>Xem ngoài phạm vi (BR-16) → từ chối.<br>Ảnh trước không phải ảnh gần nhất của thú cưng hoặc quá 7 ngày → không hợp lệ, không cho “Đang thực hiện”. |

#### UC-20 – Quản lý cập nhật trực tiếp trạng thái thực hiện

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-EXE-05; BR-05, BR-06, BR-20 |
| Tiền điều kiện | Lịch hẹn đang trong vòng đời; quản lý đã đăng nhập. |
| Hậu điều kiện | Trạng thái lịch hẹn chuyển sang bước kế tiếp hợp lệ. |
| Luồng cơ bản | 1. Quản lý mở lịch hẹn và chọn bước kế tiếp.<br>2. Hệ thống kiểm tra đúng trình tự (FR-LFC-01) và, với lịch spa, BR-06, BR-20.<br>3. Cập nhật trạng thái và thông báo (UC-34). |
| Luồng ngoại lệ | Sai trình tự → từ chối.<br>Thiếu ảnh trước/sau hoặc dịch vụ chưa xong → chặn như UC-18. |

#### UC-21 – Tự động hủy do vắng mặt và khóa tự đặt lịch

| Mục | Nội dung |
| --- | --- |
| Actor | Hệ thống (tác vụ nền) |
| Tham chiếu | FR-EXE-07, FR-BOOK-06; BR-08, BR-15 |
| Tiền điều kiện | Lịch hẹn (spa hoặc lưu trú) “Đã xác nhận” nhưng chưa được tiếp nhận; quá 15 phút kể từ giờ hẹn. |
| Hậu điều kiện | Lịch hẹn “Đã hủy” (vắng mặt); lưu trú giải phóng chuồng; tài khoản bị khóa nếu vượt ngưỡng. |
| Luồng cơ bản | 1. Tác vụ nền quét định kỳ các lịch hẹn quá hạn giữ chỗ.<br>2. Chuyển “Đã hủy” với lý do NoShow; thông báo (UC-34).<br>3. Đếm số lần vắng mặt của khách trong 30 ngày gần nhất.<br>4. Nếu quá 3 lần → đặt IsBookingLocked = true. |
| Luồng ngoại lệ | Lịch hẹn đã được tiếp nhận kịp → bỏ qua.<br>Tác vụ chạy lặp không được xử lý trùng một lịch hẹn. |

#### UC-22 – Gỡ khóa quyền tự đặt lịch trực tuyến

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-BOOK-07; BR-15 |
| Tiền điều kiện | Khách hàng đang bị khóa và đã liên hệ trực tiếp (hotline). |
| Hậu điều kiện | Khách hàng được tự đặt lịch trực tuyến trở lại. |
| Luồng cơ bản | 1. Quản lý xem danh sách khách bị khóa.<br>2. Chọn khách và gỡ khóa.<br>3. Hệ thống đặt IsBookingLocked = false. |
| Luồng ngoại lệ | Khách hàng không ở trạng thái bị khóa → không có thao tác gỡ. |

#### UC-23 – Ghi nhận thanh toán tại quầy

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân, Quản lý |
| Tham chiếu | FR-PAY-01, FR-PAY-02; BR-07, BR-09, BR-11, BR-17, BR-22 |
| Tiền điều kiện | Khoản thanh toán “Chưa thanh toán” và đúng thời điểm: spa – lịch “Hoàn tất”; lưu trú – tiền lưu trú khi “Đã xác nhận” (và không chờ xác nhận chi phí mới – FR-EXE-10), phí phạt khi “Đang lưu trú”. |
| Hậu điều kiện | Khoản thanh toán “Đã thanh toán”; khách có tài khoản được thông báo. |
| Luồng cơ bản | 1. Mở khoản thanh toán; hệ thống hiển thị số tiền do hệ thống xác định (FR-PAY-01).<br>2. Chọn tiền mặt hoặc chuyển khoản QR; nhập số tiền thực nhận.<br>3. Backend kiểm tra thời điểm và số tiền thực nhận không thấp hơn số tiền phải trả (BR-17).<br>4. Chuyển “Đã thanh toán”, lưu người xác nhận. |
| Luồng ngoại lệ | Số tiền thấp hơn yêu cầu → từ chối chuyển trạng thái.<br>Sai thời điểm theo BR-07 → từ chối.<br>Tiền lưu trú khi lịch đang chờ khách xác nhận chi phí mới → từ chối (FR-EXE-10). |

#### UC-24 – Thanh toán trực tuyến

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng; Cổng thanh toán (VNPAY/MoMo – sandbox) |
| Tham chiếu | FR-PAY-03, FR-PAY-01; BR-07, BR-09, BR-11, BR-16, BR-17 |
| Tiền điều kiện | Lịch spa “Hoàn tất”, khoản thanh toán “Chưa thanh toán”, thuộc sở hữu khách đang đăng nhập. |
| Hậu điều kiện | Khoản thanh toán “Đã thanh toán” (Online); khách được thông báo. |
| Luồng cơ bản | 1. Khách chọn cổng thanh toán.<br>2. Backend xác định số tiền, tạo giao dịch và gửi yêu cầu sang cổng.<br>3. Khách được chuyển sang cổng để thanh toán.<br>4. Cổng gọi webhook về backend; backend xác minh chữ ký và đối chiếu số tiền.<br>5. Hợp lệ và đủ tiền → chuyển “Đã thanh toán”. |
| Luồng ngoại lệ | Lịch hẹn không thuộc sở hữu hoặc là lịch lưu trú (chỉ thanh toán tại quầy) → từ chối.<br>Chữ ký webhook không hợp lệ → từ chối, ghi log, không cập nhật.<br>Số tiền cổng xác nhận không khớp đủ → không chuyển “Đã thanh toán”.<br>Webhook lặp (cùng TxnRef) → bỏ qua. |

#### UC-25 – Theo dõi tình hình thanh toán

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý (toàn cửa hàng); Khách hàng, Lễ tân, Nhân viên spa (một lịch hẹn trong phạm vi) |
| Tham chiếu | FR-PAY-04; BR-16 |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Không thay đổi dữ liệu. |
| Luồng cơ bản | 1. Mở danh sách thanh toán hoặc chi tiết thanh toán của một lịch hẹn.<br>2. Hệ thống hiển thị trạng thái “Đã/Chưa thanh toán”; lịch lưu trú hiển thị từng khoản (tiền lưu trú, phí phạt). |
| Luồng ngoại lệ | Lịch hẹn ngoài phạm vi vai trò → từ chối. |

#### UC-26 – Quản lý nhân viên

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-STF-01, FR-STF-02, FR-STF-03; BR-14, BR-27 |
| Tiền điều kiện | Quản lý đã đăng nhập. |
| Hậu điều kiện | Hồ sơ/tài khoản nhân viên được tạo, cập nhật hoặc vô hiệu hóa. |
| Luồng cơ bản | 1. Tạo nhân viên: thông tin, vai trò (lễ tân hoặc nhân viên spa); hệ thống tạo AppUser Role = Staff.<br>2. Cập nhật thông tin, vai trò.<br>3. Vô hiệu hóa: IsActive = false, thu hồi refresh token, mất quyền đăng nhập ngay.<br>4. Nhân viên spa bị vô hiệu hóa: lịch spa “Đã xác nhận” có họ quay về “Chờ xác nhận”, toàn bộ phân công của lịch đó bị xóa, khách được thông báo (UC-34). |
| Luồng ngoại lệ | Nhân viên là người rảnh cuối cùng trong khung giờ → quản lý từ chối lịch hẹn (UC-13).<br>Không có chức năng tạo tài khoản quản lý qua giao diện (R-02). |

#### UC-27 – Quản lý chuồng và giá lưu trú

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-HTL-01, FR-HTL-02, FR-HTL-03; BR-19, BR-21, BR-22 |
| Tiền điều kiện | Quản lý đã đăng nhập. |
| Hậu điều kiện | Chuồng, giá lưu trú/thức ăn theo đêm và phí phạt trả muộn được cập nhật. |
| Luồng cơ bản | 1. Thêm chuồng: mã, loài, nhóm kích cỡ phù hợp.<br>2. Cập nhật hoặc ngừng sử dụng chuồng.<br>3. Thiết lập giá lưu trú/đêm, giá thức ăn/đêm theo loài và nhóm kích cỡ, và mức phí phạt trả muộn mỗi lần. |
| Luồng ngoại lệ | Mã chuồng đã tồn tại → từ chối.<br>Chuồng ngừng sử dụng không còn được đề xuất/gán và không tính vào sức chứa. |

#### UC-28 – Đặt lịch hẹn lưu trú

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng (thú cưng của mình); Lễ tân (thay khách đến trực tiếp) |
| Tham chiếu | FR-HTL-04; BR-01, BR-02, BR-15, BR-18, BR-21, BR-22 |
| Tiền điều kiện | Như UC-10. |
| Hậu điều kiện | Tạo lịch hẹn lưu trú “Chờ xác nhận”; thông báo khách có tài khoản. |
| Luồng cơ bản | 1. Chọn thú cưng, thời điểm nhận và thời điểm trả (ngày, giờ).<br>2. Hệ thống kiểm tra còn ít nhất một chuồng phù hợp trống trong toàn bộ các đêm; hiển thị số đêm và tiền lưu trú tạm tính.<br>3. Gửi yêu cầu; backend kiểm tra lại trong giao dịch (BR-18) và tạo lịch hẹn. |
| Luồng ngoại lệ | Tự đặt khi bị khóa → từ chối, hướng dẫn hotline.<br>Hết chỗ (kể cả do đặt đồng thời) → từ chối, chọn ngày khác.<br>Ngày trả không sau ngày nhận → từ chối.<br>Lưu trú không kèm spa; muốn spa phải đặt lịch spa riêng. |

#### UC-29 – Gán chuồng và xác nhận lịch hẹn lưu trú

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý; Hệ thống (đề xuất) |
| Tham chiếu | FR-HTL-05; BR-03, BR-18, BR-21, BR-26 |
| Tiền điều kiện | Lịch lưu trú “Chờ xác nhận”. |
| Hậu điều kiện | Lịch hẹn “Đã xác nhận” kèm chuồng; các bên được thông báo. |
| Luồng cơ bản | 1. Hệ thống đề xuất chuồng phù hợp loài, nhóm kích cỡ, trống trong toàn bộ các đêm.<br>2. Quản lý xác nhận đề xuất hoặc chọn chuồng khác phù hợp.<br>3. Backend kiểm tra không trùng đêm trong giao dịch.<br>4. Chuyển “Đã xác nhận”; nếu khách từng thay đổi thì tính lại tiền lưu trú (BR-26). |
| Luồng ngoại lệ | Chuồng đã gán cho lịch khác trùng đêm → từ chối, báo xung đột.<br>Không còn chuồng phù hợp → từ chối lịch hẹn (UC-13). |

#### UC-30 – Xác nhận chi phí mới

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng; Lễ tân (ghi nhận hộ khách vãng lai hoặc phản hồi trực tiếp/qua điện thoại); Hệ thống |
| Tham chiếu | FR-EXE-11, FR-NOT-06; BR-16, BR-23 |
| Tiền điều kiện | Có yêu cầu xác nhận “Chờ phản hồi” từ UC-17, chưa quá 30 phút. |
| Hậu điều kiện | Xác nhận: hồ sơ cập nhật, lịch hẹn tiếp tục theo chi phí mới. Từ chối/quá hạn: “Đã hủy” (lỗi do khách hàng). |
| Luồng cơ bản | 1. Khách nhận thông báo kèm cân nặng thực tế và chi phí mới.<br>2. Khách xác nhận hoặc từ chối trong 30 phút (khách vãng lai: lễ tân liên hệ theo thông tin đã ghi nhận và ghi nhận phản hồi).<br>3. Xác nhận → cập nhật hồ sơ theo cân nặng thực tế, lịch hẹn tiếp tục (spa: được chuyển “Đang thực hiện”; lưu trú: được thu tiền lưu trú). |
| Luồng ngoại lệ | Khách từ chối, hoặc quá 30 phút không phản hồi (tác vụ nền) → “Đã hủy”, thông báo.<br>Yêu cầu thuộc lịch hẹn của khách khác → từ chối (BR-16). |

#### UC-31 – Tiếp nhận thú cưng lưu trú

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân (quản lý khi cần) |
| Tham chiếu | FR-HTL-07; BR-05, BR-07, BR-08, BR-21, BR-23 |
| Tiền điều kiện | Lịch lưu trú “Đã xác nhận”, còn trong thời gian giữ chỗ; cân nặng đã đối chiếu và không chờ xác nhận; tiền lưu trú đã thanh toán (UC-23). |
| Hậu điều kiện | Lịch hẹn “Đang lưu trú”; chuồng đã gán được ghi nhận đang chứa thú cưng. |
| Luồng cơ bản | 1. Lễ tân mở lịch hẹn; hệ thống kiểm tra các điều kiện tiên quyết.<br>2. Lễ tân xác nhận tiếp nhận.<br>3. Hệ thống chuyển “Đang lưu trú” và thông báo khách (UC-34). |
| Luồng ngoại lệ | Chưa đối chiếu cân nặng, đang chờ xác nhận chi phí hoặc chưa thanh toán tiền lưu trú → từ chối.<br>Quá thời gian giữ chỗ → đã bị tự động hủy (UC-21). |

#### UC-32 – Trả thú cưng lưu trú

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân (quản lý khi cần) |
| Tham chiếu | FR-HTL-09; BR-05, BR-07, BR-22 |
| Tiền điều kiện | Lịch lưu trú “Đang lưu trú”. |
| Hậu điều kiện | Lịch hẹn “Hoàn tất”; chuồng được giải phóng. |
| Luồng cơ bản | 1. Khách đến đón; lễ tân ghi nhận thời điểm trả thực tế.<br>2. Hệ thống tính phí phạt trả muộn (trễ ≤ 30 phút: không tính; từ phút thứ 31, mỗi 60 phút một lần).<br>3. Có phí phạt → thu tại quầy (UC-23).<br>4. Lễ tân xác nhận bàn giao; hệ thống chuyển “Hoàn tất”, giải phóng chuồng, thông báo khách. |
| Luồng ngoại lệ | Phí phạt chưa thanh toán → chặn “Hoàn tất”.<br>Trả sớm → xử lý như bình thường, không hoàn tiền. |

#### UC-33 – Xem tình trạng chuồng

| Mục | Nội dung |
| --- | --- |
| Actor | Lễ tân, Quản lý |
| Tham chiếu | FR-HTL-08; BR-21 |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Không thay đổi dữ liệu. |
| Luồng cơ bản | 1. Mở danh sách chuồng.<br>2. Hệ thống hiển thị tình trạng trống/đang chứa; chuồng đang chứa hiển thị thú cưng, khách hàng (chủ) và thời điểm trả dự kiến. |
| Luồng ngoại lệ | Vai trò không có quyền → từ chối. |

#### UC-34 – Nhận thông báo

| Mục | Nội dung |
| --- | --- |
| Actor | Khách hàng có tài khoản; Nhân viên spa (người nhận); Hệ thống (tạo thông báo) |
| Tham chiếu | FR-NOT-01 → FR-NOT-05 (FR-NOT-06 qua UC-30) |
| Tiền điều kiện | Người nhận có tài khoản. |
| Hậu điều kiện | Thông báo được tạo và hiển thị cho đúng người nhận. |
| Luồng cơ bản | 1. Sự kiện nghiệp vụ xảy ra → hệ thống tạo thông báo: ghi nhận đặt lịch (NOT-01); xác nhận và phân công, kèm số tiền tính lại nếu khách đã đổi lịch (NOT-02); đổi trạng thái thực hiện hoặc quay về “Chờ xác nhận” do BR-27 (NOT-03); hủy kèm lý do, gửi cả nhân viên được phân công (NOT-04); thanh toán thành công (NOT-05).<br>2. Người nhận xem trên web; chỉ thấy thông báo gửi cho mình. |
| Luồng ngoại lệ | Khách vãng lai không nhận thông báo; lễ tân liên hệ trực tiếp.<br>Xem thông báo của người khác → từ chối. |

#### UC-35 – Quản lý phân lịch làm việc (ca làm) cho nhân viên spa

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-STF-04 (bổ sung theo yêu cầu của nhóm); BR-04, BR-13, BR-27 |
| Tiền điều kiện | Quản lý đã đăng nhập; nhân viên spa đang hoạt động. |
| Hậu điều kiện | Ca làm được thêm, sửa hoặc xóa; kết quả ảnh hưởng đến đề xuất nhân viên (UC-12) và các mốc giờ còn chỗ (UC-10). |
| Luồng cơ bản | 1. Quản lý mở lịch làm việc theo tuần.<br>2. Chọn nhân viên spa, ngày, giờ bắt đầu và giờ kết thúc; thêm, sửa hoặc xóa ca.<br>3. Hệ thống kiểm tra giờ kết thúc sau giờ bắt đầu và ca không chồng ca khác của cùng nhân viên.<br>4. Khi rút ngắn hoặc xóa ca, hệ thống kiểm tra không còn lịch hẹn “Đã xác nhận” của nhân viên đó nằm trong phần ca bị bỏ.<br>5. Lưu ca. |
| Luồng ngoại lệ | Giờ không hợp lệ hoặc chồng ca → từ chối.<br>Còn lịch hẹn đã xác nhận trong phần ca bị bỏ → từ chối, quản lý phân lịch lại nhân viên khác trước.<br>Nhân viên đã bị vô hiệu hóa → không thêm ca.<br>Lịch “Chờ xác nhận” không chặn việc sửa ca; nếu không còn đủ nhân viên, quản lý từ chối lịch đó (UC-13). |

#### UC-36 – Quản lý cấu hình tham số hệ thống

| Mục | Nội dung |
| --- | --- |
| Actor | Quản lý |
| Tham chiếu | FR-CFG-01 (bổ sung theo yêu cầu của nhóm); BR-08, BR-15, BR-19, BR-20, BR-22, BR-23 |
| Tiền điều kiện | Quản lý đã đăng nhập. |
| Hậu điều kiện | Tham số được lưu và áp dụng cho các thao tác sau đó; lịch hẹn đã tạo giữ giá trị đã chốt lúc đặt (ví dụ thời gian dọn dẹp). |
| Luồng cơ bản | 1. Quản lý mở màn hình cấu hình và chọn nhóm tham số: đặt lịch và giữ chỗ; vắng mặt và khóa; cân nặng và kích cỡ; lưu trú.<br>2. Sửa giá trị (danh sách ở mục 7.2).<br>3. Hệ thống kiểm tra khoảng giá trị hợp lệ.<br>4. Lưu; có hiệu lực ngay, không cần triển khai lại. |
| Luồng ngoại lệ | Giá trị ngoài khoảng cho phép (ví dụ hạn tự đổi/hủy ngoài 60–120 phút, dọn dẹp ngoài 15–20 phút, ngưỡng không tăng dần, dung sai âm, mốc giờ sai định dạng) → từ chối, nêu lý do.<br>Người dùng không phải quản lý → từ chối. |

## 2.4 Yêu cầu phi chức năng (Non-functional Requirements)

Các yêu cầu dưới đây lấy từ Requirements 4.3 và Phần 5, kèm cơ chế đáp ứng trong thiết kế. Chỉ tiêu định lượng chưa được xác định (R-03) nên không được đặt tạm ở đây (X-08).

| Nhóm | Yêu cầu (Requirements) | Cơ chế đáp ứng trong thiết kế | Chỉ tiêu |
| --- | --- | --- | --- |
| Hiệu năng & mở rộng (Performance & Scalability) | Phản hồi đặt lịch, tra cứu, cập nhật trạng thái trong thời gian hợp lý. | Truy vấn danh sách có phân trang và lọc ở backend; chỉ mục theo (Status, SlotStart), CustomerId, PetId; AppointmentStaff theo StaffId.<br>Frontend dùng TanStack Query để lưu đệm và tránh gọi lặp.<br>Backend không giữ phiên (JWT) nên có thể chạy nhiều bản; tác vụ nền phải xử lý lặp an toàn (idempotent) khi có nhiều bản.<br>Truy vấn mốc giờ còn chỗ chỉ tính trên dữ liệu của một ngày.<br>Quy mô: một cửa hàng (A-01), không đa chi nhánh. | Chưa xác định (R-03) |
| Độ sẵn sàng (Availability) | Sẵn sàng phục vụ đặt lịch trực tuyến trong giờ hoạt động của cửa hàng. | Backend trên gói miễn phí tự ngủ sau 15 phút không có request; cron-job.org gọi mỗi 5 phút để giữ thức và kích hoạt tác vụ nền (3.2).<br>Nếu backend bị khởi động lại, tác vụ nền xử lý bù các mục quá hạn vì mốc thời gian lưu trong DB.<br>Cơ sở dữ liệu là dịch vụ quản lý (Supabase); điểm kiểm tra sức khỏe (health check) cho giám sát. | Giờ hoạt động và % uptime chưa xác định (R-03); gói miễn phí không có cam kết SLA |
| Bảo mật & phân quyền (Security & Authorization) | Xác thực trước khi dùng chức năng theo vai trò; kiểm tra vai trò và quyền sở hữu/phạm vi (BR-05, BR-16) lại ở backend cho mọi request; mặc định từ chối. | JWT Bearer + ASP.NET Core Identity; access token ngắn hạn, refresh token băm và thu hồi được; mật khẩu băm bằng PasswordHasher.<br>Phân quyền theo ma trận 5.1: chính sách theo vai trò ở tầng API (Controller) + kiểm tra sở hữu ở tầng Application (BR-16); lỗi xác thực/phân quyền → từ chối.<br>Dữ liệu quan trọng (giá, số tiền, vai trò, nhóm kích cỡ, trạng thái, nhân viên, chuồng) do backend quyết định, không nhận từ client.<br>Rate limiting cho đăng ký/đăng nhập/làm mới token và đặt lịch; CORS chỉ 3 origin web.<br>Webhook xác minh chữ ký và đối chiếu số tiền; secret ở biến môi trường/secret store, không ghi log mật khẩu/token/secret; ghi log sự kiện bảo mật. | — |
| Toàn vẹn dữ liệu | Không trùng nhân viên/chuồng; đúng vòng đời; hoàn tất đủ điều kiện; thanh toán đủ tiền; nhất quán khi đồng thời (BR-04, 06, 07, 13, 14, 17, 18, 21). | Máy trạng thái ở tầng Domain (5.4) và ràng buộc CHECK.<br>Ràng buộc loại trừ PostgreSQL và khóa tư vấn trong giao dịch (3.1).<br>Số tiền do backend tính và đối chiếu trước khi “Đã thanh toán”. | — |
| Độ tin cậy | Tự hủy vắng mặt, khóa đặt lịch, hết hạn xác nhận 30 phút phải đáng tin cậy, không bỏ sót (BR-08, 15, 23). | Tác vụ nền quét định kỳ theo mốc thời gian lưu trong DB (không dùng bộ đếm bộ nhớ), nên khởi động lại không làm mất việc.<br>Xử lý idempotent, cập nhật trong giao dịch. | — |
| Tương thích (Compatibility) | Web hoạt động ổn định trên các trình duyệt phổ biến. | Trình duyệt hiện đại, bản mới (Chrome, Edge, Firefox, Safari – đề xuất danh sách kiểm thử).<br>Thiết bị: web khách hàng và web nhân viên responsive (điện thoại, máy tính bảng, máy tính); web quản lý ưu tiên màn hình máy tính (đề xuất).<br>Hệ điều hành: không ràng buộc vì chạy trên trình duyệt; không có ứng dụng native. | Danh sách trình duyệt chưa chốt |

# III. Thiết kế Kiến trúc (Architecture Design)

## 3.1 Kiến trúc tổng thể (System Architecture)

**Kiểu kiến trúc:** Clean Architecture (X-12) với **một backend ASP.NET Core Web API duy nhất**, triển khai thành một đơn vị, phục vụ 3 web Next.js độc lập; web chỉ giao tiếp với backend qua RESTful API, không truy cập database trực tiếp (C-02). Backend chia thành 4 tầng đồng tâm và mã nguồn chỉ phụ thuộc hướng vào trong (Dependency Rule): các quy tắc nghiệp vụ (BR-xx) nằm ở tầng trong, không phụ thuộc ASP.NET Core, EF Core, PostgreSQL hay dịch vụ ngoài; các chi tiết kỹ thuật đó nằm ở tầng ngoài và được nối vào qua interface (port). Việc dùng một backend duy nhất phù hợp một cửa hàng (A-01), nhóm 4 người và thời gian khoảng 75 ngày (thông tin dự án, không có trong Requirements v2); không dùng microservices để tránh chi phí vận hành không cần thiết.

Bốn tầng, từ trong ra ngoài:

1. **Domain:** thực thể nghiệp vụ (các lớp ở 5.2), máy trạng thái lịch hẹn (5.4) và hai domain service Slot, Pricing. Không phụ thuộc tầng nào khác.
2. **Application:** Application Services hiện thực các use case (UC) bằng cách điều phối Domain; định nghĩa các port mà tầng ngoài phải hiện thực. Chỉ phụ thuộc Domain.
3. **Infrastructure:** hiện thực các port bằng công nghệ cụ thể (adapter): EF Core/PostgreSQL, Identity + JWT, Supabase Storage, cổng thanh toán, tác vụ nền. Phụ thuộc Application và Domain.
4. **API:** Controllers, DTO, middleware và điểm khởi động của ứng dụng. Phụ thuộc Application; tại điểm khởi động (composition root) nối mỗi port với adapter tương ứng ở Infrastructure.

**Quy tắc phụ thuộc (Dependency Rule):**

| Tầng | Được phụ thuộc vào | Không được phụ thuộc vào |
| --- | --- | --- |
| Domain | — (không phụ thuộc tầng nào) | Application, Infrastructure, API; EF Core, ASP.NET Core, Identity |
| Application | Domain | Infrastructure, API |
| Infrastructure | Application, Domain | API |
| API | Application; Infrastructure chỉ tại composition root (để nối port với adapter) | — |

Các thành phần và luồng kết nối:

1. **Người dùng và frontend** (Next.js / React / TypeScript):
   - Quản lý dùng **Web quản lý**.
   - Khách hàng dùng **Web khách hàng**.
   - Lễ tân / nhân viên spa dùng **Web nhân viên**.
2. **Kết nối frontend – backend:** cả ba web gọi backend bằng REST / JSON (HTTPS, Axios).
3. **Backend** – ASP.NET Core Web API (một backend duy nhất, Clean Architecture), gồm:
   - **API:** Controllers + DTO; FluentValidation, Rate limiting, CORS (3 origin); xác thực JWT Bearer và chính sách theo vai trò; endpoint webhook và `POST /internal/jobs/run`; cấu hình Serilog, Swagger/OpenAPI; composition root.
   - **Application:** Application Services: Auth; Pricing / Payment; Booking / Slot; Assignment / Lifecycle / Shift (gồm tiếp nhận); Pet / Catalog / Staff / Config; Notification. Cùng các port (interface) nêu ở bảng bên dưới.
   - **Domain:** thực thể (Appointment, Pet, Cage, Payment, …), máy trạng thái, SlotService, PricingService.
   - **Infrastructure:** EF Core (DbContext, Repositories) qua Npgsql; ASP.NET Core Identity và phát hành JWT; adapter Supabase Storage; adapter cổng thanh toán; BackgroundService.
4. **Luồng bên trong backend:**
   - Controllers gọi Application Services; UserId và Role lấy từ token được truyền vào Application Services.
   - Endpoint kích hoạt job và BackgroundService gọi Application Services.
   - Application Services dùng Domain để áp quy tắc nghiệp vụ, và gọi các port để truy cập dữ liệu, lưu ảnh, thanh toán; các port do Infrastructure hiện thực.
5. **Cơ sở dữ liệu:** adapter EF Core kết nối Supabase PostgreSQL (gói Free) qua Npgsql.
6. **Dịch vụ ngoài:**
   - cron-job.org (miễn phí, mỗi 5 phút) gửi `POST /internal/jobs/run` (header bí mật) để kích hoạt job nền.
   - PaymentService khởi tạo thanh toán với VNPAY / MoMo (sandbox) qua port cổng thanh toán; cổng gọi webhook (xác minh chữ ký) về Controllers.
   - Ảnh trước/sau lưu trên Supabase Storage (gói Free) qua port lưu trữ ảnh.

*Hình 3.1 – Kiến trúc tổng thể (Clean Architecture)*

| Tầng | Thành phần | Trách nhiệm |
| --- | --- | --- |
| API | Controllers + DTO | Nhận request, xác thực dữ liệu đầu vào (FluentValidation), áp chính sách theo vai trò, chuyển DTO thành tham số cho Application Services, ánh xạ kết quả/lỗi nghiệp vụ trả về thành HTTP status và mã lỗi (5.1.2). Không chứa quy tắc nghiệp vụ; DTO không chứa trường quan trọng do hệ thống quyết định. |
| API | Xác thực & phân quyền | JWT Bearer xác thực token; lấy UserId, Role từ token; kiểm tra vai trò theo ma trận 5.1; lỗi → từ chối (mặc định từ chối). |
| API | Tác vụ nền – endpoint | `POST /internal/jobs/run` (xác minh header bí mật X-Job-Secret, không dùng JWT) để cron-job.org gọi mỗi 5 phút; chỉ kích hoạt Application Services, không chứa logic xử lý. |
| Application | Application Services | Điều phối use case: Booking/Slot (BR-13, quy tắc 2.3.3), Assignment/Lifecycle/Shift (BR-04, 14, 21; ca làm), Pricing/Payment (BR-11, 17, 22), Pet/Catalog/Staff/Config, Notification, Auth. Kiểm tra quyền sở hữu/phạm vi (BR-16) cho mọi request; mở giao dịch và gọi Domain để áp quy tắc. |
| Application | Port (interface) | Hợp đồng mà Application cần từ bên ngoài, do Infrastructure hiện thực; xem bảng port bên dưới. |
| Domain | Thực thể và máy trạng thái | Các lớp ở 5.2; chuyển trạng thái đúng trình tự (BR-14, 5.4) nằm trong lớp Appointment và các lớp con. |
| Domain | Domain service Slot, Pricing | SlotService: quy tắc mốc giờ còn chỗ, chuồng trống, đề xuất nhân viên (2.3.3). PricingService: BR-11, BR-22 (giá spa, giá lưu trú, phí trả muộn). Chỉ tính toán trên dữ liệu được truyền vào. |
| Infrastructure | EF Core / Repositories | Hiện thực port truy cập dữ liệu và port giao dịch: truy cập PostgreSQL qua Npgsql; quản lý giao dịch, khóa và migration; ánh xạ thực thể Domain sang bảng ở 4.2. |
| Infrastructure | Identity & token | ASP.NET Core Identity (PasswordHasher), phát hành access token JWT, lưu băm refresh token. |
| Infrastructure | Tác vụ nền | BackgroundService trong cùng backend, gọi Application Services: tự hủy vắng mặt 15 phút và khóa tự đặt lịch (FR-EXE-07, FR-BOOK-06); hết hạn xác nhận chi phí sau 30 phút (FR-EXE-11). Mốc thời gian đọc từ DB, xử lý lặp an toàn nên bù được khi backend vừa thức dậy hoặc khởi động lại. |
| Infrastructure | Kho lưu trữ ảnh (Đề xuất X-04) | Supabase Storage gói Free: lưu ảnh minh chứng; bucket riêng tư, chỉ backend truy cập sau khi kiểm tra BR-16. |
| Infrastructure | Cổng thanh toán | Backend khởi tạo giao dịch với VNPAY / MoMo; cổng gọi webhook về backend; webhook phải được xác minh chữ ký (cách xác minh của từng cổng chưa chốt – R-05, X-08). |

**Port do Application định nghĩa và adapter ở Infrastructure** (Đề xuất X-12):

| Port | Mục đích | Adapter (Infrastructure) |
| --- | --- | --- |
| Truy cập dữ liệu | Đọc/ghi thực thể Domain (lịch hẹn, thú cưng, chuồng, thanh toán, …). | EF Core Repositories + Npgsql |
| Giao dịch & khóa đồng thời | Bắt đầu/kết thúc giao dịch; khóa theo ngày hoặc theo loài/nhóm kích cỡ; khóa dòng khi xác nhận. | Giao dịch EF Core; pg_advisory_xact_lock; SELECT … FOR UPDATE |
| Danh tính & token | Kiểm tra mật khẩu, phát hành và xoay vòng token, thu hồi refresh token. | ASP.NET Core Identity + JWT |
| Lưu trữ ảnh | Tải lên và truy cập ảnh minh chứng. | Supabase Storage |
| Cổng thanh toán | Tạo yêu cầu thanh toán; xác minh chữ ký webhook. | Adapter VNPAY / MoMo (sandbox) |

Tên chi tiết của từng interface và lớp hiện thực sẽ được đặt khi cài đặt; bảng trên chỉ cố định trách nhiệm và hướng phụ thuộc.

### Cơ chế nhất quán khi đồng thời (Đề xuất X-03 – R-04, BR-18)

| Quy tắc | Cơ chế đề xuất | Tầng thực hiện | Khi vi phạm |
| --- | --- | --- | --- |
| Không vượt số nhân viên khả dụng (BR-13) | Giao dịch đặt lịch lấy khóa tư vấn pg_advisory_xact_lock theo ngày, tính lại E − Tải đỉnh ≥ n (2.3.3) rồi mới ghi. | Application (điều phối giao dịch qua port) + Domain (SlotService tính E − Tải đỉnh) + Infrastructure (hiện thực khóa) | 409 SLOT_FULL |
| Không trùng nhân viên spa (BR-04) | Ràng buộc loại trừ gist trên AppointmentStaff (StaffId, khoảng giữ chỗ gồm dọn dẹp) cho dòng đang giữ chỗ; khóa dòng lịch hẹn khi xác nhận. | Infrastructure (ràng buộc trong CSDL, khóa dòng) + Application (điều phối xác nhận) | 409 STAFF_CONFLICT |
| Không chồng ca làm của một nhân viên | Ràng buộc loại trừ gist trên WorkShift (StaffId, khoảng ca). | Infrastructure (ràng buộc trong CSDL) | 409 SHIFT_OVERLAP |
| Không trùng chuồng / không vượt sức chứa (BR-21) | Ràng buộc loại trừ gist trên (CageId, khoảng đêm); khi đặt lưu trú dùng khóa tư vấn theo loài/nhóm kích cỡ để đếm lại chuồng trống. | Application (điều phối giao dịch) + Domain (SlotService đếm chuồng trống) + Infrastructure (ràng buộc, khóa) | 409 CAGE_CONFLICT / NO_CAPACITY |
| Chuyển trạng thái đúng trình tự (BR-14) | Máy trạng thái trong tầng Domain; cập nhật có điều kiện (WHERE Status = trạng thái cũ) trong giao dịch. | Domain (máy trạng thái) + Infrastructure (cập nhật có điều kiện) | 409 INVALID_TRANSITION |
| Không xử lý lặp webhook/tác vụ nền | TxnRef duy nhất; xử lý idempotent; khóa dòng Payment. | Application (PaymentService bỏ qua TxnRef đã xử lý) + Infrastructure (ràng buộc duy nhất, khóa dòng) | Bỏ qua bản lặp |

## 3.2 Sơ đồ triển khai (Deployment Diagram)

Requirements chưa quy định nền tảng; nhóm yêu cầu chi phí **0đ** nên sơ đồ dưới là **đề xuất (X-05)** chỉ dùng gói miễn phí, giữ nguyên ràng buộc C-02: web → backend → database, web không nối trực tiếp database. Thông số gói miễn phí đối chiếu từ tài liệu của nhà cung cấp tháng 10/2026; cần kiểm tra lại khi triển khai vì các nhà cung cấp có thể đổi chính sách.

Các nút triển khai và kết nối:

1. **Thiết bị người dùng:** trình duyệt (Desktop / Mobile). Trình duyệt truy cập ba web qua HTTPS.
2. **Vercel – gói Hobby (0đ):** Web khách hàng, Web nhân viên, Web quản lý (đều Next.js). Cả ba gọi API qua HTTPS / REST (JWT).
3. **Render – Web Service Free (0đ), Docker, 750 giờ/tháng:** ASP.NET Core Web API + job nền.
4. **Supabase – gói Free (0đ):**
   - PostgreSQL 500 MB: API kết nối qua TCP (SSL) – Npgsql.
   - Storage 1 GB: API kết nối qua HTTPS.
5. **cron-job.org (0đ):** POST mỗi 5 phút tới API qua HTTPS để kích hoạt job và giữ dịch vụ thức.
6. **VNPAY / MoMo (sandbox, 0đ):**
   - API khởi tạo thanh toán qua HTTPS.
   - Trình duyệt được chuyển hướng sang cổng để thanh toán.
   - Cổng gọi webhook (kèm chữ ký) về API qua HTTPS.

*Hình 3.2 – Sơ đồ triển khai 0đ (đề xuất)*

| Nút | Đề xuất (0đ) | Giới hạn gói miễn phí và cách xử lý |
| --- | --- | --- |
| 3 web (khách hàng, nhân viên, quản lý) | Vercel gói Hobby: 3 project Next.js từ một repository GitHub. | Chỉ cho mục đích cá nhân, phi thương mại (phù hợp đồ án); 100 GB Fast Data Transfer/tháng; repository phải thuộc tài khoản GitHub cá nhân của một thành viên, không thuộc GitHub organization; số project tối đa trên một repository: các trang tài liệu Vercel ghi chưa thống nhất (3 hoặc 25), cần kiểm tra khi triển khai. |
| Backend | Render Web Service gói Free, chạy Docker ASP.NET Core; 3 origin web đưa vào CORS. | Tự ngủ sau 15 phút không có request, thức lại mất khoảng một phút; 750 giờ chạy/tháng dùng chung (đủ cho một service chạy liên tục); Render có thể khởi động lại bất cứ lúc nào; cấu hình thấp (khoảng 512 MB RAM, 0,1 CPU theo tài liệu bên thứ ba) nên cần chạy thử container ASP.NET Core. Xử lý: cron-job.org gọi mỗi 5 phút (giữ thức, kích hoạt job); job xử lý bù khi khởi động lại. Không dùng Postgres miễn phí của Render vì hết hạn sau 30 ngày. |
| Cơ sở dữ liệu | Supabase Free PostgreSQL (500 MB), nối bằng chuỗi kết nối SSL. | Tự tạm dừng sau 1 tuần không hoạt động. Xử lý: lời gọi cron-job.org kèm truy vấn DB nhẹ để luôn có hoạt động (cần kiểm chứng thực tế khi chạy). 500 MB đủ cho dữ liệu nghiệp vụ của một cửa hàng; ảnh không lưu trong DB. |
| Lưu trữ ảnh | Supabase Storage Free (1 GB), bucket riêng tư. | Tối đa 50 MB mỗi tệp. Xử lý: nén, thu nhỏ ảnh trước khi tải lên. |
| Kích hoạt job nền | cron-job.org: POST /internal/jobs/run mỗi 5 phút kèm header X-Job-Secret. | Miễn phí, tối đa 1 lần/phút mỗi job, timeout 30 giây mỗi request, không cam kết SLA. Lần gọi đầu khi backend đang ngủ có thể bị timeout nhưng request vẫn đến backend để đánh thức (dự kiến, cần kiểm chứng). |
| Cổng thanh toán | VNPAY / MoMo sandbox. | Webhook cần URL HTTPS công khai của backend (có sẵn trên Render). |
| Cấu hình & secret | Biến môi trường của Render và Vercel. | Khóa ký JWT, chuỗi kết nối, secret cổng thanh toán, khóa Supabase, X-Job-Secret. |

**Đánh đổi:** gói miễn phí không cam kết thời gian hoạt động và request đầu sau khi backend ngủ sẽ chậm; khi chạy thật cho cửa hàng nên nâng gói backend để hết ngủ (không cần đổi mã).

## 3.3 Công nghệ sử dụng (Technology Stack)

Các công nghệ lấy từ ràng buộc C-02, C-03, C-05 và Requirements 5.2. Mục có nhãn (Đề xuất) là thành phần bổ sung cần để hiện thực.

| Lớp | Công nghệ |
| --- | --- |
| **Frontend** | React / Next.js (TypeScript); TailwindCSS; React Hook Form; TanStack Query; Axios. 3 ứng dụng riêng (web khách hàng, nhân viên, quản lý). |
| **Backend** | ASP.NET Core Web API; Entity Framework Core; ASP.NET Core Identity + JWT Bearer; FluentValidation; Serilog; Swagger/OpenAPI. (Đề xuất) BackgroundService cho tác vụ nền; Npgsql (provider PostgreSQL cho EF Core); rate limiting middleware tích hợp của ASP.NET Core. Tất cả miễn phí. Tổ chức mã nguồn theo Clean Architecture gồm 4 tầng Domain, Application, Infrastructure, API (3.1, X-12); không bổ sung thư viện nào so với danh sách trên. |
| **Database** | Supabase (PostgreSQL). (Đề xuất) Extension btree_gist cho ràng buộc loại trừ. |
| **Tích hợp** | VNPAY / MoMo (sandbox). (Đề xuất) Supabase Storage cho ảnh. |
| **Hạ tầng (Đề xuất, 0đ)** | Vercel Hobby (web), Render Free + Docker (backend), Supabase Free (DB, ảnh), cron-job.org (kích hoạt job). |
| **Công cụ (C-03)** | GitHub (mã nguồn), Postman (kiểm thử API), PlantUML (thiết kế CSDL/UML); Trello (tiến độ; không nằm trong C-03 của Requirements). |

# IV. Thiết kế Dữ liệu (Database Design)

## 4.1 Sơ đồ thực thể liên kết (ERD)

CSDL gồm **21 bảng** trên PostgreSQL. ERD chỉ hiển thị khóa và các cột chính; đầy đủ cột ở 4.2. Quy ước: khóa chính dạng uuid, thời gian dạng timestamptz (lưu UTC, hiển thị theo múi giờ cửa hàng), số tiền VND dạng numeric(12,0).

ERD gồm 21 bảng. Cột khóa và cột chính của từng bảng xem mục 4.2 (kiểu dữ liệu, ràng buộc, ý nghĩa). Các quan hệ giữa các bảng (bên “1” là bảng được tham chiếu; bên “n” là bảng chứa khóa ngoại):

1. AppUser 1 – n RefreshToken (RefreshToken.UserId, bắt buộc).
2. AppUser 1 – 0..1 Customer (Customer.UserId, duy nhất, có thể NULL: khách vãng lai không có tài khoản).
3. AppUser 1 – 0..1 Staff (Staff.UserId, duy nhất, bắt buộc).
4. AppUser 1 – n Notification (Notification.RecipientUserId, bắt buộc).
5. AppUser 0..1 – n CostConfirmation (CostConfirmation.RespondedByUserId, có thể NULL).
6. AppUser 0..1 – n Payment (Payment.ConfirmedByUserId, có thể NULL).
7. Customer 1 – n Pet (Pet.CustomerId, bắt buộc).
8. Customer 1 – n Appointment (Appointment.CustomerId, bắt buộc).
9. Pet 1 – n Appointment (Appointment.PetId, bắt buộc).
10. Cage 0..1 – n Appointment (Appointment.CageId, có thể NULL).
11. Appointment 1 – n AppointmentStaff và Staff 1 – n AppointmentStaff (AppointmentStaff có khóa chính gồm AppointmentId và StaffId).
12. Appointment 1 – n AppointmentService và Service 1 – n AppointmentService (AppointmentService có khóa chính gồm AppointmentId và ServiceId).
13. Service 1 – n ServicePricing (ServicePricing.ServiceId là một phần khóa chính).
14. Appointment 1 – n CostConfirmation (CostConfirmation.AppointmentId, bắt buộc).
15. Appointment 1 – n AppointmentPhoto (AppointmentPhoto.AppointmentId, bắt buộc).
16. Staff 1 – n AppointmentPhoto (AppointmentPhoto.UploadedByStaffId, bắt buộc).
17. Appointment 1 – n Payment (Payment.AppointmentId, bắt buộc).
18. Payment 1 – n PaymentTransaction (PaymentTransaction.PaymentId, bắt buộc).
19. Appointment 0..1 – n Notification (Notification.AppointmentId, có thể NULL).
20. Staff 1 – n WorkShift (WorkShift.StaffId, bắt buộc).

Bốn bảng **SizeRule**, **WeightTolerance**, **HotelPricing**, **SystemConfig** là bảng cấu hình độc lập, không có quan hệ khóa ngoại với các bảng còn lại.

*Hình 4.1 – ERD*

| Quyết định thiết kế | Lý do |
| --- | --- |
| Lịch spa và lưu trú dùng chung bảng Appointment, phân biệt bằng Type | Chung vòng đời, thanh toán, thông báo, phân quyền (FR-LFC-01); ràng buộc loại trừ cần Status và thời gian cùng bảng. |
| Khách vãng lai là Customer có UserId = NULL | Cùng gắn hồ sơ thú cưng và lịch hẹn (BR-01) nhưng không đăng nhập, không nhận thông báo. |
| ServicePricing(ServiceId, Species, SizeGroup) mang giá, thời lượng, số nhân viên | Dịch vụ áp dụng cho loài nào thì có dòng của loài đó (BR-11, BR-12, 2.3.3). |
| Giá spa không lưu ở AppointmentService; Payment.Amount tính khi đến thời điểm ghi nhận | FR-PAY-01 dùng đơn giá hiện có và nhóm kích cỡ đã đối chiếu tại thời điểm ghi nhận; vì không lưu giá lúc đặt nên thay đổi giá có hiệu lực ngay cả với lịch hẹn chưa thanh toán; khoảng giữ chỗ (SlotEnd, BusyUntil) và StaffRequired được chốt lúc đặt trong Appointment. |
| Nhóm kích cỡ, bảng mốc, dung sai là dữ liệu | BR-19, BR-23 quy định “cấu hình được”. |
| Phân công nhân viên qua AppointmentStaff; quay về “Chờ xác nhận” thì xóa phân công và chuồng (Đề xuất) | Lịch cần 1–2 nhân viên; giải phóng nhân viên/chuồng để đề xuất lại (BR-26, BR-27); giữ lại sau khi xong làm lịch sử công việc (FR-EXE-06). |
| BusyUntil, StaffRequired chốt lúc đặt | Đổi cấu hình không làm sai lịch đã đặt. |

## 4.2 Thiết kế lược đồ CSDL và Từ điển dữ liệu (Database Schema & Data Dictionary)

Ký hiệu: **PK** khóa chính; **FK→Bảng** khóa ngoại; **UQ** duy nhất; **NN** không null; **CK** ràng buộc kiểm tra; **NULL** cho phép null.

Mỗi bảng dưới đây gồm kiểu dữ liệu, ràng buộc và ý nghĩa của từng cột (bản gốc tách thành “lược đồ CSDL” và “từ điển dữ liệu”; nội dung không thay đổi).

### 4.2.1 AppUser

Tài khoản đăng nhập (ánh xạ ASP.NET Core Identity); khách vãng lai không có bản ghi ở đây.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| UserId | uuid | PK | Mã tài khoản. |
| UserName | varchar(20) | UQ, NN | Số điện thoại (đã chuẩn hóa) – định danh đăng nhập của mọi vai trò (nhóm đã duyệt). Với khách hàng trùng Customer.Phone. |
| PasswordHash | text | NN | Mật khẩu đã băm bằng PasswordHasher của Identity; không bao giờ trả ra response. |
| Role | varchar(20) | NN, CK | Customer \| Staff \| Manager; backend lấy từ token, không nhận từ client. |
| IsActive | boolean | NN, mặc định true | false = bị vô hiệu hóa: từ chối đăng nhập/làm mới token (FR-STF-03). |
| CreatedAt | timestamptz | NN | Thời điểm tạo tài khoản. |

### 4.2.2 RefreshToken

Refresh token lưu dạng băm để có thể thu hồi.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| TokenId | uuid | PK | Mã bản ghi. |
| UserId | uuid | FK→AppUser, NN | Chủ sở hữu token. |
| TokenHash | text | UQ, NN | Giá trị băm của token (không lưu token thô). |
| ExpiresAt | timestamptz | NN | Thời điểm hết hạn. |
| RevokedAt | timestamptz | NULL | Có giá trị = đã thu hồi (đăng xuất / tài khoản bị vô hiệu hóa). |
| CreatedAt | timestamptz | NN | Thời điểm cấp. |

### 4.2.3 Customer

Khách hàng: có tài khoản (UserId ≠ NULL) hoặc khách vãng lai (UserId = NULL).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| CustomerId | uuid | PK | Mã khách hàng. |
| UserId | uuid | FK→AppUser, UQ, NULL | NULL = khách vãng lai (không đăng nhập, không nhận thông báo). |
| FullName | varchar(150) | NN | Họ tên. |
| Phone | varchar(20) | UQ, NN | Số điện thoại = thông tin liên hệ duy nhất, dùng chống trùng (FR-ACC-01, FR-ACC-04); khách có tài khoản thì bằng AppUser.UserName, đổi số phải cập nhật cả hai trong một giao dịch. |
| Email | varchar(150) | NULL | Email liên hệ (tùy chọn). |
| IsBookingLocked | boolean | NN, mặc định false | true = bị khóa quyền tự đặt lịch trực tuyến (BR-15); không áp dụng khi lễ tân đặt thay. |
| CreatedAt | timestamptz | NN | Thời điểm tạo. |

### 4.2.4 Staff

Hồ sơ nhân viên; số điện thoại chính là AppUser.UserName, trạng thái hoạt động nằm ở AppUser.IsActive. Tài khoản quản lý chỉ có AppUser (Role = Manager).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| StaffId | uuid | PK | Mã nhân viên. |
| UserId | uuid | FK→AppUser, UQ, NN | Tài khoản đăng nhập của nhân viên. |
| FullName | varchar(150) | NN | Họ tên. |
| StaffRole | varchar(20) | NN, CK | Receptionist (lễ tân) \| SpaStaff (nhân viên spa); do quản lý chọn (FR-STF-01). |

### 4.2.5 Pet

Hồ sơ thú cưng, thuộc đúng một khách hàng.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| PetId | uuid | PK | Mã thú cưng. |
| CustomerId | uuid | FK→Customer, NN | Chủ sở hữu. |
| Name | varchar(100) | NN | Tên thú cưng. |
| Species | varchar(20) | NN, CK | Dog \| Cat \| Rabbit \| GuineaPig (BR-19). |
| Breed | varchar(100) | NN | Giống. |
| Temperament | varchar(10) | NN, CK, mặc định Normal | Tính cách: Calm (hiền) \| Normal (bình thường) \| Difficult (khó tính/dữ). Difficult ⇒ lịch spa cần tối thiểu 2 nhân viên. |
| WeightKg | numeric(5,2) | NN, CK > 0 | Cân nặng khai báo/đã đối chiếu gần nhất. |
| HeightCm | numeric(5,1) | NULL | Chiều cao (vai); bắt buộc khi Species = Dog. |
| CoatNote | varchar(255) | NULL | Đặc điểm lông. |
| Notes | text | NULL | Ghi chú: tiền sử bệnh, lưu ý chăm sóc. |
| SizeGroup | varchar(10) | NN, CK | Small \| Medium \| Large; do hệ thống tự xác định (BR-19), không nhận từ client. |
| IsActive | boolean | NN, mặc định true | false = xóa mềm khi hồ sơ đã có lịch hẹn (BR-25). |
| CreatedAt | timestamptz | NN | Thời điểm tạo. |

### 4.2.6 SizeRule

Bảng mốc phân nhóm kích cỡ (BR-19), cấu hình được.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| Species | varchar(20) | PK | Loài. |
| Criterion | varchar(10) | PK, CK | Weight \| Height (Height chỉ dùng cho Dog). |
| SmallUpper | numeric(5,1) | NN | Cận trên (không gồm) của nhóm Nhỏ, ví dụ Chó – Cân nặng: 10 (kg). |
| MediumUpper | numeric(5,1) | NULL | Cận trên (không gồm) của nhóm Vừa, ví dụ Chó – Cân nặng: 25 (kg); NULL = loài không có nhóm Vừa (chuột lang). |

### 4.2.7 WeightTolerance

Ngưỡng dung sai cân nặng theo ranh giới nhóm (BR-23), cấu hình được.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| Species | varchar(20) | PK | Loài. |
| FromGroup | varchar(10) | PK | Nhóm dưới của ranh giới. |
| ToGroup | varchar(10) | PK | Nhóm trên của ranh giới. |
| ToleranceKg | numeric(4,2) | NN | Chênh lệch cân nặng tối đa được châm chước (bằng ngưỡng vẫn tính là trong ngưỡng). |

### 4.2.8 Service

Dịch vụ spa trong danh mục (lưu trú không thuộc bảng này).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| ServiceId | uuid | PK | Mã dịch vụ. |
| Name | varchar(150) | NN | Tên dịch vụ. |
| Description | text | NULL | Mô tả nghiệp vụ. |
| LatestStartTime | time | NN | Mốc giờ bắt đầu muộn nhất của dịch vụ, thuộc danh sách mốc giờ (ví dụ cắt tỉa: 18:00; tắm / vệ sinh nhẹ: 19:00). |
| IsActive | boolean | NN, mặc định true | false = ngừng cung cấp (FR-SVC-03). |

### 4.2.9 ServicePricing

Giá và thời lượng dịch vụ theo loài và nhóm kích cỡ (BR-11, BR-12). Dịch vụ áp dụng cho loài nào thì có dòng giá của loài đó.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| ServiceId | uuid | PK, FK→Service | Dịch vụ. |
| Species | varchar(20) | PK | Loài áp dụng. |
| SizeGroup | varchar(10) | PK | Nhóm kích cỡ. |
| Price | numeric(12,0) | NN, CK ≥ 0 | Giá (VND). |
| DurationMinutes | integer | NN, CK > 0 | Thời lượng dự kiến (phút). |
| StaffRequired | smallint | NN, CK IN (1,2), mặc định 1 | Số nhân viên làm cùng lúc cho dịch vụ này (ví dụ chó nhóm Lớn: 2). |

### 4.2.10 Appointment

Lịch hẹn (spa hoặc lưu trú) – ánh xạ EF Core dạng một bảng, phân biệt bằng Type; cột riêng của loại kia để NULL.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| AppointmentId | uuid | PK | Mã lịch hẹn. |
| Type | varchar(10) | NN, CK | Spa \| Hotel. |
| CustomerId | uuid | FK→Customer, NN | Khách hàng (BR-01). |
| PetId | uuid | FK→Pet, NN | Đúng một thú cưng (BR-02). |
| Status | varchar(15) | NN, CK, mặc định Pending | Pending \| Confirmed \| Received (spa) \| InProgress (spa) \| InStay (lưu trú) \| Completed \| Cancelled (BR-14). |
| CancelReason | varchar(25) | NULL, CK | Bắt buộc khi Cancelled: CustomerCancelled \| StoreUnable \| CustomerBeyondDeadline \| NoShow \| CostNotConfirmed (Requirements 3.3 a→e). |
| CancelledAt | timestamptz | NULL | Thời điểm hủy; dùng đếm vắng mặt trong 30 ngày (BR-15). |
| SizeGroup | varchar(10) | NN, CK | Nhóm kích cỡ đang áp dụng tính tiền; cập nhật khi đối chiếu cân nặng (BR-23). |
| ActualWeightKg | numeric(5,2) | NULL | Cân nặng thực tế lễ tân ghi nhận khi tiếp nhận (BR-23). |
| SlotStart | timestamptz | NULL (NN nếu Spa) | Spa: giờ bắt đầu khung giờ. |
| SlotEnd | timestamptz | NULL (NN nếu Spa) | Spa: giờ kết thúc dự kiến = SlotStart + tổng thời lượng dịch vụ (BR-12); giữ nguyên khi đổi nhóm kích cỡ. |
| BusyUntil | timestamptz | NULL (NN nếu Spa) | Spa: thời điểm nhân viên rảnh trở lại = SlotEnd + thời gian dọn dẹp (Booking.BufferMinutes tại lúc đặt). |
| StaffRequired | smallint | NULL (NN nếu Spa), CK IN (1,2) | Spa: số nhân viên cần giữ chỗ = lớn nhất của StaffRequired các dịch vụ; tối thiểu 2 nếu Pet.Temperament = Difficult. Giữ nguyên khi đổi nhóm kích cỡ (cùng nguyên tắc BR-23). |
| PlannedCheckIn | timestamptz | NULL (NN nếu Hotel) | Lưu trú: thời điểm nhận dự kiến. |
| PlannedCheckOut | timestamptz | NULL (NN nếu Hotel) | Lưu trú: thời điểm trả dự kiến; ngày trả phải sau ngày nhận. |
| ActualCheckOut | timestamptz | NULL | Lưu trú: thời điểm trả thực tế (BR-22). |
| CageId | uuid | FK→Cage, NULL | Lưu trú: chuồng được gán (BR-21). |
| CreatedAt | timestamptz | NN | Thời điểm tạo. |
| UpdatedAt | timestamptz | NN | Thời điểm cập nhật gần nhất. |

> Ràng buộc bổ sung: CHECK theo Type: Spa ⇒ SlotStart, SlotEnd, BusyUntil, StaffRequired NOT NULL và trường lưu trú NULL; Hotel ⇒ PlannedCheckIn, PlannedCheckOut NOT NULL và trường spa NULL; Status = Cancelled ⇔ CancelReason NOT NULL.

> Ràng buộc bổ sung: Đề xuất cho R-04 (BR-21): EXCLUDE USING gist (CageId WITH =, daterange(đêm nhận, đêm trả, '[)') WITH &&) WHERE (Type = 'Hotel' AND Status IN ('Confirmed','InStay')); đêm quy theo múi giờ cửa hàng.

### 4.2.11 AppointmentStaff

Nhân viên spa được phân công cho lịch hẹn spa (một lịch cần 1 hoặc 2 nhân viên). Giữ lại sau khi hoàn tất để làm lịch sử công việc (FR-EXE-06).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| AppointmentId | uuid | PK, FK→Appointment | Lịch hẹn spa. |
| StaffId | uuid | PK, FK→Staff | Nhân viên spa được phân công. |
| BusyFrom | timestamptz | NN | Sao chép từ Appointment.SlotStart. |
| BusyUntil | timestamptz | NN | Sao chép từ Appointment.BusyUntil. |
| IsHolding | boolean | NN, mặc định true | true khi lịch còn giữ chỗ nhân viên (Confirmed, Received, InProgress); false khi Hoàn tất hoặc Đã hủy. |
| AssignedAt | timestamptz | NN | Thời điểm phân công. |

> Ràng buộc bổ sung: BR-04 (đề xuất cho R-04): EXCLUDE USING gist (StaffId WITH =, tstzrange(BusyFrom, BusyUntil) WITH &&) WHERE (IsHolding). Khi lịch hẹn quay về Pending, xóa các dòng phân công của lịch đó (BR-26, BR-27).

### 4.2.12 AppointmentService

Các dịch vụ trong một lịch hẹn spa, kèm tiến độ từng dịch vụ. Giá và thời lượng không lưu tại đây: tính từ ServicePricing theo loài và nhóm kích cỡ đang áp dụng (FR-PAY-01: đơn giá hiện có).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| AppointmentId | uuid | PK, FK→Appointment | Lịch hẹn spa. |
| ServiceId | uuid | PK, FK→Service | Dịch vụ. |
| IsDone | boolean | NN, mặc định false | Dịch vụ đã thực hiện xong; Hoàn tất khi tất cả = true (BR-06). |
| DoneAt | timestamptz | NULL | Thời điểm hoàn thành dịch vụ. |
| Note | text | NULL | Ghi chú của nhân viên spa (FR-EXE-03). |

### 4.2.13 CostConfirmation

Yêu cầu khách xác nhận chi phí mới khi cân nặng làm tăng nhóm kích cỡ (BR-23).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| ConfirmationId | uuid | PK | Mã yêu cầu. |
| AppointmentId | uuid | FK→Appointment, NN | Lịch hẹn liên quan; tối đa một yêu cầu Pending mỗi lịch hẹn. |
| ActualWeightKg | numeric(5,2) | NN | Cân nặng thực tế gây tăng nhóm. |
| NewSizeGroup | varchar(10) | NN | Nhóm kích cỡ mới. |
| OldAmount | numeric(12,0) | NN | Chi phí trước khi tính lại. |
| NewAmount | numeric(12,0) | NN | Chi phí sau khi tính lại. |
| Status | varchar(10) | NN, CK | Pending \| Accepted \| Rejected \| Expired. |
| CreatedAt | timestamptz | NN | Thời điểm tạo yêu cầu. |
| ExpiresAt | timestamptz | NN | = CreatedAt + 30 phút; quá hạn không phản hồi ⇒ Expired và hủy lịch hẹn. |
| RespondedAt | timestamptz | NULL | Thời điểm phản hồi. |
| RespondedByUserId | uuid | FK→AppUser, NULL | Khách hàng, hoặc lễ tân ghi nhận hộ khách vãng lai/phản hồi trực tiếp (FR-EXE-11). |

### 4.2.14 AppointmentPhoto

Ảnh minh chứng trước/sau chăm sóc của lịch hẹn spa (BR-20).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| PhotoId | uuid | PK | Mã ảnh. |
| AppointmentId | uuid | FK→Appointment, NN | Lịch hẹn spa. |
| Kind | varchar(10) | NN, CK | Before \| After. |
| StorageKey | varchar(300) | NN | Khóa file trong kho lưu trữ ảnh (không lưu ảnh trong bảng). |
| UploadedByStaffId | uuid | FK→Staff, NN | Nhân viên spa được phân công tải lên. |
| UploadedAt | timestamptz | NN | Thời điểm tải lên; ảnh trước hợp lệ nếu là ảnh gần nhất của thú cưng và ≤ 7 ngày. |

### 4.2.15 Cage

Chuồng lưu trú; mỗi chuồng chứa một thú cưng tại một thời điểm.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| CageId | uuid | PK | Mã chuồng nội bộ. |
| Code | varchar(20) | UQ, NN | Mã chuồng hiển thị; trùng thì từ chối (FR-HTL-01). |
| Species | varchar(20) | NN, CK | Loài phù hợp. |
| SizeGroup | varchar(10) | NN, CK | Nhóm kích cỡ phù hợp. |
| IsActive | boolean | NN, mặc định true | false = ngừng sử dụng: không đề xuất, không tính sức chứa (FR-HTL-02). |

### 4.2.16 HotelPricing

Giá lưu trú và thức ăn theo đêm (BR-22).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| Species | varchar(20) | PK | Loài. |
| SizeGroup | varchar(10) | PK | Nhóm kích cỡ. |
| PricePerNight | numeric(12,0) | NN, CK ≥ 0 | Giá lưu trú/đêm. |
| FoodPerNight | numeric(12,0) | NN, CK ≥ 0 | Giá thức ăn do cửa hàng cung cấp/đêm. |

### 4.2.17 Payment

Khoản thanh toán của lịch hẹn: spa có 1 khoản; lưu trú tối đa 2 khoản (tiền lưu trú, phí phạt).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| PaymentId | uuid | PK | Mã khoản thanh toán. |
| AppointmentId | uuid | FK→Appointment, NN | Lịch hẹn. |
| Kind | varchar(10) | NN, CK | Spa \| Stay \| LateFee; UQ(AppointmentId, Kind). |
| Amount | numeric(12,0) | NN, CK ≥ 0 | Số tiền phải trả, hệ thống tính từ đơn giá hiện có và nhóm kích cỡ đã đối chiếu (FR-PAY-01); không nhận từ client. |
| Status | varchar(10) | NN, CK, mặc định Unpaid | Unpaid \| Paid (BR-07). |
| Method | varchar(10) | NULL, CK | Cash \| BankQR \| Online. |
| ReceivedAmount | numeric(12,0) | NULL | Số tiền thực nhận; Paid chỉ khi đủ (BR-17). |
| PaidAt | timestamptz | NULL | Thời điểm ghi nhận Paid. |
| ConfirmedByUserId | uuid | FK→AppUser, NULL | Lễ tân/quản lý xác nhận thanh toán tại quầy. |

### 4.2.18 PaymentTransaction

Giao dịch qua cổng thanh toán (khởi tạo + callback).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| TxnId | uuid | PK | Mã giao dịch nội bộ. |
| PaymentId | uuid | FK→Payment, NN | Khoản thanh toán. |
| Gateway | varchar(10) | NN, CK | VNPAY \| MoMo. |
| TxnRef | varchar(64) | UQ, NN | Mã tham chiếu gửi cổng; chống xử lý callback lặp. |
| RequestedAmount | numeric(12,0) | NN | Số tiền backend gửi sang cổng. |
| ConfirmedAmount | numeric(12,0) | NULL | Số tiền cổng xác nhận trong callback. |
| Result | varchar(10) | NULL | Success \| Failed. |
| SignatureValid | boolean | NULL | Kết quả xác minh chữ ký callback. |
| CreatedAt | timestamptz | NN | Thời điểm khởi tạo. |
| CallbackAt | timestamptz | NULL | Thời điểm nhận callback. |

### 4.2.19 Notification

Thông báo trên web gửi tới actor có tài khoản.

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| NotificationId | uuid | PK | Mã thông báo. |
| RecipientUserId | uuid | FK→AppUser, NN | Người nhận (chỉ xem thông báo của mình). |
| Type | varchar(20) | NN, CK | BookingReceived \| ConfirmedAssigned \| StatusChanged \| Cancelled \| PaymentRecorded \| CostConfirmation (FR-NOT-01→06). |
| AppointmentId | uuid | FK→Appointment, NULL | Lịch hẹn liên quan. |
| Message | varchar(500) | NN | Nội dung hiển thị. |
| IsRead | boolean | NN, mặc định false | Đã đọc. |
| CreatedAt | timestamptz | NN | Thời điểm tạo. |

### 4.2.20 WorkShift

Ca làm việc của nhân viên spa do quản lý phân lịch (FR-STF-04, bổ sung). Căn cứ tính số nhân viên khả dụng của khung giờ (BR-13) và đề xuất phân công (FR-ASG-01).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| ShiftId | uuid | PK | Mã ca. |
| StaffId | uuid | FK→Staff, NN | Nhân viên spa. |
| ShiftStart | timestamptz | NN | Bắt đầu ca. |
| ShiftEnd | timestamptz | NN, CK > ShiftStart | Kết thúc ca. |

> Ràng buộc bổ sung: Các ca của cùng một nhân viên không được chồng nhau: EXCLUDE USING gist (StaffId WITH =, tstzrange(ShiftStart, ShiftEnd) WITH &&).

### 4.2.21 SystemConfig

Tham số cấu hình nghiệp vụ lưu trong DB, quản lý chỉnh trên web quản lý (FR-CFG-01, xem 7.2).

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- |
| ConfigKey | varchar(100) | PK | Tên tham số. |
| ConfigValue | varchar(200) | NN | Giá trị. |
| Description | varchar(255) | NULL | Ý nghĩa, tham chiếu BR. |

# V. Thiết kế Chi tiết Hệ thống (Detailed System Design)

## 5.1 Thiết kế API (API Specification)

### 5.1.1 Quy ước chung

| Hạng mục | Quy ước |
| --- | --- |
| Giao thức, tiền tố | REST over HTTPS; JSON UTF-8; tiền tố /api/v1; tài liệu hóa bằng Swagger/OpenAPI. |
| Xác thực | Header Authorization: Bearer <accessToken> cho mọi endpoint trừ nhóm đánh dấu “Ẩn danh”. Webhook xác minh bằng chữ ký của cổng; endpoint nội bộ /internal/jobs/run xác minh header bí mật X-Job-Secret; hai loại này không dùng JWT. |
| Vai trò viết tắt | KH khách hàng; LT lễ tân; NVS nhân viên spa; QL quản lý. Ngoài vai trò, backend luôn kiểm tra quyền sở hữu/phạm vi (BR-16). |
| Dữ liệu do hệ thống quyết định | Request không có các trường: role, sizeGroup, status, amount, staffId (trừ khi QL xác nhận hoặc đổi lịch hẹn), cageId (trừ khi QL xác nhận hoặc đổi lịch hẹn). Trường thừa bị bỏ qua. |
| Thời gian, tiền | Thời gian ISO 8601 có múi giờ; tiền là số nguyên VND. |
| Danh sách | Tham số page, pageSize; trả { items, page, pageSize, total }. |
| Lỗi | Dạng ProblemDetails kèm code nghiệp vụ: { "status": 409, "code": "SLOT_FULL", "title": "...", "detail": "..." }. |

### 5.1.2 Mã trạng thái HTTP và mã lỗi nghiệp vụ

| HTTP | Ý nghĩa | Mã lỗi (code) và trường hợp |
| --- | --- | --- |
| 200 / 201 / 204 | Thành công / đã tạo / không nội dung | — |
| 400 | Dữ liệu không hợp lệ | VALIDATION_ERROR: thiếu trường bắt buộc, loài ngoài 4 loài, ngày trả không sau ngày nhận, số tiền không hợp lệ. |
| 401 | Chưa xác thực | UNAUTHENTICATED: thiếu/sai/hết hạn token; đăng nhập sai; tài khoản vô hiệu hóa; webhook sai chữ ký. |
| 403 | Không đủ quyền | FORBIDDEN: sai vai trò hoặc ngoài phạm vi sở hữu (BR-16); BOOKING_LOCKED: tài khoản bị khóa tự đặt lịch (BR-15). |
| 404 | Không tìm thấy | NOT_FOUND. |
| 409 | Xung đột nghiệp vụ | DUPLICATE_CONTACT; SLOT_FULL; NO_CAPACITY; STAFF_CONFLICT; CAGE_CONFLICT; INVALID_TRANSITION; CHANGE_WINDOW_CLOSED (quá mốc BR-08, hướng dẫn hotline); PHOTO_REQUIRED (thiếu ảnh trước/sau hợp lệ); SERVICES_INCOMPLETE; STAFF_COUNT_MISMATCH (số nhân viên chọn khác số cần); SHIFT_OVERLAP (chồng ca); SHIFT_HAS_APPOINTMENTS (còn lịch đã xác nhận trong phần ca bị bỏ); COST_CONFIRMATION_PENDING; PAYMENT_NOT_DUE; AMOUNT_MISMATCH; STAFF_OUT_OF_SHIFT (quản lý chọn nhân viên ngoài ca mà chưa xác nhận lại – Đề xuất); CUSTOMER_NOT_LOCKED (gỡ khóa khi khách không bị khóa – Đề xuất); DUPLICATE_CAGE_CODE (trùng mã chuồng – Đề xuất); COST_CONFIRMATION_EXPIRED (phản hồi xác nhận chi phí sau hạn – Đề xuất). |
| 429 | Quá giới hạn tần suất | RATE_LIMITED (đăng ký, đăng nhập, làm mới token, đặt lịch). |
| 500 | Lỗi hệ thống | Không lộ chi tiết nội bộ; ghi log. |

### 5.1.3 Danh sách endpoint, request, response và mã HTTP

| Method | Endpoint | Vai trò | Mô tả | Request → Response; mã HTTP | FR |
| --- | --- | --- | --- | --- | --- |
| **Xác thực & tài khoản** |  |  |  |  |  |
| POST | /auth/register | Ẩn danh | Đăng ký tài khoản khách hàng (Role luôn là Customer) | { userName (SĐT), fullName, password, email? } → 201 { userId }; 400, 409 DUPLICATE_CONTACT, 429 | FR-ACC-01 |
| POST | /auth/login | Ẩn danh | Đăng nhập, nhận access token và refresh token | { userName, password } → 200 { accessToken, refreshToken }; 401, 429 | FR-ACC-02 |
| POST | /auth/refresh | Ẩn danh (refresh token) | Làm mới token; từ chối nếu token bị thu hồi hoặc tài khoản vô hiệu hóa | { refreshToken } → 200 token mới; 401 | Req. 5.2 |
| POST | /auth/logout | Đã đăng nhập | Thu hồi refresh token | { refreshToken } → 204 | Req. 5.2 |
| GET | /me | Đã đăng nhập | Xem tài khoản của chính mình (lấy từ token) | — → 200 hồ sơ cá nhân; 401 | FR-ACC-03 |
| PUT | /me | Đã đăng nhập | Cập nhật thông tin cá nhân của chính mình | { fullName, phone?, email? } → 200; 400, 409 trùng liên hệ | FR-ACC-03 |
| **Khách hàng** |  |  |  |  |  |
| GET | /customers?search= | LT; QL (chỉ khách bị khóa) | Tìm khách theo thông tin liên hệ; QL xem danh sách khách bị khóa | query search → 200 danh sách khách; 403 | FR-ACC-04, FR-BOOK-07 |
| POST | /customers/walk-in | LT | Ghi nhận khách vãng lai (từ chối nếu trùng liên hệ) | { fullName, phone } → 201 { customerId }; 400, 409 DUPLICATE_CONTACT | FR-ACC-04 |
| POST | /customers/{id}/unlock-booking | QL | Gỡ khóa quyền tự đặt lịch trực tuyến | — → 204; 404, 409 CUSTOMER_NOT_LOCKED (không bị khóa) | FR-BOOK-07 |
| **Thú cưng** |  |  |  |  |  |
| POST | /pets | KH (của mình); LT (kèm customerId) | Tạo hồ sơ; hệ thống xác định SizeGroup | { name, species, breed, temperament, weightKg, heightCm?, coatNote?, notes?, customerId? } → 201 { petId, sizeGroup }; 400 | FR-PET-01, FR-PET-04 |
| GET | /pets | KH (của mình); LT (?customerId) | Danh sách hồ sơ đang hoạt động | — → 200 danh sách hồ sơ đang hoạt động; 403 | FR-PET-02 |
| GET | /pets/{id} | KH (của mình); LT; NVS (lịch được phân công); QL | Xem hồ sơ trong phạm vi | — → 200 hồ sơ; 403, 404 | FR-PET-02 |
| PUT | /pets/{id} | KH (của mình); LT | Cập nhật hồ sơ; xác định lại SizeGroup | như POST /pets → 200 { sizeGroup }; 400, 403, 404 | FR-PET-02, FR-PET-04 |
| DELETE | /pets/{id} | KH (của mình) | Gỡ bỏ: xóa hẳn hoặc xóa mềm theo BR-25 | — → 204; 403, 404 | FR-PET-03 |
| **Danh mục dịch vụ** |  |  |  |  |  |
| GET | /services?species=&sizeGroup= | Đã đăng nhập | Xem dịch vụ đang cung cấp kèm giá, thời lượng | query → 200 dịch vụ kèm giá, thời lượng, số nhân viên | FR-SVC-04 |
| POST | /services | QL | Thêm dịch vụ (kèm mốc giờ muộn nhất; giá, thời lượng, số nhân viên theo loài và nhóm kích cỡ) | { name, description, latestStartTime, pricing[{ species, sizeGroup, price, durationMinutes, staffRequired }] } → 201; 400, 403 | FR-SVC-01 |
| PUT | /services/{id} | QL | Sửa dịch vụ, loài, giá, thời lượng | như POST → 200; 400, 403, 404 | FR-SVC-02 |
| PATCH | /services/{id}/status | QL | Ngừng/mở lại cung cấp dịch vụ | { isActive } → 204; 403, 404 | FR-SVC-03 |
| **Lịch hẹn – đặt lịch & truy vấn** |  |  |  |  |  |
| GET | /spa/slots?date=&petId=&serviceIds= | KH; LT | Các mốc giờ 09:00–19:00 kèm trạng thái còn chỗ / đã kín / không nhận, theo thời lượng, số nhân viên, dọn dẹp (BR-13) | query → 200 { durationMinutes, staffRequired, bufferMinutes, slots[] }; 400, 403 | FR-BOOK-01, FR-BOOK-02 |
| POST | /appointments/spa | KH (của mình); LT (thay) | Tạo lịch spa “Chờ xác nhận” | { petId, serviceIds[], slotStart, customerId? } → 201 { appointmentId, status, slotEnd, staffRequired, estimatedAmount }; 400, 403 BOOKING_LOCKED, 409 SLOT_FULL | FR-BOOK-03 |
| GET | /hotel/availability?from=&to=&petId= | KH; LT; QL | Còn chỗ, số đêm, tiền lưu trú tạm tính | query → 200 { available, nights, estimatedAmount }; 400 | FR-HTL-04 |
| POST | /appointments/hotel | KH (của mình); LT (thay) | Tạo lịch lưu trú “Chờ xác nhận” | { petId, plannedCheckIn, plannedCheckOut, customerId? } → 201 { appointmentId, status, nights, estimatedAmount }; 400, 403 BOOKING_LOCKED, 409 NO_CAPACITY | FR-HTL-04 |
| GET | /appointments?type=&status=&date=&petId= | KH; LT; NVS; QL (theo phạm vi) | Danh sách, lịch sử, tổng quan tiến độ | query + page → 200 { items[], page, pageSize, total }; 403 | FR-BOOK-04, FR-BOOK-05, FR-EXE-01, FR-EXE-06, FR-EXE-08 |
| GET | /appointments/{id} | KH; LT; NVS; QL (theo phạm vi) | Chi tiết lịch hẹn; kiểm tra phạm vi theo id | — → 200 chi tiết; 403, 404 | FR-BOOK-04 |
| **Lịch hẹn – xác nhận, đổi, hủy** |  |  |  |  |  |
| GET | /appointments/{id}/suggestions | QL | Lịch spa: đề xuất đủ số nhân viên cần, xếp theo ít ca 30 ngày qua; lịch lưu trú: đề xuất chuồng | — → 200 { staffRequired, suggested[], alternatives[] } hoặc { cage }; 404, 409 | FR-ASG-01, FR-HTL-05 |
| POST | /appointments/{id}/confirm | QL | Xác nhận kèm staffIds (đủ số nhân viên cần) hoặc cageId | { staffIds[], confirmOutOfShift? } hoặc { cageId } → 200 { status = Confirmed }; 409 STAFF_CONFLICT, CAGE_CONFLICT, STAFF_COUNT_MISMATCH, STAFF_OUT_OF_SHIFT, INVALID_TRANSITION | FR-ASG-02, FR-ASG-03, FR-HTL-05 |
| POST | /appointments/{id}/reject | QL | Từ chối: cửa hàng không thể đáp ứng | — → 200 { status = Cancelled, reason = StoreUnable }; 409 INVALID_TRANSITION | FR-ASG-04, FR-HTL-06 |
| PUT | /appointments/{id} | KH (trong hạn); QL | Đổi lịch hẹn; KH đổi → về “Chờ xác nhận” | { slotStart \| plannedCheckIn/Out, petId, serviceIds[]; QL thêm: staffIds[] (spa) \| cageId (lưu trú), confirmOutOfShift? } → 200 { status = Pending (KH) }; 403, 409 CHANGE_WINDOW_CLOSED, SLOT_FULL, NO_CAPACITY, STAFF_CONFLICT, CAGE_CONFLICT, STAFF_COUNT_MISMATCH, STAFF_OUT_OF_SHIFT (Đề xuất, UC-15) | FR-CHG-01, FR-CHG-03 |
| POST | /appointments/{id}/cancel | KH (trong hạn); QL | Hủy kèm lý do; ngoài hạn KH bị chặn (409) | { reason? (QL) } → 200 { status = Cancelled }; 403, 409 CHANGE_WINDOW_CLOSED, INVALID_TRANSITION | FR-CHG-01, FR-CHG-02, FR-CHG-03 |
| **Lịch hẹn – thực hiện** |  |  |  |  |  |
| POST | /appointments/{id}/check-in | LT; QL | Spa: body {actualWeightKg}, tiếp nhận + đối chiếu. Lưu trú: không body, yêu cầu đã đối chiếu và đã thanh toán | spa: { actualWeightKg }; lưu trú: không body → 200 { status, weightCheck? }; 409 INVALID_TRANSITION, PAYMENT_NOT_DUE, COST_CONFIRMATION_PENDING | FR-EXE-02, FR-HTL-07 |
| POST | /appointments/{id}/weight-check | LT; QL | Lưu trú: ghi nhận và đối chiếu cân nặng trước khi thu tiền | { actualWeightKg } → 200 { weightCheck }; 409 INVALID_TRANSITION | FR-EXE-10 |
| POST | /appointments/{id}/cost-confirmation/respond | KH (của mình); LT (thay) | Xác nhận hoặc từ chối chi phí mới {accept} | { accept } → 200 { status }; 403, 409 COST_CONFIRMATION_EXPIRED (hết hạn) | FR-EXE-11 |
| POST | /appointments/{id}/start | NVS được phân công; QL | Spa: chuyển “Đang thực hiện” | — → 200 { status = InProgress }; 403, 409 PHOTO_REQUIRED, COST_CONFIRMATION_PENDING | FR-EXE-03, FR-EXE-05 |
| PATCH | /appointments/{id}/services/{serviceId} | NVS được phân công; QL | Đánh dấu dịch vụ xong {isDone, note} | { isDone, note? } → 200; 403, 409 INVALID_TRANSITION | FR-EXE-03 |
| POST | /appointments/{id}/complete | NVS được phân công; QL | Spa: chuyển “Hoàn tất” | — → 200 { status = Completed }; 403, 409 PHOTO_REQUIRED, SERVICES_INCOMPLETE | FR-EXE-04, FR-EXE-05 |
| POST | /appointments/{id}/check-out | LT; QL | Lưu trú: trả thú cưng, “Hoàn tất” | — → 200 { status = Completed, lateFee? }; 409 PAYMENT_NOT_DUE (phí phạt chưa trả) | FR-HTL-09 |
| POST | /appointments/{id}/photos | NVS được phân công | Tải ảnh (multipart: kind = Before \| After) | multipart { kind, file } → 201 { photoId }; 400, 403 | FR-EXE-09 |
| GET | /appointments/{id}/photos | KH (của mình); NVS được phân công; QL | Xem ảnh minh chứng | — → 200 danh sách ảnh (URL tạm thời); 403 | FR-EXE-09 |
| **Thanh toán** |  |  |  |  |  |
| GET | /appointments/{id}/payments | KH; LT; NVS; QL (theo phạm vi) | Các khoản thanh toán của một lịch hẹn | — → 200 các khoản thanh toán; 403 | FR-PAY-04 |
| GET | /payments?status= | QL | Tình hình thanh toán toàn cửa hàng | query + page → 200 danh sách; 403 | FR-PAY-04 |
| POST | /payments/{id}/counter | LT; QL | Ghi nhận tại quầy {method, receivedAmount} | { method, receivedAmount } → 200 { status = Paid }; 409 PAYMENT_NOT_DUE, AMOUNT_MISMATCH, COST_CONFIRMATION_PENDING (khoản tiền lưu trú khi lịch đang chờ xác nhận chi phí mới) | FR-PAY-02 |
| POST | /payments/{id}/online | KH (của mình) | Khởi tạo thanh toán {gateway: VNPAY \| MoMo}, trả paymentUrl | { gateway } → 200 { paymentUrl, txnRef }; 403, 409 PAYMENT_NOT_DUE | FR-PAY-03 |
| GET | /payments/ipn/vnpay | Ẩn danh + chữ ký cổng | Webhook VNPAY (xác minh chữ ký, đối chiếu số tiền) | tham số + chữ ký của cổng → phản hồi theo đặc tả cổng; 401 sai chữ ký | FR-PAY-03 |
| POST | /payments/ipn/momo | Ẩn danh + chữ ký cổng | Webhook MoMo (xác minh chữ ký, đối chiếu số tiền) | JSON + chữ ký của cổng → phản hồi theo đặc tả cổng; 401 sai chữ ký | FR-PAY-03 |
| **Lưu trú – chuồng & giá** |  |  |  |  |  |
| GET | /hotel/pricing | KH; LT; QL | Xem giá lưu trú, thức ăn, phí phạt trả muộn | — → 200 giá, thức ăn, phí phạt | FR-HTL-03 |
| PUT | /hotel/pricing | QL | Thiết lập giá lưu trú/thức ăn theo đêm và phí phạt | { pricing[], lateFeePerBlock } → 200; 400, 403 | FR-HTL-03 |
| GET | /cages | LT; QL | Danh sách chuồng và tình trạng (trống/đang chứa) | — → 200 chuồng + tình trạng (thú cưng, khách, trả dự kiến) | FR-HTL-08 |
| POST | /cages | QL | Thêm chuồng (từ chối nếu trùng mã) | { code, species, sizeGroup } → 201; 400, 409 DUPLICATE_CAGE_CODE (trùng mã) | FR-HTL-01 |
| PUT | /cages/{id} | QL | Cập nhật chuồng | { code?, species?, sizeGroup? } → 200; 409 DUPLICATE_CAGE_CODE (trùng mã) | FR-HTL-02 |
| PATCH | /cages/{id}/status | QL | Ngừng/mở lại sử dụng chuồng | { isActive } → 204; 404 | FR-HTL-02 |
| **Lịch làm việc, cấu hình, tác vụ nền** |  |  |  |  |  |
| GET | /work-shifts?staffId=&from=&to= | QL | Xem ca làm của nhân viên spa theo tuần | query → 200 danh sách ca; 403 | FR-STF-04 |
| POST | /work-shifts | QL | Thêm ca (từ chối nếu chồng ca) | { staffId, shiftStart, shiftEnd } → 201; 400, 409 SHIFT_OVERLAP | FR-STF-04 |
| PUT | /work-shifts/{id} | QL | Sửa ca (từ chối nếu còn lịch đã xác nhận trong phần bị bỏ) | { shiftStart, shiftEnd } → 200; 409 SHIFT_OVERLAP, SHIFT_HAS_APPOINTMENTS | FR-STF-04 |
| DELETE | /work-shifts/{id} | QL | Xóa ca (cùng kiểm tra như sửa) | — → 204; 409 SHIFT_HAS_APPOINTMENTS | FR-STF-04 |
| GET | /config | QL | Xem tham số cấu hình và bảng mốc kích cỡ, dung sai | — → 200 tham số, bảng mốc kích cỡ, dung sai | FR-CFG-01 |
| PUT | /config | QL | Cập nhật tham số (kiểm tra khoảng hợp lệ) | { key: value… } → 200; 400 ngoài khoảng cho phép | FR-CFG-01 |
| POST | /internal/jobs/run | Bí mật (header X-Job-Secret) | Kích hoạt tác vụ nền: hủy vắng mặt, khóa tự đặt lịch, hết hạn xác nhận chi phí; đồng thời giữ dịch vụ thức | header X-Job-Secret → 200 { processed }; 401 | FR-BOOK-06, FR-EXE-07, FR-EXE-11 |
| **Nhân viên** |  |  |  |  |  |
| GET | /staff | QL | Danh sách nhân viên | — → 200 danh sách nhân viên | FR-STF-02 |
| POST | /staff | QL | Tạo tài khoản, hồ sơ nhân viên (Role = Staff + vai trò LT/NVS) | { userName (SĐT), fullName, staffRole, password } → 201; 400, 409 | FR-STF-01 |
| PUT | /staff/{id} | QL | Cập nhật thông tin, vai trò | { fullName, staffRole } → 200; 400, 404 | FR-STF-02 |
| POST | /staff/{id}/deactivate | QL | Vô hiệu hóa; lịch spa “Đã xác nhận” về “Chờ xác nhận” | — → 200 { returnedToPending: n }; 404 | FR-STF-03 |
| **Thông báo** |  |  |  |  |  |
| GET | /notifications | KH; NVS | Thông báo của chính mình | page → 200 { items[], unread } | FR-NOT-01 → FR-NOT-06 |
| POST | /notifications/{id}/read | KH; NVS | Đánh dấu đã đọc | — → 204; 403 | FR-NOT-01 → FR-NOT-06 |

**FR không có endpoint riêng** vì do hệ thống tự thực hiện: FR-BOOK-06 và FR-EXE-07 (tác vụ nền, UC-21, được kích hoạt qua /internal/jobs/run), FR-PAY-01 (tính số tiền trong các endpoint thanh toán), FR-LFC-01 và FR-LFC-02 (máy trạng thái, mục 5.4). FR-ASG-01 và FR-PET-04 nằm trong endpoint suggestions và /pets.

Webhook VNPAY dùng GET vì cổng gọi IPN bằng query string; webhook MoMo dùng POST với JSON (đặc tả cụ thể theo tài liệu từng cổng – R-05).

### 5.1.4 Ví dụ request / response

**(0) Mốc giờ còn chỗ** – `GET /api/v1/spa/slots?date=2026-10-06&petId=5f1c…&serviceIds=a1…,b2…` (KH, LT).

```
200 OK
{ "durationMinutes": 120, "staffRequired": 1, "bufferMinutes": 15,
  "slots": [ { "time": "09:00", "group": "Morning", "status": "Available" },
             { "time": "10:00", "group": "Morning", "status": "Full" },
             { "time": "18:00", "group": "Evening", "status": "Available" },
             { "time": "19:00", "group": "Evening", "status": "NotAccepted" } ] }
// status: Available | Full | NotAccepted (muộn hơn mốc bắt đầu muộn nhất của dịch vụ)
```

**(1) Đặt lịch spa** – `POST /api/v1/appointments/spa` (KH). Lễ tân đặt thay thêm `customerId`.

```json
{ "petId": "5f1c…", "serviceIds": ["a1…", "b2…"], "slotStart": "2026-10-06T09:00:00+07:00" }
```

```
201 Created
{ "appointmentId": "c9e4…", "type": "Spa", "status": "Pending", "sizeGroup": "Small",
  "slotStart": "2026-10-06T09:00:00+07:00", "slotEnd": "2026-10-06T11:00:00+07:00", "staffRequired": 1, "estimatedAmount": 270000 }
```

```
409 Conflict
{ "status": 409, "code": "SLOT_FULL", "title": "Khung giờ đã kín", "detail": "Vui lòng chọn khung giờ khác." }
```

**(2) Tiếp nhận spa và đối chiếu cân nặng** – `POST /api/v1/appointments/{id}/check-in` (LT).

```json
{ "actualWeightKg": 11.2 }
```

```
200 OK
{ "status": "Received",
  "weightCheck": { "result": "NEEDS_CONFIRMATION", "newSizeGroup": "Medium",
                   "oldAmount": 270000, "newAmount": 330000, "expiresAt": "2026-10-06T09:30:00+07:00" } }
// result: OK | PRICE_DECREASED | NEEDS_CONFIRMATION
```

## 5.2 Biểu đồ lớp (Class Diagram)

Mô hình lớp của tầng **Domain** (3.1): các thực thể và hai domain service tính toán. Các lớp này không phụ thuộc EF Core, ASP.NET Core hay Identity; ánh xạ sang bảng CSDL (4.2) do tầng Infrastructure cấu hình. Application Services và các port không thuộc biểu đồ này (xem 3.1 và 5.3). Lưu ý: lớp AppointmentService và lớp Service dưới đây là thực thể nghiệp vụ (dịch vụ spa), không phải Application Service của tầng Application. Logic chuyển trạng thái nằm trong lớp Appointment và các lớp con; SlotService cung cấp quy tắc mốc giờ còn chỗ và đề xuất nhân viên (2.3.3), PricingService cung cấp BR-11, BR-22.

**Các lớp** (thuộc tính; phương thức):

1. **AppUser:** UserId, UserName, Role, IsActive. (Mật khẩu băm và refresh token do Infrastructure quản lý qua port danh tính & token – 3.1, 4.2.1–4.2.2.)
2. **Customer:** FullName, Phone, IsBookingLocked; HasAccount().
3. **Notification:** Type, Message, IsRead.
4. **Staff:** FullName, StaffRole.
5. **WorkShift:** ShiftStart, ShiftEnd.
6. **Pet:** Name, Species, Temperament, WeightKg, HeightCm, SizeGroup, IsActive; DetermineSizeGroup().
7. **Appointment** (lớp trừu tượng): Status, CancelReason, SizeGroup, ActualWeightKg; Confirm(), Cancel(reason), ReturnToPending(), RecordWeight(kg).
8. **SpaAppointment** (kế thừa Appointment): SlotStart, SlotEnd, BusyUntil, StaffRequired; AssignStaff(staffList), Receive(kg), Start(), Complete().
9. **HotelAppointment** (kế thừa Appointment): PlannedCheckIn, PlannedCheckOut, ActualCheckOut; AssignCage(cage), CheckIn(), CheckOut(time), Nights().
10. **Cage:** Code, Species, SizeGroup, IsActive.
11. **CostConfirmation:** NewSizeGroup, NewAmount, Status, ExpiresAt; Accept(), Reject(), Expire().
12. **Payment:** Kind, Amount, Status, Method; MarkPaid(received).
13. **PaymentTransaction:** TxnRef, Gateway, ConfirmedAmount, Result.
14. **AppointmentPhoto:** Kind, UploadedAt.
15. **AppointmentService:** IsDone, DoneAt, Note.
16. **Service:** Name, LatestStartTime, IsActive.
17. **ServicePricing:** Species, SizeGroup, Price, DurationMinutes, StaffRequired.
18. **SlotService** («domain service»): AvailableSlots(), AvailableCages(), SuggestStaff().
19. **PricingService** («domain service»): SpaAmount(), StayAmount(), LateFee().

**Quan hệ giữa các lớp:**

1. AppUser 1 – 0..1 Customer.
2. AppUser 1 – 0..* Notification.
3. AppUser 1 – 0..1 Staff.
4. Customer 1 – 0..* Pet.
5. Customer 1 – 0..* Appointment.
6. Pet 1 – 0..* Appointment.
7. SpaAppointment và HotelAppointment kế thừa Appointment.
8. Appointment 1 – 0..* CostConfirmation (thành phần).
9. Appointment 1 – 0..2 Payment (thành phần).
10. HotelAppointment 0..* – 0..1 Cage (quan hệ “gán”).
11. SpaAppointment 0..* – 0..* Staff (quan hệ “phân công”, qua AppointmentStaff).
12. SpaAppointment 1 – 0..* AppointmentPhoto (thành phần).
13. SpaAppointment 1 – 1..* AppointmentService (thành phần).
14. Service 1 – 1..* ServicePricing (thành phần).
15. Service 1 – 0..* AppointmentService.
16. Payment 1 – 0..* PaymentTransaction (thành phần).
17. Staff 1 – 0..* WorkShift.
18. SlotService phụ thuộc Cage và WorkShift.
19. PricingService phụ thuộc Payment và ServicePricing.

*Hình 5.1 – Biểu đồ lớp miền (tầng Domain)*

## 5.3 Biểu đồ tuần tự (Sequence Diagram)

Năm luồng quan trọng nhất về bảo mật, đồng thời và tiền.

Quy ước theo Clean Architecture (3.1): Controller (tầng API) chỉ xác thực dữ liệu đầu vào, kiểm tra vai trò rồi gọi Application Service; mọi truy cập PostgreSQL, Supabase Storage, cổng thanh toán và việc phát hành token đi qua port của Application, do adapter ở Infrastructure hiện thực. Để gọn, port và adapter không vẽ thành đối tượng riêng; “PostgreSQL” trong các luồng dưới đây hiểu là truy cập qua port truy cập dữ liệu / port giao dịch.

**SD-01 – Đăng nhập và làm mới token** (UC-02)

Đối tượng tham gia: Web, AuthController, AuthService, PostgreSQL.

1. Web gửi `POST /auth/login {userName, password}` tới AuthController.
2. AuthController (FluentValidation, rate limiting) gọi AuthService: `Login(dto)`.
3. AuthService tìm AppUser theo UserName trong PostgreSQL.
4. Nếu không tồn tại / IsActive = false / sai mật khẩu:
   - AuthService ghi log đăng nhập thất bại (không ghi mật khẩu).
   - AuthController trả `401 Unauthorized` cho Web.
5. Nếu hợp lệ:
   - AuthService tạo access token JWT (UserId, Role; hạn ngắn) qua port danh tính & token.
   - AuthService lưu băm của refresh token vào PostgreSQL.
   - AuthController trả `200 {accessToken, refreshToken}` cho Web.
6. Khi access token hết hạn, Web gửi `POST /auth/refresh {refreshToken}` tới AuthController; AuthController gọi AuthService: `Refresh(token)`.
7. AuthService đối chiếu băm trong PostgreSQL: chưa thu hồi, chưa hết hạn; kiểm tra AppUser.IsActive.
8. Nếu hợp lệ:
   - AuthService thu hồi token cũ và lưu token mới (xoay vòng – đề xuất).
   - AuthController trả `200 {accessToken, refreshToken}`.
9. Nếu không hợp lệ: AuthController trả `401`; web chuyển về màn hình đăng nhập.

*Hình 5.2 – SD-01 Đăng nhập*

**SD-02 – Đặt lịch spa** (UC-10): tính mốc giờ còn chỗ và giữ chỗ trong giao dịch có khóa (BR-13, BR-18).

Đối tượng tham gia: Khách hàng, Web khách hàng, API (Controller), BookingService, NotificationService, PostgreSQL.

1. Khách hàng chọn thú cưng, dịch vụ, ngày trên Web khách hàng.
2. Web gửi `GET /spa/slots?date&petId&serviceIds` tới API.
3. API gọi BookingService để lấy mốc giờ còn chỗ (dùng SlotService ở Domain); BookingService truy vấn PostgreSQL: mốc giờ 09:00–19:00; thời lượng, số nhân viên cần, buffer; ca làm (WorkShift); lịch hẹn giữ chỗ chồng lấn.
4. API trả Web: mỗi mốc giờ là còn chỗ / đã kín / không nhận dịch vụ ở mốc này (LatestStartTime).
5. Khách hàng chọn khung giờ và gửi yêu cầu.
6. Web gửi `POST /appointments/spa {petId, serviceIds, slotStart}` tới API.
7. API xác thực JWT và vai trò.
8. API gọi BookingService: `CreateSpa(dto, userId)`.
9. BookingService kiểm tra thú cưng thuộc khách (BR-16), IsBookingLocked (BR-15) và dịch vụ phù hợp loài (BR-02).
10. BookingService mở giao dịch trong PostgreSQL (BEGIN) và khóa theo ngày (advisory lock).
11. BookingService đếm lại lịch hẹn chồng lấn so với năng lực (BR-13, BR-18) bằng SlotService.
12. Nếu hết năng lực:
    - BookingService ROLLBACK.
    - API trả `409 SLOT_FULL`; khách chọn khung giờ khác.
13. Nếu còn năng lực:
    - BookingService INSERT Appointment (Pending, nhóm kích cỡ, SlotStart/End, BusyUntil, StaffRequired) và AppointmentService.
    - BookingService COMMIT.
    - BookingService gọi NotificationService: BookingReceived (nếu khách có tài khoản).
    - API trả `201 {appointmentId, status = Pending}`.

*Hình 5.3 – SD-02 Đặt lịch spa*

**SD-03 – Xác nhận lịch hẹn và phân công** (UC-12): đề xuất theo 3 tiêu chí, không trùng nhân viên (BR-04).

Đối tượng tham gia: Quản lý, Web quản lý, API, AssignmentService, NotificationService, PostgreSQL.

1. Quản lý mở lịch hẹn “Chờ xác nhận” trên Web quản lý.
2. Web gửi `GET /appointments/{id}/suggestions` tới API; API gọi AssignmentService: `Suggest(id)`.
3. AssignmentService truy vấn PostgreSQL: nhân viên spa hoạt động, có ca bao phủ, chưa có lịch trùng; xếp theo số ca 30 ngày qua tăng dần; lấy đủ StaffRequired người.
4. API trả Web: đề xuất N nhân viên (kèm số ca 30 ngày qua).
5. Quản lý bấm xác nhận đề xuất hoặc tự đổi nhân viên khác.
6. Web gửi `POST /appointments/{id}/confirm {staffIds[]}` tới API.
7. API kiểm tra lại ở backend: role = Manager (chính sách theo vai trò).
8. API gọi AssignmentService: `Confirm(id, staffIds)`.
9. AssignmentService mở giao dịch (BEGIN), SELECT lịch hẹn FOR UPDATE.
10. AssignmentService kiểm tra Status phải là Pending (BR-14).
11. AssignmentService kiểm tra đủ StaffRequired người; chọn tay nhân viên ngoài ca thì cảnh báo.
12. AssignmentService INSERT AppointmentStaff (IsHolding), đặt Status = Confirmed; tính lại tiền nếu lịch từng được khách thay đổi (BR-26).
13. Nếu có nhân viên trùng khung giờ (ràng buộc loại trừ):
    - ROLLBACK.
    - API trả `409 STAFF_CONFLICT` (BR-04).
14. Nếu thành công:
    - COMMIT.
    - AssignmentService gọi NotificationService: ConfirmedAssigned gửi khách hàng (nếu có tài khoản) và các nhân viên spa được phân công.
    - API trả `200 {status = Confirmed}`.

*Hình 5.4 – SD-03 Xác nhận và phân công*

**SD-04 – Tiếp nhận, đối chiếu cân nặng, xác nhận chi phí mới** (UC-16, 17, 30): BR-23.

Đối tượng tham gia: Lễ tân, Web nhân viên, API, CheckInService, Web khách hàng, Job nền, PostgreSQL.

1. Lễ tân nhập cân nặng thực tế khi tiếp nhận trên Web nhân viên.
2. Web gửi `POST /appointments/{id}/check-in {actualWeightKg}` tới API; API gọi CheckInService: `CheckIn(id, kg)`.
3. CheckInService kiểm tra trong PostgreSQL: lịch hẹn Confirmed và ≤ 15 phút sau giờ hẹn (BR-08).
4. CheckInService so với cân nặng hồ sơ, ngưỡng dung sai, nhóm kích cỡ mới (BR-19, BR-23).
5. Trường hợp giảm / trong ngưỡng / vượt ngưỡng nhưng cùng nhóm:
   - Đặt Status = Received và ghi cân nặng (xuống nhóm nhỏ thì tính lại giảm giá).
   - API trả `200 {result = OK}`.
6. Trường hợp tăng vượt ngưỡng và sang nhóm lớn hơn:
   - Đặt Status = Received; INSERT CostConfirmation (Pending, ExpiresAt = +30 phút).
   - CheckInService thông báo CostConfirmation cho Web khách hàng (nếu có tài khoản).
   - API trả `200 {result = NEEDS_CONFIRMATION}`.
   - Sau đó, một trong ba khả năng:
     1. Khách xác nhận (hoặc lễ tân ghi nhận hộ khách vãng lai): Web khách hàng gửi `POST /appointments/{id}/cost-confirmation/respond {accept = true}`; API gọi Application Service cập nhật Accepted, SizeGroup, giá, hồ sơ thú cưng.
     2. Khách từ chối: gửi `respond {accept = false}`; API gọi Application Service cập nhật Rejected, lịch hẹn Cancelled (CostNotConfirmed), thông báo hủy.
     3. Quá 30 phút không phản hồi: Job nền (gọi Application Service) cập nhật Expired, lịch hẹn Cancelled (CostNotConfirmed), thông báo hủy.

*Hình 5.5 – SD-04 Đối chiếu cân nặng*

**SD-05 – Thanh toán trực tuyến** (UC-24): webhook, chữ ký, đối chiếu số tiền (BR-17).

Đối tượng tham gia: Khách hàng, Web khách hàng, API, PaymentService, VNPAY / MoMo (sandbox), PostgreSQL.

1. Khách hàng bấm “Thanh toán trực tuyến” trên Web khách hàng.
2. Web gửi `POST /payments/{id}/online {gateway}` tới API.
3. API xác thực JWT và vai trò.
4. API gọi PaymentService: `StartOnline(id, gateway, userId)`; PaymentService kiểm tra: lịch hẹn thuộc khách (BR-16), Kind = Spa, lịch Completed, Payment = Unpaid.
5. PaymentService INSERT PaymentTransaction (TxnRef, RequestedAmount = Payment.Amount) vào PostgreSQL.
6. PaymentService gửi cổng thanh toán yêu cầu tạo thanh toán qua port cổng thanh toán (số tiền do hệ thống xác định, có chữ ký).
7. API trả Web `200 {paymentUrl}`.
8. Web chuyển hướng sang cổng; khách thanh toán.
9. Cổng gọi callback / webhook về API (TxnRef, số tiền, kết quả, chữ ký), không mang JWT.
10. API gọi PaymentService: `HandleCallback(payload)`; PaymentService xác minh chữ ký bằng secret của cổng (qua port cổng thanh toán).
11. Nếu chữ ký không hợp lệ:
    - Ghi log bảo mật; không cập nhật thanh toán.
    - API từ chối với cổng.
12. Nếu hợp lệ: PaymentService BEGIN, khóa Payment, bỏ qua nếu TxnRef đã xử lý. Sau đó:
    - Nếu số tiền cổng xác nhận khác Amount (BR-17): ROLLBACK, giữ Unpaid, ghi log.
    - Nếu khớp đủ: Payment = Paid (Online, PaidAt), COMMIT; thông báo PaymentRecorded cho khách.
    - API phản hồi xác nhận cho cổng theo đặc tả của cổng.
13. Cổng chuyển hướng khách về trang kết quả.
14. Web gửi `GET /appointments/{id}/payments`; API trả trạng thái thanh toán hiện tại.

*Hình 5.6 – SD-05 Thanh toán trực tuyến*

## 5.4 Biểu đồ trạng thái (State Diagram)

Máy trạng thái hiện thực FR-LFC-01, FR-LFC-02 và BR-14: chỉ chuyển đúng trình tự tiến; “Đã hủy” từ mọi trạng thái trước “Hoàn tất” và là trạng thái kết thúc; chỉ “Đã xác nhận” → “Chờ xác nhận” là chuyển ngược được phép (BR-26, BR-27). Không có trạng thái “Hoàn tiền” (BR-24).

Các trạng thái: Chờ xác nhận, Đã xác nhận, Đã tiếp nhận, Đang thực hiện, Hoàn tất, Đã hủy. Các chuyển trạng thái:

1. (Bắt đầu) → **Chờ xác nhận:** khách / lễ tân đặt lịch (FR-BOOK-03).
2. **Chờ xác nhận** → **Đã xác nhận:** quản lý xác nhận + nhân viên spa phụ trách (FR-ASG-03).
3. **Đã xác nhận** → **Chờ xác nhận:** khách thay đổi (BR-26) hoặc nhân viên spa bị vô hiệu hóa (BR-27).
4. **Đã xác nhận** → **Đã tiếp nhận:** lễ tân tiếp nhận + ghi cân nặng, ≤ 15 phút sau giờ hẹn (FR-EXE-02).
5. **Đã tiếp nhận** → **Đang thực hiện:** có ảnh trước hợp lệ (BR-20) và không chờ xác nhận chi phí (BR-23).
6. **Đang thực hiện** → **Hoàn tất:** mọi dịch vụ xong + có ảnh sau (BR-06, BR-20).
7. **Chờ xác nhận** → **Đã hủy:** lý do (a), (b), (c).
8. **Đã xác nhận** → **Đã hủy:** lý do (a), (b), (c), (d).
9. **Đã tiếp nhận** → **Đã hủy:** lý do (b), (c), (e).
10. **Đang thực hiện** → **Đã hủy:** lý do (b), (c) (chỉ quản lý; BR-14; Đề xuất).
11. **Hoàn tất** → (Kết thúc); **Đã hủy** → (Kết thúc).

Lý do hủy (Requirements 3.3):

| Mã | Lý do hủy |
| --- | --- |
| (a) | Khách tự hủy trong hạn |
| (b) | Cửa hàng không thể đáp ứng |
| (c) | Khách hủy ngoài hạn, quản lý xử lý |
| (d) | Vắng mặt quá 15 phút |
| (e) | Khách từ chối / quá 30 phút không xác nhận chi phí mới |

*Hình 5.7 – Vòng đời lịch hẹn spa*

Các trạng thái: Chờ xác nhận, Đã xác nhận, Đang lưu trú, Hoàn tất, Đã hủy. Các chuyển trạng thái:

1. (Bắt đầu) → **Chờ xác nhận:** khách / lễ tân đặt lưu trú (FR-HTL-04).
2. **Chờ xác nhận** → **Đã xác nhận:** quản lý gán chuồng, xác nhận (FR-HTL-05).
3. **Đã xác nhận** → **Chờ xác nhận:** khách thay đổi (BR-26).
4. **Đã xác nhận** → **Đang lưu trú:** đã đối chiếu cân nặng, không chờ xác nhận chi phí, tiền lưu trú đã thanh toán, ≤ 15 phút sau giờ nhận (FR-HTL-07, BR-07, BR-23).
5. **Đang lưu trú** → **Hoàn tất:** lễ tân trả thú cưng; phí phạt (nếu có) đã thanh toán; giải phóng chuồng (FR-HTL-09).
6. **Chờ xác nhận** → **Đã hủy:** lý do (a), (b), (c).
7. **Đã xác nhận** → **Đã hủy:** lý do (a), (b), (c), (d), (e).
8. **Đang lưu trú** → **Đã hủy:** lý do (b), (c) (chỉ quản lý; BR-14; Đề xuất).
9. **Hoàn tất** → (Kết thúc); **Đã hủy** → (Kết thúc).

Lý do hủy:

| Mã | Lý do hủy |
| --- | --- |
| (a) | Khách tự hủy trong hạn |
| (b) | Cửa hàng không thể đáp ứng (hết chuồng) |
| (c) | Khách hủy ngoài hạn, quản lý xử lý |
| (d) | Vắng mặt quá 15 phút |
| (e) | Không xác nhận chi phí mới |

*Hình 5.8 – Vòng đời lịch hẹn lưu trú*

**Khoản thanh toán** (Chưa thanh toán, Đã thanh toán):

1. (Bắt đầu) → **Chưa thanh toán:** đến thời điểm ghi nhận (BR-07).
2. **Chưa thanh toán** → **Đã thanh toán:** số tiền thực nhận không thấp hơn số tiền phải trả (BR-17); với thanh toán trực tuyến, số tiền cổng xác nhận khớp đủ.
3. **Đã thanh toán** → (Kết thúc).

**Yêu cầu xác nhận chi phí mới** (Chờ phản hồi, Đã chấp nhận, Từ chối, Hết hạn):

1. (Bắt đầu) → **Chờ phản hồi:** tăng nhóm kích cỡ vượt ngưỡng (BR-23).
2. **Chờ phản hồi** → **Đã chấp nhận:** khách xác nhận.
3. **Chờ phản hồi** → **Từ chối:** khách từ chối ⇒ hủy lịch hẹn.
4. **Chờ phản hồi** → **Hết hạn:** quá 30 phút ⇒ hủy lịch hẹn.

**Quyền tự đặt lịch trực tuyến** (Được phép, Bị khóa):

1. (Bắt đầu) → **Được phép.**
2. **Được phép** → **Bị khóa:** vắng mặt lần thứ 4 trong 30 ngày (BR-15).
3. **Bị khóa** → **Được phép:** quản lý gỡ khóa (FR-BOOK-07).

*Hình 5.9 – Vòng đời khoản thanh toán, yêu cầu xác nhận chi phí, quyền tự đặt lịch*

| Khoản thanh toán | Thời điểm ghi nhận (BR-07) và điều kiện |
| --- | --- |
| Spa | Chỉ khi lịch hẹn “Hoàn tất”; thanh toán tại quầy hoặc trực tuyến. |
| Tiền lưu trú | Khi lịch hẹn “Đã xác nhận”, trước khi tiếp nhận; chỉ tại quầy; điều kiện để chuyển “Đang lưu trú”. |
| Phí phạt trả muộn | Khi lịch hẹn “Đang lưu trú” lúc trả thú cưng; chỉ tại quầy; điều kiện để chuyển “Hoàn tất” (nếu có phí). |

# VI. Thiết kế Giao diện Người dùng (UI/UX Design)

Requirements chưa có định hướng giao diện; phần này là **đề xuất (X-07)** theo phong cách spa thú cưng: sạch, dịu, thân thiện. Mọi tài nguyên đều miễn phí (phông chữ Be Vietnam Pro dưới giấy phép SIL OFL, biểu tượng mã nguồn mở, bộ thành phần tự xây). Các hình giao diện dùng dữ liệu minh họa. Sản phẩm thiết kế gốc (Figma hoặc tương đương) chưa có; nhóm có thể dựng lại từ mockup và quy tắc dưới đây.

## 6.1 Nguyên tắc thiết kế (Design Guidelines & System)

### Bảng màu (Color Palette)

| Tên / mã màu | Tương phản | Dùng cho |
| --- | --- | --- |
| Lagoon #0B6E78 | Chữ trắng 5,97 : 1 | Nút chính, liên kết, mục đang chọn |
| Lagoon đậm #084F57 | Chữ trắng 9,27 : 1 | Tiêu đề nhấn, trạng thái hover/pressed |
| Lagoon nhạt #DDF1F2 | Chữ #084F57 đạt | Nền mục chọn, badge “Đang thực hiện” |
| Apricot #F5A524 | Chữ #14323A 6,65 : 1 | Điểm nhấn: nhãn “Hệ thống đề xuất”, số chờ xử lý. Không dùng làm chữ trên nền trắng |
| Ink #14323A | 13,57 : 1 trên trắng | Chữ chính |
| Muted #5B7178 | 5,15 : 1 trên trắng | Chữ phụ, nhãn |
| Mist #F5F9FA | — | Nền trang |
| Line #D6E4E7 | — | Viền, đường kẻ |
| Success #237A47 | Chữ trắng 5,32 : 1 | Thành công, bước đã hoàn thành |
| Danger #B3372B | Chữ trắng 6,00 : 1 | Lỗi, từ chối, hủy |
| Info #2F6FB5 | Chữ trắng 5,17 : 1 | Thông tin, liên kết phụ |

**Màu trạng thái lịch hẹn** – luôn đi kèm chữ, không chỉ dựa vào màu:

| Trạng thái | Nền | Chữ | Tương phản |
| --- | --- | --- | --- |
| Chờ xác nhận | #FFF1CC | #7A4B00 | 6,60 : 1 |
| Đã xác nhận | #DCE9F8 | #1F4E8C | 6,75 : 1 |
| Đã tiếp nhận | #E6E4FA | #3E3A8F | 7,63 : 1 |
| Đang thực hiện / Đang lưu trú | #DDF1F2 | #0B6E78 | 5,10 : 1 |
| Hoàn tất | #DDF1DD | #1E6B3C | 5,49 : 1 |
| Đã hủy | #F8DADA | #8A1F16 | 7,01 : 1 |

### Nghệ thuật chữ (Typography)

| Hạng mục | Quy định |
| --- | --- |
| **Phông chữ** | **Be Vietnam Pro** (thiết kế cho tiếng Việt) cho toàn bộ giao diện; dự phòng system-ui, sans-serif. Hiển thị tiền 270.000đ, ngày dd/MM/yyyy, giờ 24 giờ; số dùng chữ số đều (tabular) trong bảng. |
| **Cỡ chữ** | H1 24/32 đậm · H2 17/24 · H3 14/20 · Nội dung 14/22· Chú thích 12/16. |
| **Độ đậm** | 400 nội dung; 500 menu; 600 nhãn và tiêu đề nhỏ; 700 tiêu đề trang và số tiền tổng. |

### Thư viện thành phần (UI Component Library)

Bộ thành phần dùng chung cho cả 3 web, xây trên TailwindCSS, lưu thành token (màu, cỡ chữ, khoảng cách, bo góc) để các web đồng nhất. Lưới khoảng cách 4 px; bo góc 10–12 px; vùng chạm tối thiểu 44 px cho web nhân viên; biểu tượng dùng một bộ nét mảnh thống nhất.

| Thành phần | Biến thể và quy tắc |
| --- | --- |
| **Button** | Primary (nền Lagoon), Secondary (viền Lagoon), Danger (viền Danger, dùng cho hủy/từ chối), Disabled (nền xám, kèm lý do). Mỗi màn hình có tối đa một Primary. |
| **Input / Select / DatePicker** | Nhãn luôn hiển thị phía trên; trạng thái mặc định, focus (viền Lagoon + vòng sáng), lỗi (viền Danger + thông báo dưới trường), vô hiệu hóa. Tích hợp React Hook Form. |
| **Slot picker** | Thanh chọn ngày + lưới mốc giờ chia Sáng / Trưa / Chiều-tối: còn chỗ, đã chọn, đã kín (nét đứt, chữ “Đã kín”), không nhận dịch vụ ở mốc này (nền vàng nhạt, ghi chú ngắn). |
| **Badge trạng thái** | Sáu màu ở bảng trên. |
| **Table** | Tiêu đề cột cố định, hàng chọn nền Lagoon nhạt, phân trang, lọc theo trạng thái/loại/ngày. |
| **Card, Stepper, Timeline** | Card cho khối thông tin; Stepper cho luồng đặt lịch nhiều bước; Timeline cho tiến trình lịch hẹn. |
| **Modal / Dialog** | Xác nhận hành động nguy hiểm: nêu hậu quả, nút Danger và nút Hủy bỏ. |
| **Biểu tượng (Icons)** | Một bộ biểu tượng nét mảnh mã nguồn mở dùng thống nhất; luôn đi kèm nhãn chữ ở nút quan trọng, kích thước 16–24 px. |
| **Toast / Alert** | Toast cho kết quả tức thời; Alert nội tuyến cho cảnh báo nghiệp vụ (ví dụ cần xác nhận chi phí mới). |
| **Banner đếm ngược** | Dùng cho yêu cầu xác nhận chi phí mới (30 phút). |
| **Upload ảnh** | Khung kéo-thả/chụp ảnh, xem trước, nhãn Trước/Sau, thanh tiến trình. |
| **Điều hướng** | Desktop: thanh trên (khách hàng, nhân viên) hoặc thanh bên (quản lý, kèm số lịch chờ xử lý). |

## 6.2 Sơ đồ trang / Điều hướng (Sitemap & Navigation Flow)

Menu hiển thị theo vai trò; trang ngoài vai trò không hiện trong menu và vẫn bị backend từ chối khi truy cập trực tiếp. Web nhân viên dùng chung khung nhưng hiển thị mục theo LT hoặc NVS; thông báo chỉ có cho NVS (ma trận 5.1: lễ tân và quản lý không có chức năng thông báo).

**Web khách hàng**

| Mã màn hình | Tên màn hình | Use case |
| --- | --- | --- |
| CW-01 | Đăng ký | UC-01 |
| CW-02 | Đăng nhập | UC-02 |
| CW-03 | Trang chủ: Danh mục dịch vụ & giá lưu trú | UC-09 |
| CW-04 | Thú cưng của tôi | UC-06, UC-07 |
| CW-05 | Tạo / sửa hồ sơ thú cưng | UC-05, UC-06 |
| CW-06 | Đặt lịch spa | UC-10 |
| CW-07 | Đặt lịch lưu trú | UC-28 |
| CW-08 | Lịch hẹn của tôi | UC-11 |
| CW-09 | Chi tiết lịch hẹn (trạng thái, ảnh, thanh toán, xác nhận chi phí) | UC-11, UC-14, UC-19, UC-24, UC-25, UC-30 |
| CW-10 | Đổi lịch hẹn | UC-14 |
| CW-11 | Lịch sử dịch vụ | UC-11 |
| CW-12 | Thông báo | UC-34 |
| CW-13 | Hồ sơ cá nhân | UC-03 |

**Web nhân viên** (LT: lễ tân; NVS: nhân viên spa; “—”: sơ đồ gốc không ghi vai trò riêng)

| Mã màn hình | Tên màn hình | Vai trò | Use case |
| --- | --- | --- | --- |
| SW-01 | Đăng nhập | — | UC-02 |
| SW-02 | Lịch hẹn (LT: cả cửa hàng · NVS: được phân công) | — | UC-11 |
| SW-03 | Chi tiết lịch hẹn | — | UC-06, UC-11, UC-25 |
| SW-04 | Khách hàng (tìm, ghi nhận vãng lai) | LT | UC-04 |
| SW-05 | Hồ sơ thú cưng | LT | UC-05, UC-06 |
| SW-06 | Đặt lịch thay khách | LT | UC-10, UC-28 |
| SW-07 | Tiếp nhận & cân nặng | LT | UC-16, UC-17, UC-30, UC-31 |
| SW-08 | Tình trạng chuồng | LT | UC-33 |
| SW-09 | Thanh toán tại quầy | LT | UC-23, UC-25 |
| SW-10 | Trả thú cưng lưu trú | LT | UC-32 |
| SW-11 | Thực hiện dịch vụ (ảnh, tiến độ, hoàn tất) | NVS | UC-18, UC-19 |
| SW-12 | Lịch sử công việc | NVS | UC-11 |
| SW-13 | Thông báo | NVS | UC-34 |
| SW-14 | Danh mục dịch vụ | — | UC-09 |
| SW-15 | Hồ sơ cá nhân | — | UC-03 |

**Web quản lý**

| Mã màn hình | Tên màn hình | Use case |
| --- | --- | --- |
| MW-01 | Đăng nhập | UC-02 |
| MW-02 | Tổng quan & giám sát tiến độ | UC-11 |
| MW-03 | Danh sách lịch hẹn | UC-11, UC-15 |
| MW-04 | Xử lý lịch hẹn chờ xác nhận (đề xuất, xác nhận, từ chối) | UC-12, UC-13, UC-29 |
| MW-05 | Chi tiết lịch hẹn (cập nhật trạng thái, đổi/hủy, ảnh, hồ sơ thú cưng) | UC-06, UC-15, UC-19, UC-20, UC-25 |
| MW-06 | Danh mục dịch vụ | UC-08, UC-09 |
| MW-07 | Chuồng & giá lưu trú | UC-27, UC-33 |
| MW-08 | Nhân viên | UC-26 |
| MW-09 | Khách hàng bị khóa | UC-22 |
| MW-10 | Thanh toán | UC-23, UC-25 |
| MW-11 | Hồ sơ cá nhân | UC-03 |
| MW-12 | Lịch làm việc nhân viên spa | UC-35 |
| MW-13 | Cấu hình hệ thống | UC-36 |

*Hình 6.1 – Sitemap của 3 web (trong ngoặc vuông: use case tương ứng)*

## 6.3 Luồng màn hình (User Flow)

Bảy luồng chính theo use case.

**UF-01 – Đặt lịch spa**

1. CW-02 Đăng nhập.
2. CW-04 Thú cưng của tôi.
   - Chưa có hồ sơ → CW-05 Tạo hồ sơ (nếu chưa có), rồi sang bước 3.
   - Đã có → sang bước 3.
3. CW-06 Đặt lịch spa, bước 1: chọn thú cưng + dịch vụ.
4. Bước 2: chọn ngày, mốc giờ (chỉ hiện mốc còn chỗ). Mốc giờ còn chỗ không?
   - Hết → quay lại bước 4 để chọn ngày / mốc giờ khác.
   - Còn → sang bước 5.
5. Bước 3: xem tạm tính, xác nhận gửi.
   - Bị khóa → tài khoản bị khóa tự đặt lịch: hiện thông báo liên hệ cửa hàng.
   - Gửi → CW-09 Chi tiết lịch hẹn (Chờ xác nhận); từ đây có thể đến CW-08 Lịch hẹn của tôi hoặc CW-12 Thông báo.

**UF-02 – Đặt lịch lưu trú**

1. CW-02 Đăng nhập.
2. CW-07 Đặt lịch lưu trú: chọn thú cưng, thời điểm nhận và trả.
3. Còn chuồng phù hợp trong mọi đêm không?
   - Hết → báo hết chỗ, chọn ngày khác (quay lại bước 2).
   - Còn → sang bước 4.
4. Xem tiền lưu trú tạm tính, xác nhận gửi.
   - Bị khóa → tài khoản bị khóa tự đặt lịch: hiện thông báo liên hệ cửa hàng.
   - Gửi → CW-09 Chi tiết lịch hẹn (Chờ xác nhận).

*Hình 6.2 – UF-01 Đặt lịch spa (UC-10) và UF-02 Đặt lịch lưu trú (UC-28)*

**UF-03 – Luồng tại quầy (lễ tân)**

1. SW-01 Đăng nhập (Lễ tân).
2. SW-02 Lịch hẹn hôm nay.
   - Khách đến → SW-07 Tiếp nhận (bước 3).
   - Khách chưa có hồ sơ → khách vãng lai mới: SW-04 ghi nhận → SW-05 hồ sơ → SW-06 đặt thay; sau đó quay lại SW-02.
3. SW-07 Tiếp nhận: nhập cân nặng thực tế.
4. Tăng nhóm kích cỡ vượt dung sai không?
   - Không (lưu trú) → bước 6.
   - Không (spa) → bước 7.
   - Có → bước 5.
5. Màn hình yêu cầu xác nhận chi phí mới (khách xác nhận; khách vãng lai: lễ tân ghi nhận).
   - Xác nhận (lưu trú) → bước 6.
   - Xác nhận (spa) → bước 7.
   - Không xác nhận → từ chối / quá 30 phút → **Đã hủy**.
6. Lưu trú: SW-09 thu tiền lưu trú → SW-07 tiếp nhận → **Đang lưu trú**. Khi khách đến đón → SW-10 Trả thú cưng (phí phạt nếu trễ) → **Hoàn tất**.
7. Spa: **Đã tiếp nhận** → chuyển nhân viên spa.

*Hình 6.3 – UF-03 Luồng tại quầy: khách vãng lai, tiếp nhận, cân nặng, trả thú cưng (UC-04, 16, 17, 30 – 32)*

**UF-04 – Xử lý lịch chờ xác nhận (quản lý)**

1. MW-01 Đăng nhập.
2. MW-02 Tổng quan.
3. MW-04 Lịch hẹn chờ xác nhận.
4. Xem đề xuất nhân viên spa / chuồng. Đáp ứng được không?
   - Không → từ chối → **Đã hủy**.
   - Có → xác nhận / chọn nhân viên hoặc chuồng khác → **Đã xác nhận**.
5. MW-05 Chi tiết lịch hẹn: giám sát, đổi/hủy, cập nhật trạng thái.

**UF-05 – Thực hiện dịch vụ (nhân viên spa)**

1. SW-01 Đăng nhập (NV spa).
2. SW-02 Lịch hẹn được phân công.
3. SW-11 Thực hiện dịch vụ.
4. Tải ảnh trước.
5. Ảnh trước hợp lệ và không chờ xác nhận chi phí không?
   - Không → chặn chuyển **Đang thực hiện** (hiện lý do), quay lại bước 4.
   - Có → sang bước 6.
6. Bắt đầu thực hiện → **Đang thực hiện**.
7. Đánh dấu từng dịch vụ xong + ghi chú.
8. Tải ảnh sau → **Hoàn tất**.
9. SW-12 Lịch sử công việc.

**UF-07 – Phân ca (quản lý)**

1. MW-12 Lịch làm việc.
2. Chọn nhân viên spa, ngày; thêm / sửa / xóa ca.
3. Hợp lệ không? (Đến > Từ, không chồng ca)
   - Sai → báo lỗi, giữ nguyên ca (phân công lại nhân viên trước).
   - Đúng → sang bước 4.
4. Ca rút ngắn / xóa còn lịch **Đã xác nhận** trong ca không?
   - Còn → báo lỗi, giữ nguyên ca (phân công lại nhân viên trước).
   - Không → lưu ca; ảnh hưởng đề xuất nhân viên và mốc giờ còn chỗ.

*Hình 6.4 – UF-04 Xác nhận và phân công (UC-12, 13, 29) · UF-05 Thực hiện dịch vụ (UC-18, 19) · UF-07 Phân ca (UC-35)*

**UF-06 – Đổi hoặc hủy lịch hẹn**

1. CW-09 Chi tiết lịch hẹn. Còn trong hạn tự phục vụ không?
   - Còn hạn → đổi lịch (CW-10) hoặc hủy:
     - Đổi → về **Chờ xác nhận**, MW-04 duyệt.
     - Hủy → **Đã hủy** – Khách hàng chủ động hủy.
   - Quá hạn → nút bị vô hiệu + hướng dẫn liên hệ cửa hàng (hotline). Khách liên hệ → quản lý xử lý tại MW-05 (đổi, hoặc **Đã hủy** – theo yêu cầu ngoài hạn).

*Hình 6.5 – UF-06 Đổi hoặc hủy lịch hẹn (UC-14, 15)*

## 6.4 Phác thảo (Wireframes)

Wireframe độ trung thực thấp cho 9 màn hình quan trọng: CW-06, CW-07, CW-09, SW-07, SW-11, SW-08, MW-04, MW-12, MW-13.

Mô tả bố cục từng màn hình trong wireframe:

**CW-06 – Đặt lịch spa (bước 2: khung giờ)**
- Thanh menu: Dịch vụ, Thú cưng, Lịch hẹn, Thông báo, Tài khoản.
- Thanh bước: 1 Thú cưng + dịch vụ · **2 Khung giờ** (đang chọn) · 3 Xác nhận.
- Hàng chọn ngày (Ngày 1 → Ngày 6); bên dưới là lưới mốc giờ chia ba buổi: **Sáng** (09:00, 10:00, 11:00), **Trưa** (12:00, 13:00, 14:00), **Chiều / tối** (15:00, 16:00, 17:00, 18:00, 19:00). Mốc đang chọn tô đậm; mốc kín hoặc không nhận dịch vụ ở mốc đó hiển thị mờ, gạch ngang và không chọn được.
- Khung bên phải “Tóm tắt (thời lượng, số nhân viên cần)”: thú cưng (tên · loài · nhóm kích cỡ); dịch vụ + giá + thời lượng; tổng tạm tính · giờ kết thúc dự kiến; nút **Gửi yêu cầu đặt lịch**.

**CW-07 – Đặt lịch lưu trú**
- Thanh menu: Dịch vụ, Thú cưng, Lịch hẹn, Thông báo, Tài khoản.
- Các ô nhập: Thú cưng (chọn); Nhận: ngày + giờ; Trả: ngày + giờ.
- Vùng giữa hiển thị tình trạng còn chỗ: Còn / Hết chỗ (chọn ngày khác). Ghi chú: “Ngày trả phải sau ngày nhận.”
- Khung bên phải “Tạm tính”: số đêm × (giá lưu trú + thức ăn); lưu ý: đối chiếu lại khi tiếp nhận (BR-23); nút **Gửi yêu cầu lưu trú**.

**CW-09 – Chi tiết lịch hẹn**
- Thanh menu: Dịch vụ, Thú cưng, Lịch hẹn, Thông báo, Tài khoản.
- Dòng đầu: mã lịch hẹn · loại · thú cưng; ô [Trạng thái].
- Banner: “Xác nhận chi phí mới (đếm ngược 30 phút)” kèm nút [Xác nhận] [Từ chối].
- Khối trái “Dịch vụ & tiến độ”: danh sách dịch vụ, giá; ảnh trước / sau chăm sóc.
- Khối phải “Thanh toán”: số tiền · trạng thái; nút **Thanh toán trực tuyến**; nút Đổi lịch và nút Hủy lịch (hai nút này viền nét đứt).

*Hình 6.6 – Wireframe web khách hàng (CW-06, CW-07, CW-09)*

**SW-07 – Tiếp nhận & cân nặng (lễ tân)**
- Menu: Lịch hẹn, Khách hàng, Chuồng, Thanh toán.
- Bên trái “Lịch hẹn hôm nay”: bảng gồm Giờ, Thú cưng, Trạng thái.
- Bên phải “Tiếp nhận”: hồ sơ (loài · giống · cân nặng khai báo); ô “Cân nặng thực tế (kg)”; kết quả đối chiếu (trong ngưỡng / giảm nhóm / cần xác nhận); nút **Xác nhận tiếp nhận**.

**SW-11 – Thực hiện dịch vụ (nhân viên spa)**
- Menu: Lịch hẹn, Lịch sử, Thông báo.
- Dòng đầu: thú cưng · khách hàng · khung giờ · ghi chú hồ sơ.
- Bên trái: khối “Ảnh trước” ([Tải ảnh] – trạng thái hợp lệ) và khối “Ảnh sau” ([Tải ảnh]).
- Bên phải “Dịch vụ”: danh sách tick “Dịch vụ 1 + ghi chú”, “Dịch vụ 2 + ghi chú”; nút **Bắt đầu thực hiện**; nút Hoàn tất (viền nét đứt); chú thích bên dưới: “Lý do khi nút bị khóa (BR-20)”.

**SW-08 – Tình trạng chuồng (lễ tân / quản lý)**
- Menu: Lịch hẹn, Khách hàng, Chuồng, Thanh toán.
- Bộ lọc: Loài, Nhóm kích cỡ, Trống / Đang chứa.
- Lưới thẻ chuồng: Chuồng A1 (Trống); Chuồng A2 (Đang chứa: thú cưng · chủ · trả dự kiến); Chuồng B1 (Trống); Chuồng B2 (Ngừng sử dụng); Chuồng C1 (Đang chứa); Chuồng C2 (Trống).

**MW-04 – Xử lý lịch hẹn chờ xác nhận (quản lý)**
- Menu: Tổng quan, Lịch hẹn, Dịch vụ, Chuồng & giá, Nhân viên, Thanh toán.
- Bên trái “Chờ xác nhận (Spa | Lưu trú)”: danh sách gồm Giờ, Thú cưng, Loại.
- Bên phải “Chi tiết + đề xuất”: khách hàng · thú cưng · dịch vụ · khung giờ / ngày lưu trú; đề xuất N nhân viên (ca làm → rảnh → ít ca nhất 30 ngày) hoặc chuồng, quản lý xác nhận / đổi; nút **Xác nhận** và nút **Từ chối (không thể đáp ứng)**.

**MW-12 – Lịch làm việc nhân viên spa (quản lý)**
- Menu: Lịch hẹn, Nhân viên, Lịch làm việc, Cấu hình.
- Thanh chọn tuần (ví dụ “Tuần 05/10 – 11/10”) và nút **+ Thêm ca**.
- Bảng: cột Nhân viên và các cột T2 → CN; mỗi ô là “ca” hoặc “–” (không có ca).
- Ghi chú: không sửa/xóa ca nếu còn lịch hẹn đã xác nhận trong ca đó.

**MW-13 – Cấu hình hệ thống (quản lý)**
- Menu: Lịch hẹn, Dịch vụ, Lịch làm việc, Cấu hình.
- Bên trái “Nhóm tham số”: Đặt lịch & giữ chỗ; Vắng mặt & khóa; Cân nặng & kích cỡ; Lưu trú.
- Bên phải (nhóm “Đặt lịch & giữ chỗ”): ô “Hạn tự đổi/hủy (phút)” (khoảng 60–120); ô “Thời gian dọn dẹp (phút)” (khoảng 15–20); ô “Các mốc giờ: 09:00 … 19:00”; nút **Lưu thay đổi**.

*Hình 6.7 – Wireframe web nhân viên và web quản lý (SW-07, SW-11, SW-08, MW-04, MW-12, MW-13)*

## 6.5 Thiết kế chi tiết (UI Mockups)

### Giao diện Desktop / Web

Mô tả giao diện (dữ liệu trong hình là dữ liệu minh họa):
- Thanh trên: logo “Spa thú cưng”; menu Dịch vụ, Thú cưng, **Đặt lịch** (đang chọn), Lịch hẹn, Thông báo; góc phải là tên người dùng (ví dụ “Ngọc Lan”).
- Tiêu đề “Đặt lịch spa”; thanh bước: ✓ Thú cưng & dịch vụ → **2 Chọn khung giờ** → 3 Xác nhận.
- “Chọn ngày”: các thẻ T2 05/10 … T7 10/10; thẻ T3 06/10 đang chọn.
- “Chọn khung giờ”:
  - Buổi sáng: 09:00 (đang chọn, ghi “kết thúc 11:00”), 10:00 (Đã kín), 11:00.
  - Buổi trưa: 12:00, 13:00, 14:00 (Đã kín).
  - Buổi chiều / tối: 15:00, 16:00, 17:00, 18:00 (ghi “mốc cuối cắt tỉa”), 19:00 (nền vàng nhạt, ghi “chỉ tắm / vệ sinh nhẹ”).
- Hộp thông tin: “Lịch này cần 1 nhân viên trong 2 giờ. Cửa hàng sẽ xếp nhân viên khi xác nhận, bạn không cần chọn.”
- Thẻ “Tóm tắt lịch hẹn”: Bông – Chó · Poodle · 9,0 kg · Nhóm Nhỏ; Tắm & sấy lông 150.000đ (60 phút); Cắt tỉa lông 120.000đ (60 phút); “Tạm tính (chưa gồm thay đổi khi cân thực tế)” 270.000đ; nút **Gửi yêu cầu đặt lịch**; chú thích “Lịch hẹn ở trạng thái [Chờ xác nhận] cho đến khi cửa hàng xác nhận”.

*Hình 6.8 – CW-06 Đặt lịch spa, bước chọn khung giờ (web khách hàng)*

Mô tả giao diện (dữ liệu trong hình là dữ liệu minh họa):
- Thanh trên: logo “Spa thú cưng”; menu **Lịch hẹn** (đang chọn), Khách hàng, Đặt lịch thay, Chuồng, Thanh toán; góc phải là tên người dùng (ví dụ “Thu Hà”).
- Tiêu đề “Tiếp nhận thú cưng”, ngày hiển thị “Thứ ba, 06/10/2026”.
- Bảng bên trái (Giờ hẹn · Thú cưng · Loại · Trạng thái):
  - 09:00 · Bông · Chó · Spa · Đã xác nhận (dòng đang chọn)
  - 10:00 · Mướp · Mèo · Spa · Đã tiếp nhận
  - 10:00 · Cốm · Thỏ · Lưu trú · Đã xác nhận
  - 09:00 · Nâu · Chó · Spa · Đang thực hiện
  - 07:30 · Tuyết · Mèo · Lưu trú · Đang lưu trú
- Thẻ bên phải: “Bông · Chó Poodle”; khách hàng Trần Minh Anh · Spa 09:00 · NV phụ trách: Hạnh; cân nặng khai báo 9,0 kg · Nhóm Nhỏ; ô “Cân nặng thực tế (kg)” đang nhập 11,2.
- Khung cảnh báo (nền vàng): “Tăng nhóm kích cỡ: Nhỏ → Vừa. Chênh 2,2 kg, vượt ngưỡng dung sai 1,5 kg. Chi phí tăng từ 270.000đ lên 330.000đ. Đã gửi yêu cầu xác nhận cho khách (còn 29:41).”
- Hai nút: **Xác nhận tiếp nhận** và Ghi nhận phản hồi của khách.

*Hình 6.9 – SW-07 Tiếp nhận và đối chiếu cân nặng (web nhân viên – lễ tân)*

Mô tả giao diện (dữ liệu trong hình là dữ liệu minh họa):
- Thanh bên “Quản lý”: Tổng quan, Lịch hẹn, **Chờ xác nhận** (đang chọn, huy hiệu số 4), Dịch vụ, Chuồng & giá, Nhân viên, Lịch làm việc, Khách bị khóa, Thanh toán, Cấu hình.
- Tiêu đề “Lịch hẹn chờ xác nhận”, phụ đề “Spa 3 · Lưu trú 1”.
- Danh sách bên trái (Giờ · Thú cưng · Loại · Ghi chú):
  - 06/10 09:00 · Bông · Spa · Mới đặt (dòng đang chọn)
  - 06/10 10:00 · Mướp · Spa · Khách đã đổi lịch
  - 07/10 13:00 · Lu · Spa · NV bị vô hiệu hóa
  - 08/10 → 10/10 · Cốm · Lưu trú · Mới đặt
- Thẻ chi tiết bên phải: “Bông · Chó Poodle · Nhóm Nhỏ” kèm huy hiệu [Chờ xác nhận]; Trần Minh Anh · Tắm & sấy lông, Cắt tỉa lông · 120 phút; khung giờ 09:00 – 11:00, 06/10.
- Mục “Nhân viên spa phụ trách · cần 1 người”, chú thích: đề xuất theo thứ tự có ca làm → đang rảnh → ít ca nhất trong 30 ngày qua. Ba lựa chọn:
  - **Hạnh** (nhãn “Hệ thống đề xuất”, đang chọn): Ca 08:00–17:00 · Rảnh 09:00–11:15 · 6 ca / 30 ngày
  - Quyên: Ca 08:00–17:00 · Rảnh 09:00–11:15 · 9 ca / 30 ngày
  - Tâm (bị vô hiệu, không chọn được): Đã có lịch 09:00–11:15 — trùng, không thể chọn · 5 ca / 30 ngày
- Hai nút: **Xác nhận lịch hẹn** và “Từ chối: cửa hàng không thể đáp ứng”.

*Hình 6.10 – MW-04 Xử lý lịch hẹn chờ xác nhận (web quản lý)*

Mô tả giao diện (dữ liệu trong hình là dữ liệu minh họa):
- Thanh bên “Quản lý” với mục **Lịch làm việc** đang chọn (các mục như ở MW-04).
- Tiêu đề “Lịch làm việc nhân viên spa”, phụ đề “Tuần 05/10 – 11/10/2026” cùng nút chuyển tuần; nút **+ Thêm ca**.
- Bảng ca theo tuần (cột T2 05/10 … CN 11/10; “—” là không có ca):

| Nhân viên | T2 05/10 | T3 06/10 | T4 07/10 | T5 08/10 | T6 09/10 | T7 10/10 | CN 11/10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hạnh | 08:00–17:00 | 08:00–17:00 (ô đang chọn) | 08:00–17:00 | 08:00–17:00 | 08:00–17:00 | — | — |
| Quyên | 10:00–19:00 | 08:00–17:00 | — | 10:00–19:00 | 10:00–19:00 | 10:00–19:00 | — |
| Tâm | — | 08:00–17:00 | 09:30–18:30 | 09:30–18:30 | — | 09:30–18:30 | 09:30–18:30 |

- Form “Sửa ca: Hạnh · 06/10”: Nhân viên: Hạnh; Ngày: 06/10/2026; Từ: 08:00; Đến: 17:00; nút **Lưu ca** và nút Xóa ca.
- Khung cảnh báo (nền vàng): “Không thể rút ngắn hoặc xóa ca. Hạnh còn lịch hẹn đã xác nhận 09:00 – 11:15 trong ca này. Hãy phân công lại nhân viên khác trước.”

*Hình 6.11 – MW-12 Lịch làm việc nhân viên spa (web quản lý)*

## 6.6 Nguyên tắc tương tác (Micro-interactions & Animations)

| Tình huống | Hành vi |
| --- | --- |
| **Hover, focus** | Nút đậm hơn một bậc; hàng bảng hover nền Mist; focus bằng bàn phím có vòng sáng rõ; thời gian chuyển 150–200 ms (đề xuất). |
| **Loading** | Danh sách dùng skeleton; nút gửi hiện spinner và bị vô hiệu hóa để chống bấm đúp (đặt lịch, thanh toán); tải ảnh có thanh tiến trình. |
| **Chuyển trang** | Chuyển nhẹ (mờ dần ≤ 150 ms); tắt hiệu ứng khi người dùng bật “giảm chuyển động” của hệ điều hành. |
| **Chọn mốc giờ** | Mốc kín mờ, nét đứt, chữ “Đã kín”, không focus được; mốc không nhận dịch vụ có ghi chú (“mốc cuối cắt tỉa”, “chỉ tắm / vệ sinh nhẹ”); chọn xong hiện giờ kết thúc dự kiến, số nhân viên cần và tạm tính. |
| **Nút bị khóa** | Luôn hiển thị lý do ngay dưới nút: “Cần ảnh trước chăm sóc hợp lệ”, “Đang chờ khách xác nhận chi phí mới”, “Đã quá thời hạn tự đổi/hủy”. |
| **Đếm ngược 30 phút** | Banner mm:ss ở CW-09 và SW-07; thời hạn do backend quyết định, hết giờ web tải lại trạng thái từ backend thay vì tự hủy ở web. |
| **Hành động nguy hiểm** | Hộp thoại xác nhận nêu hậu quả cho: hủy lịch, từ chối lịch, gỡ hồ sơ thú cưng, vô hiệu hóa nhân viên. |
| **Thông báo** | Toast thành công tự ẩn sau vài giây; lỗi giữ đến khi đóng; biểu tượng chuông kèm số chưa đọc (KH, NVS); làm mới định kỳ bằng TanStack Query (đề xuất; Requirements không yêu cầu thời gian thực). |
| **Lỗi theo mã HTTP** | 401: thử làm mới token, thất bại thì về đăng nhập · 403: trang “Bạn không có quyền” · 409: hiện thông báo nghiệp vụ tại chỗ và tải lại dữ liệu (ví dụ danh sách khung giờ) · 429: nhắc thử lại sau · 500: thông báo chung. |
| **Trạng thái rỗng** | Có minh họa ngắn và hành động gợi ý (ví dụ “Chưa có thú cưng – Thêm thú cưng”). |

**Quy tắc kiểm tra dữ liệu nhập (Validation rules).** Web kiểm tra ngay để phản hồi nhanh; backend luôn kiểm tra lại (Requirements 5.2). Thông báo lỗi nằm dưới trường, bằng tiếng Việt, nêu cách sửa.

| Màn hình / trường | Quy tắc (nguồn) | Thông báo |
| --- | --- | --- |
| CW-01 Họ tên, liên hệ, xác thực | Bắt buộc; liên hệ đúng định dạng và chưa dùng (FR-ACC-01) | “Vui lòng nhập họ tên.” · “Thông tin liên hệ này đã được sử dụng.” |
| CW-02 / SW-01 / MW-01 Đăng nhập | Sai thông tin hoặc tài khoản bị vô hiệu hóa (FR-ACC-02) | “Thông tin đăng nhập không đúng.” (không nêu trường nào sai) |
| CW-05 / SW-05 Hồ sơ thú cưng | Bắt buộc: tên, loài, giống, cân nặng > 0; chiều cao với chó; loài thuộc 4 loài (FR-PET-01) | “Vui lòng nhập chiều cao của chó.” · “Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.” |
| MW-06 Dịch vụ | Có giá (≥ 0) và thời lượng (> 0) cho mọi nhóm kích cỡ của loài áp dụng (BR-11, BR-12) | “Thiếu giá/thời lượng cho nhóm Vừa của Chó.” |
| CW-06 / SW-06 Đặt lịch spa | Chọn ≥ 1 dịch vụ; mốc giờ còn chỗ và không muộn hơn mốc bắt đầu muộn nhất; tài khoản không bị khóa (FR-BOOK-01 → 03) | “Vui lòng chọn ít nhất một dịch vụ.” · “Mốc giờ vừa kín, vui lòng chọn mốc khác.” · “Dịch vụ này không nhận ở mốc giờ đã chọn.” · “Tài khoản tạm thời không thể tự đặt lịch, vui lòng liên hệ cửa hàng qua hotline.” |
| CW-07 / SW-06 Đặt lưu trú | Ngày trả sau ngày nhận; còn chồng trống mọi đêm (FR-HTL-04) | “Ngày trả phải sau ngày nhận.” · “Hết chỗ trong thời gian này, vui lòng chọn ngày khác.” |
| CW-09 / CW-10 Đổi, hủy | Còn trong hạn tự phục vụ (BR-08) | “Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline để được hỗ trợ.” |
| CW-05 / SW-05 Tính cách | Chọn một trong Hiền / Bình thường / Khó tính-dữ; Khó tính-dữ cần 2 nhân viên | Hiện chú thích: “Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn.” |
| MW-06 Mốc giờ muộn nhất, số nhân viên | Mốc giờ thuộc danh sách mốc; số nhân viên là 1 hoặc 2 (2.3.3) | “Vui lòng chọn mốc giờ hợp lệ.” · “Số nhân viên chỉ có thể là 1 hoặc 2.” |
| MW-12 Ca làm việc | Giờ kết thúc sau giờ bắt đầu; không chồng ca; không rút ngắn/xóa nếu còn lịch đã xác nhận (FR-STF-04) | “Giờ kết thúc phải sau giờ bắt đầu.” · “Nhân viên đã có ca trong khoảng này.” · “Còn lịch hẹn đã xác nhận trong ca này, hãy phân công lại trước.” |
| MW-13 Cấu hình | Hạn tự đổi/hủy 60–120 phút; dọn dẹp 15–20 phút; ngưỡng kích cỡ tăng dần; dung sai ≥ 0 (FR-CFG-01) | “Giá trị phải từ 60 đến 120 phút.” · “Giá trị phải từ 15 đến 20 phút.” |
| MW-04 Số nhân viên | Chọn đủ số nhân viên cần; cảnh báo nhân viên ngoài ca | “Lịch này cần đúng 2 nhân viên.” · “Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?” |
| SW-07 Cân nặng thực tế | Số > 0 (BR-23) | “Vui lòng nhập cân nặng thực tế lớn hơn 0.” |
| SW-11 Bắt đầu / hoàn tất | Ảnh trước hợp lệ; không chờ xác nhận; mọi dịch vụ xong; có ảnh sau (BR-20, BR-06, BR-23) | “Cần ảnh trước chăm sóc hợp lệ.” · “Đang chờ khách xác nhận chi phí mới.” · “Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.” |
| SW-11 Tải ảnh | Chỉ tệp ảnh; chỉ nhân viên được phân công | “Chỉ chấp nhận tệp ảnh.” |
| MW-04 Phân công, gán chuồng | Không trùng khung giờ / đêm (BR-04, BR-21) | “Có nhân viên đã có lịch trùng khung giờ.” · “Chuồng đã được gán trong thời gian này.” |
| MW-07 Chuồng | Mã chuồng chưa tồn tại (FR-HTL-01) | “Mã chuồng đã tồn tại.” |
| SW-09 / MW-10 Thanh toán quầy | Số tiền thực nhận ≥ số tiền phải trả (BR-17) | “Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.” |
| SW-04 Khách vãng lai | Liên hệ chưa thuộc khách hiện có (FR-ACC-04) | “Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.” |

# VII. Ràng buộc & Cấu hình (Constraints & Configurations)

## 7.1 Tích hợp bên thứ ba (Third-party Integrations)

Chỉ dùng dịch vụ có gói miễn phí (X-05); các giới hạn gói miễn phí nêu ở 3.2.

| Dịch vụ | Mục đích | Giao tiếp | Bảo mật và ràng buộc | Tham chiếu |
| --- | --- | --- | --- | --- |
| VNPAY / MoMo (sandbox) | Thanh toán trực tuyến lịch spa đã hoàn tất, bổ sung cho thanh toán tại quầy. | Backend → cổng: khởi tạo, số tiền do hệ thống xác định.<br>Cổng → backend: webhook kết quả. | Webhook không có JWT: xác minh chữ ký/secret theo tài liệu từng cổng; sai → từ chối, ghi log.<br>Chữ ký hợp lệ chưa đủ: số tiền phải khớp đủ (BR-17).<br>Idempotent theo TxnRef.<br>Secret ở biến môi trường.<br>Chỉ áp dụng lịch spa; lưu trú chỉ tại quầy (BR-09). | FR-PAY-03; Req. 6.1; R-05, D-02 |
| Supabase PostgreSQL (Free) | Cơ sở dữ liệu. | Backend → DB qua Npgsql (SSL). | Web không truy cập trực tiếp; chuỗi kết nối là secret; tự tạm dừng sau 1 tuần không hoạt động (xử lý ở 3.2). | C-02 |
| Supabase Storage (Free) (Đề xuất X-04) | Lưu ảnh minh chứng trước/sau. | Backend tải lên và đọc. | Bucket riêng tư; chỉ trả ảnh sau khi kiểm tra BR-16; khóa dịch vụ là secret; 1 GB, 50 MB/tệp. | FR-EXE-09; BR-20 |
| cron-job.org (Đề xuất) | Gọi POST /internal/jobs/run mỗi 5 phút: kích hoạt tác vụ nền và giữ backend, DB không bị ngủ/tạm dừng. | cron-job.org → backend (HTTPS). | Header bí mật X-Job-Secret; endpoint chỉ chạy tác vụ idempotent, không nhận dữ liệu; timeout 30 giây. | FR-BOOK-06, FR-EXE-07 |
| Vercel Hobby, Render Free (Đề xuất X-05) | Chạy 3 web và backend. | HTTPS. | CORS chỉ 3 origin; HTTPS bắt buộc; Vercel Hobby chỉ cho dùng phi thương mại. | Req. 5.2 |

**Thanh toán thủ công** (tiền mặt, chuyển khoản QR do LT/QL xác nhận) không phải tích hợp API (BR-09). **Không có** tích hợp SMS/Email: Requirements chỉ định thông báo trên web (FR-NOT-01 → 06); mạng xã hội và logistics ngoài phạm vi.

## 7.2 Tham số cấu hình (System Configurations)

> **Bổ sung theo yêu cầu của nhóm (X-09, FR-CFG-01):** quản lý xem và chỉnh các tham số dưới đây trên màn hình MW-13; giá trị lưu trong DB (SystemConfig, SizeRule, WeightTolerance) nên **có hiệu lực ngay, không cần triển khai lại mã**. Dịch vụ, giá, chuồng và phí phạt trả muộn vẫn do màn hình MW-06, MW-07 quản lý. Secret và biến môi trường (nhóm D) không chỉnh trên giao diện.

**A. Tham số nghiệp vụ (bảng SystemConfig, chỉnh tại MW-13)**

| Khóa | Giá trị mặc định | Khoảng cho phép | Nguồn |
| --- | --- | --- | --- |
| Booking.ChangeCancelDeadlineMinutes | 60 phút | 60 – 120 | BR-08, A-03 (cửa hàng chọn trong 1–2 giờ) |
| Booking.HoldMinutes | 15 phút | Số nguyên dương | BR-08, A-04 |
| Booking.BufferMinutes | 15 phút | 15 – 20 | Quy tắc 2.3.3 (nhóm yêu cầu) |
| Booking.SlotTimes | 09:00, 10:00, …, 19:00 (mỗi giờ) | Danh sách giờ HH:mm tăng dần | Quy tắc 2.3.3 (nhóm yêu cầu) |
| Suggest.LookbackDays | 30 ngày | Số nguyên dương | Quy tắc 2.3.3 (nhóm yêu cầu) |
| NoShow.LockThreshold / NoShow.WindowDays | Quá 3 lần / 30 ngày | Số nguyên dương | BR-15, A-05 |
| CostConfirm.TimeoutMinutes | 30 phút | Số nguyên dương | BR-23 |
| Hotel.LateGraceMinutes / Hotel.LateBlockMinutes | 30 phút / 60 phút (số lần = ⌈(phút trễ − 30) / 60⌉) | Số nguyên dương | BR-22 |
| Photo.ValidityDays | 7 ngày | Số nguyên dương | BR-20 |
| Hotel.LateFeePerBlock | Do quản lý thiết lập | ≥ 0 | BR-22, FR-HTL-03 (chỉnh tại MW-07) |

Hạn tự đổi/hủy mặc định 60 phút (đầu khoảng cho phép) vì tài liệu chưa nêu cửa hàng chọn mức nào; nhóm có thể đổi tại MW-13.

**B. Bảng mốc phân nhóm kích cỡ (SizeRule, BR-19) và ngưỡng dung sai cân nặng (WeightTolerance, BR-23)**

Giá trị khởi tạo lấy nguyên từ hai bảng trong Requirements (mục 3.4, Quy tắc nghiệp vụ); quản lý chỉnh tại MW-13. Quy tắc áp dụng không đổi: chênh lệch bằng ngưỡng vẫn tính trong ngưỡng; dùng ngưỡng của ranh giới nhóm cao nhất mà cân nặng thực tế vượt qua (BR-23).

**C. Dữ liệu quản lý ở màn hình riêng (không phải tham số cấu hình)**

| Dữ liệu | Màn hình |
| --- | --- |
| Giá, thời lượng, số nhân viên cần theo loài và nhóm kích cỡ; mốc giờ bắt đầu muộn nhất của dịch vụ | MW-06 (FR-SVC-01 → 03) |
| Chuồng; giá lưu trú, thức ăn theo đêm; phí phạt trả muộn mỗi lần | MW-07 (FR-HTL-01 → 03) |
| Ca làm việc của nhân viên spa | MW-12 (FR-STF-04) |

**D. Biến môi trường / secret (không nằm trong mã nguồn – Requirements 5.2; đặt trên Render, Vercel)**

| Biến | Ghi chú |
| --- | --- |
| ConnectionStrings__Default | Chuỗi kết nối Supabase PostgreSQL. |
| Jwt__SigningKey; Jwt__AccessTokenMinutes; Jwt__RefreshTokenDays | Khóa ký và thời hạn token (thời hạn cụ thể chưa chốt – R-01). |
| Cors__AllowedOrigins | Đúng 3 origin của 3 web (*.vercel.app). |
| RateLimit__* | Ngưỡng cho đăng ký, đăng nhập, làm mới token, đặt lịch (giá trị chưa chốt). |
| Payment__Vnpay__*; Payment__Momo__* | Mã đối tác, khóa/secret, URL trả về và URL webhook của sandbox. |
| Storage__Url; Storage__ServiceKey; Storage__Bucket | Supabase Storage (Đề xuất). |
| Jobs__Secret | Giá trị header X-Job-Secret mà cron-job.org gửi tới /internal/jobs/run. |
| Serilog__MinimumLevel | Mức log; không ghi mật khẩu, token, secret. |
| App__TimeZone | Múi giờ cửa hàng để tính “đêm” và hiển thị (đề xuất Asia/Ho_Chi_Minh). |
| Seed__ManagerUserName; Seed__ManagerPassword | Tạo tài khoản quản lý đầu tiên khi triển khai (R-02 chưa chốt; đề xuất script khởi tạo một lần, không có chức năng trên giao diện). |
