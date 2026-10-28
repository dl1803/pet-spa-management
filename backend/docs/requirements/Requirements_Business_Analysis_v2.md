# HỆ THỐNG QUẢN LÝ SPA THÚ CƯNG

*Requirements & Business Analysis*

# PHẦN 1: ĐỊNH NGHĨA & THUẬT NGỮ

## 1.1. Danh mục thuật ngữ

### Thuật ngữ nghiệp vụ

| **Thuật ngữ** | **Giải thích** |
|---|---|
| Cửa hàng spa thú cưng | Một cửa hàng duy nhất cung cấp dịch vụ chăm sóc (spa) và lưu trú (hotel) trực tiếp cho thú cưng tại địa điểm cửa hàng. |
| Khách hàng | Chủ sở hữu thú cưng. Gồm 2 loại: khách hàng có tài khoản và khách vãng lai. |
| Khách hàng có tài khoản | Khách hàng đã đăng ký tài khoản; tự sử dụng web khách hàng, hoặc được lễ tân đặt lịch thay khi đến trực tiếp. |
| Khách vãng lai | Khách hàng chưa có tài khoản, đến trực tiếp cửa hàng; được lễ tân ghi nhận thông tin liên hệ và đặt lịch thay. Không đăng nhập hệ thống, không nhận thông báo trên web. |
| Thú cưng | Đối tượng nghiệp vụ trung tâm, thuộc sở hữu của một khách hàng; không phải “người dùng hệ thống”. Cửa hàng phục vụ 4 loài: chó, mèo, thỏ, chuột lang. |
| Nhóm kích cỡ | Nhóm Nhỏ / Vừa / Lớn do hệ thống tự xác định theo loài, cân nặng (và chiều cao đối với chó) theo BR-19; là căn cứ xác định giá, thời lượng và chuồng phù hợp. |
| Ngưỡng dung sai | Mức chênh lệch cân nặng tối đa giữa cân nặng thực tế và cân nặng khai báo mà cửa hàng châm chước, không tính thêm chi phí (BR-23). |
| Nhân viên | Người làm việc tại cửa hàng, gồm 2 vai trò: Lễ tân và Nhân viên spa. |
| Lễ tân | Nhân viên phụ trách tiếp đón khách: ghi nhận khách vãng lai, đặt lịch thay khách đến trực tiếp, tiếp nhận và trả thú cưng, ghi nhận thanh toán tại quầy. |
| Nhân viên spa | Nhân viên trực tiếp thực hiện dịch vụ chăm sóc theo lịch hẹn spa được phân công; chụp ảnh minh chứng trước/sau chăm sóc. |
| Quản lý | Người điều hành hoạt động của cửa hàng: quản lý danh mục dịch vụ, chuồng và giá lưu trú, nhân viên; xử lý, phân công lịch hẹn; giám sát vận hành. |
| Dịch vụ | Một loại hình chăm sóc spa cửa hàng cung cấp, có tên, mô tả, loài áp dụng; giá và thời lượng dự kiến theo nhóm kích cỡ do quản lý thiết lập. Lưu trú không thuộc danh mục dịch vụ. |
| Danh mục dịch vụ | Tập hợp các dịch vụ spa đang được cửa hàng cung cấp, do quản lý duy trì. |
| Lưu trú (Hotel) | Dịch vụ gửi thú cưng ở lại cửa hàng, tính theo đêm, gồm chỗ ở (chuồng) và thức ăn do cửa hàng cung cấp (có tính phí); không kèm dịch vụ spa; trả muộn quá 30 phút bị tính phí phạt (BR-22). |
| Chuồng | Chỗ ở của thú cưng trong thời gian lưu trú; mỗi chuồng chứa một thú cưng tại một thời điểm; hệ thống cho biết chuồng đang chứa thú cưng của khách hàng nào. |
| Lịch hẹn | Đối tượng trung tâm của hệ thống: yêu cầu sử dụng dịch vụ của cửa hàng, gắn với 1 khách hàng và 1 thú cưng; mang trạng thái thể hiện tiến trình xử lý. Có 2 loại: lịch hẹn spa (1 hoặc nhiều dịch vụ, một khung giờ, 1–2 nhân viên spa phụ trách theo dịch vụ và thú cưng) và lịch hẹn lưu trú (thời điểm nhận và thời điểm trả dự kiến, tính theo đêm, 1 chuồng). |
| Khung giờ | Mốc giờ tròn (09:00 – 19:00, cấu hình được) mà khách hàng có thể chọn khi đặt lịch hẹn spa; mốc còn chỗ hay đã kín được xác định theo dịch vụ và thú cưng đã chọn, và số nhân viên spa có ca làm còn rảnh trong khoảng giữ chỗ của lịch hẹn (SA 2.3.3). |
| Năng lực phục vụ | Khả năng đáp ứng của cửa hàng tại một mốc giờ: số nhân viên spa đang hoạt động có ca làm bao phủ trọn khoảng giữ chỗ của lịch hẹn, trừ số nhân viên đã được giữ chỗ bởi các lịch hẹn khác; phụ thuộc dịch vụ và thú cưng đã chọn (SA 2.3.3). |
| Tiếp nhận thú cưng | Hành động lễ tân xác nhận thú cưng đã có mặt tại cửa hàng, chuyển lịch hẹn sang “Đã tiếp nhận” (lịch spa) hoặc “Đang lưu trú” (lịch lưu trú). |
| Minh chứng trước/sau | Ảnh thú cưng trước và sau khi chăm sóc, do nhân viên spa chụp và tải lên, gắn với lịch hẹn spa; khách hàng có tài khoản được xem ảnh của lịch hẹn mình. Ảnh trước phải là ảnh gần nhất của thú cưng, tải lên trong vòng 7 ngày (BR-20). |
| Vắng mặt | Trường hợp khách hàng không đưa thú cưng đến cửa hàng trong thời gian giữ chỗ tối đa (15 phút) sau giờ hẹn đã xác nhận (lịch hẹn spa hoặc lưu trú); lịch hẹn tự động chuyển “Đã hủy” với lý do vắng mặt. |
| Thanh toán tại quầy | Khách hàng thanh toán trực tiếp tại cửa hàng bằng tiền mặt hoặc chuyển khoản ngân hàng qua mã QR, được lễ tân/quản lý xác nhận thủ công. |
| Khoản thanh toán | Số tiền một lịch hẹn phải thanh toán tại một thời điểm: lịch hẹn spa có 1 khoản (sau khi hoàn tất); lịch hẹn lưu trú có tối đa 2 khoản - tiền lưu trú (trước khi gửi thú cưng) và phí phạt trả muộn (khi nhận lại thú cưng). |
| Thanh toán trực tuyến | Khách hàng có tài khoản thanh toán qua cổng thanh toán (VNPAY/MoMo - bản sandbox) trên web, áp dụng cho lịch hẹn spa sau khi hoàn tất. |
| Thông báo | Thông tin hệ thống gửi tới actor có tài khoản khi có thay đổi quan trọng về lịch hẹn (xác nhận, phân công, đổi trạng thái, hủy, yêu cầu xác nhận chi phí mới, thanh toán). |
| Business Process (BP) | Một quy trình nghiệp vụ (BP-01 -> BP-12). |
| Business Rule (BR) | Một quy tắc nghiệp vụ ràng buộc hệ thống (BR-01 -> BR-27). |
| Functional Requirement (FR) | Một yêu cầu chức năng cụ thể, viết dạng “Hệ thống phải…” (61 FR). |
| Non-Functional Requirement (NFR) | Yêu cầu phi chức năng (bảo mật, toàn vẹn dữ liệu, độ tin cậy, hiệu năng...). |
| Acceptance Criteria | Tiêu chí nghiệm thu của một FR, dùng để kiểm thử. |
| Permission Matrix | Bảng thể hiện actor nào được phép thực hiện nhóm hành động nào. |
| Risks | Vấn đề chưa đủ căn cứ để quyết định ở giai đoạn Requirements, được chuyển tiếp cho giai đoạn thiết kế kỹ thuật (R-01 -> R-05). |
| In-Scope / Out-of-Scope | Ranh giới xác định các chức năng/nghiệp vụ nằm trong hoặc ngoài phạm vi thực hiện của dự án. |

### Thuật ngữ / từ viết tắt công nghệ

| **Thuật ngữ** | **Giải thích** |
|---|---|
| ASP.NET Core Web API | Nền tảng backend được định hướng sử dụng để xây dựng REST API. |
| Entity Framework Core (EF Core) | ORM dùng để backend giao tiếp với cơ sở dữ liệu PostgreSQL. |
| JWT (JSON Web Token) | Cơ chế token dùng cho xác thực (Bearer Authentication) giữa web và backend. |
| RESTful API | Kiểu kiến trúc API mà web dùng để giao tiếp với backend, thay cho truy cập trực tiếp database. |
| DTO (Data Transfer Object) | Đối tượng định nghĩa hình dạng dữ liệu vào/ra giữa controller và client, không phải entity trực tiếp. |
| FluentValidation | Thư viện dùng để validate cú pháp/định dạng dữ liệu đầu vào phía backend. |
| Serilog | Thư viện ghi log hệ thống. |
| Swagger/OpenAPI | Công cụ tài liệu hoá API. |
| PostgreSQL / Supabase | Hệ quản trị cơ sở dữ liệu quan hệ (PostgreSQL) được hosting qua Supabase. |
| Next.js / React / TypeScript | Nền tảng và ngôn ngữ xây dựng 3 web frontend. |
| TailwindCSS | Thư viện CSS dùng cho giao diện web. |
| React Hook Form | Thư viện xử lý form phía web. |
| TanStack Query | Thư viện quản lý server state/dữ liệu API phía web. |
| Axios | Thư viện giao tiếp HTTP giữa web và backend. |
| VNPAY / MoMo (sandbox) | Cổng thanh toán trực tuyến được tích hợp ở bản thử nghiệm (sandbox), phục vụ FR-PAY-03. |
| Webhook | Cơ chế cổng thanh toán gọi ngược về backend để xác nhận kết quả thanh toán trực tuyến. |
| CORS | Cơ chế kiểm soát nguồn gốc request được phép gọi API, giới hạn theo 3 origin web đã biết. |
| HTTPS | Giao thức truyền tải bắt buộc cho mọi môi trường triển khai. |
| GitHub | Công cụ quản lý mã nguồn. |
| Postman | Công cụ kiểm thử API theo kịch bản người dùng. |
| PlantUML | Công cụ thiết kế cơ sở dữ liệu và UML. |

# PHẦN 2: TỔNG QUAN DỰ ÁN

## 2.1. Tóm tắt dự án

Dự án xây dựng Hệ thống quản lý spa thú cưng, phục vụ một cửa hàng spa thú cưng duy nhất. Cửa hàng phục vụ chó, mèo, thỏ, chuột lang với hai nhóm dịch vụ tại địa điểm cửa hàng: chăm sóc spa (tắm rửa, cắt tỉa lông, vệ sinh tai/móng, các gói spa chăm sóc...) và lưu trú (hotel) tính theo đêm.

Hoạt động cốt lõi xoay quanh việc: Khách hàng đặt lịch (tự đặt trên web, hoặc được lễ tân đặt thay khi đến trực tiếp) -> Quản lý xác nhận khả năng đáp ứng và phân công nhân viên spa (lịch spa) hoặc gán chuồng (lịch lưu trú) -> Lễ tân tiếp nhận thú cưng; nhân viên spa thực hiện dịch vụ hoặc thú cưng được lưu trú trong chuồng -> Khách hàng thanh toán (lịch spa: sau khi hoàn tất; lịch lưu trú: trước khi gửi thú cưng).

Hệ thống có 3 actor: Khách hàng, Nhân viên (gồm Lễ tân và Nhân viên spa), Quản lý. Hệ thống được truy cập qua 3 nền tảng web: web quản lý, web nhân viên, web khách hàng.

Giải pháp là một backend ASP.NET Core Web API duy nhất phục vụ đồng thời 3 web frontend (Next.js/TypeScript), dữ liệu lưu trên PostgreSQL (Supabase); web không truy cập database trực tiếp mà giao tiếp hoàn toàn qua backend API theo kiến trúc RESTful.

## 2.2. Bối cảnh và mục tiêu kinh doanh

**Bối cảnh:** Một cửa hàng spa thú cưng vận hành xoay quanh việc tiếp nhận yêu cầu dịch vụ từ khách hàng, sắp xếp nhân viên hoặc chuồng phù hợp và hoàn tất dịch vụ có thu phí. Khách hàng thường đặt lịch trước để đảm bảo cửa hàng có nhân viên, khung giờ hoặc chuồng phù hợp; một số khách đến trực tiếp và được lễ tân đặt lịch tại quầy.

**Mục tiêu:** Hệ thống được xây dựng để số hóa và hỗ trợ các hoạt động nghiệp vụ nêu trên - cụ thể là số hóa quy trình đặt lịch, xác nhận, phân công nhân viên hoặc gán chuồng, theo dõi tiến độ thực hiện dịch vụ (kèm minh chứng trước/sau) và thanh toán - không thay đổi bản chất mô hình kinh doanh của một cửa hàng spa thú cưng, không mở rộng thành doanh nghiệp đa chi nhánh hay nền tảng thương mại điện tử.

## 2.3. Phạm vi dự án

### In-Scope

- Quản lý tài khoản khách hàng có tài khoản, nhân viên (lễ tân, nhân viên spa), quản lý; ghi nhận khách vãng lai.
- Quản lý hồ sơ thú cưng (chó, mèo, thỏ, chuột lang), phân nhóm kích cỡ và đối chiếu cân nặng thực tế khi tiếp nhận.
- Quản lý danh mục dịch vụ spa của cửa hàng (thêm, sửa, ngừng cung cấp).
- Quản lý chuồng và giá lưu trú (hotel) theo đêm, gồm thức ăn do cửa hàng cung cấp.
- Đặt lịch hẹn spa và lịch hẹn lưu trú (khách tự đặt hoặc lễ tân đặt thay khi khách đến trực tiếp); xác nhận, thay đổi, hủy lịch hẹn.
- Phân công nhân viên spa cho lịch hẹn spa (hệ thống đề xuất, quản lý quyết định); gán chuồng cho lịch hẹn lưu trú.
- Theo dõi và cập nhật trạng thái thực hiện dịch vụ; ghi nhận ảnh minh chứng trước/sau chăm sóc (khách hàng được xem).
- Ghi nhận thanh toán cho lịch hẹn spa (tại quầy hoặc trực tuyến - sandbox) và lịch hẹn lưu trú (tại quầy).
- Thông báo nghiệp vụ liên quan đến lịch hẹn.
- Xem lịch sử sử dụng dịch vụ của khách hàng/thú cưng.
- 3 web: web quản lý, web nhân viên, web khách hàng.

### Out-of-Scope

- Quản lý đa chi nhánh, chuỗi cửa hàng, franchise, mô hình multi-tenant.
- Nền tảng marketplace hoặc kết nối nhiều cửa hàng độc lập.
- Quản lý kho, hàng hóa nâng cao (bán lẻ sản phẩm thú cưng).
- CRM phức tạp, marketing automation, chương trình khách hàng thân thiết phức tạp.
- Các chức năng AI (chatbot, chẩn đoán sức khỏe thú cưng, nhận diện thú cưng bằng AI...).
- Quản lý nhân sự chuyên sâu (lương, chấm công, đánh giá hiệu suất), kế toán doanh nghiệp.
- Tích hợp mạng xã hội, logistics, giao hàng.
- Hoàn tiền cho khách hàng: cửa hàng xử lý riêng ngoài hệ thống (BR-24).
- Xử lý tai nạn nghề nghiệp/sự cố phát sinh trong quá trình chăm sóc: thực hiện ngoài hệ thống (hệ thống chỉ có ghi chú của nhân viên spa trong lịch hẹn - FR-EXE-03).

# PHẦN 3: YÊU CẦU NGHIỆP VỤ VÀ QUY TRÌNH

## 3.1. Các bên liên quan và tác nhân

Hệ thống có đúng 3 actor: Khách hàng, Nhân viên (2 vai trò: Lễ tân, Nhân viên spa), Quản lý.

### Khách hàng

- **Vai trò:** Chủ sở hữu thú cưng. Gồm 2 loại: khách hàng có tài khoản (dùng web khách hàng) và khách vãng lai (không có tài khoản, do lễ tân xử lý tại quầy).
- **Mục tiêu:** Đặt được dịch vụ spa hoặc lưu trú phù hợp cho thú cưng một cách thuận tiện, theo dõi được lịch hẹn và lịch sử sử dụng dịch vụ.
- **Trách nhiệm/hoạt động (khách hàng có tài khoản):** Đăng ký/quản lý tài khoản cá nhân; tạo và quản lý hồ sơ thú cưng thuộc sở hữu của mình; xem danh mục dịch vụ, giá lưu trú; đặt lịch hẹn spa và lịch hẹn lưu trú (mỗi lịch hẹn gắn với một thú cưng cụ thể); theo dõi trạng thái lịch hẹn; thay đổi hoặc hủy lịch hẹn (spa, lưu trú) trong điều kiện cho phép; xem ảnh minh chứng trước/sau chăm sóc; xác nhận chi phí mới khi cân nặng thực tế làm tăng nhóm kích cỡ; xem lịch sử sử dụng dịch vụ; thanh toán lịch hẹn spa (tại quầy hoặc trực tuyến) và lịch hẹn lưu trú (tại quầy); nhận thông báo liên quan đến lịch hẹn của mình.
- **Khách vãng lai:** khai thông tin trực tiếp cho lễ tân; lễ tân ghi nhận khách, hồ sơ thú cưng và đặt lịch thay; thanh toán tại quầy.
- **Nền tảng:** Web khách hàng.

### Nhân viên

Nhân viên gồm 2 vai trò do quản lý thiết lập khi tạo tài khoản (FR-STF-01). Cả hai dùng web nhân viên, chức năng hiển thị theo vai trò.

#### Lễ tân

- **Vai trò:** Tiếp đón khách tại cửa hàng.
- **Mục tiêu:** Khách đến trực tiếp được ghi nhận, đặt lịch, tiếp nhận và thanh toán đúng quy trình.
- **Trách nhiệm/hoạt động:** Ghi nhận khách vãng lai; tạo hồ sơ thú cưng và đặt lịch hẹn (spa, lưu trú) thay khách đến trực tiếp; tiếp nhận thú cưng (check-in), ghi nhận cân nặng thực tế và cập nhật hồ sơ thú cưng giúp khách; liên hệ khách vãng lai khi cần xác nhận chi phí mới; trả thú cưng lưu trú (check-out); xem tình trạng chuồng; ghi nhận thanh toán tại quầy.
- **Lưu ý phạm vi:** Lễ tân không cập nhật tiến độ thực hiện dịch vụ spa, không phân công, không quản lý danh mục dịch vụ, chuồng, giá hay tài khoản nhân viên.

#### Nhân viên spa

- **Vai trò:** Người trực tiếp thực hiện dịch vụ chăm sóc thú cưng tại cửa hàng.
- **Mục tiêu:** Nắm được lịch hẹn spa được phân công và thực hiện đúng, đủ dịch vụ cho từng thú cưng.
- **Trách nhiệm/hoạt động:** Xem danh sách lịch hẹn spa được phân công cho mình và hồ sơ thú cưng tương ứng; chụp ảnh trước và sau chăm sóc; cập nhật tiến độ/trạng thái thực hiện dịch vụ; ghi nhận hoàn tất dịch vụ và bàn giao thú cưng; xem lịch sử công việc đã thực hiện của bản thân.
- **Lưu ý phạm vi:** Nhân viên spa không quản lý danh mục dịch vụ, không quản lý tài khoản nhân viên khác, không thực hiện các quyết định điều hành cửa hàng.

**Nền tảng của Nhân viên:** Web nhân viên.

### Quản lý

- **Vai trò:** Người điều hành hoạt động của cửa hàng.
- **Mục tiêu:** Đảm bảo cửa hàng vận hành hiệu quả, dịch vụ được cung cấp đúng, nhân viên và chuồng được sắp xếp hợp lý, lịch hẹn xử lý thông suốt.
- **Trách nhiệm/hoạt động:** Quản lý danh mục dịch vụ (thêm, sửa, ngừng cung cấp); quản lý chuồng và giá lưu trú; quản lý danh sách/hồ sơ nhân viên (ở mức nghiệp vụ cơ bản, gồm vai trò lễ tân/nhân viên spa); xem và xử lý (xác nhận/từ chối) lịch hẹn; xem xét đề xuất nhân viên spa phù hợp từ hệ thống, xác nhận hoặc điều chỉnh nhân viên phụ trách; xác nhận lịch hẹn lưu trú và gán chuồng; giám sát tiến độ thực hiện dịch vụ toàn cửa hàng; xử lý thay đổi hoặc hủy lịch hẹn khi cần can thiệp; có thể trực tiếp cập nhật trạng thái thực hiện của một lịch hẹn khi cần (BR-05); ghi nhận thanh toán tại quầy; theo dõi tình hình thanh toán; gỡ khóa quyền tự đặt lịch trực tuyến cho khách hàng bị khóa do vi phạm chính sách vắng mặt, khi khách hàng liên hệ trực tiếp.
- **Lưu ý phạm vi:** Quản lý không thực hiện kế toán tổng hợp, quản lý lương, hay vận hành nhiều chi nhánh.
- **Nền tảng:** Web quản lý.

## 3.2. Quy trình nghiệp vụ hiện tại

1. Khách hàng có nhu cầu sử dụng dịch vụ chăm sóc hoặc lưu trú cho thú cưng, tiếp cận cửa hàng để trao đổi nhu cầu.

2. Cửa hàng (Quản lý/Nhân viên) tiếp nhận yêu cầu và sắp xếp nhân viên thực hiện phù hợp với năng lực phục vụ hiện có.

3. Nhân viên thực hiện dịch vụ trực tiếp tại cửa hàng cho thú cưng.

4. Khách hàng thanh toán chi phí dịch vụ.

## 3.3. Quy trình nghiệp vụ tương lai

Sau khi áp dụng hệ thống, quy trình nghiệp vụ được tổ chức thành 12 Business Process (BP-01 -> BP-12):

#### BP-01 - Đăng ký và quản lý tài khoản khách hàng

Khách hàng đăng ký tài khoản trên web -> hệ thống ghi nhận thông tin tài khoản -> khách hàng đăng nhập để sử dụng các chức năng khác -> có thể cập nhật thông tin cá nhân khi cần. Khách vãng lai (chưa có tài khoản) đến trực tiếp được lễ tân ghi nhận thông tin liên hệ trên web nhân viên và không có tài khoản đăng nhập. **Kết quả:** Khách hàng có tài khoản hợp lệ, hoặc được ghi nhận là khách vãng lai, để tiếp tục các nghiệp vụ khác.

#### BP-02 - Quản lý hồ sơ thú cưng

Khách hàng (hoặc lễ tân, khi khách đến trực tiếp) tạo hồ sơ thú cưng mới gồm tên, loài (chó, mèo, thỏ, chuột lang), giống, tính cách, cân nặng, chiều cao, đặc điểm lông, ghi chú (tiền sử bệnh, lưu ý chăm sóc) -> hệ thống lưu hồ sơ gắn với khách hàng và tự xác định nhóm kích cỡ (BR-19) -> khách hàng có tài khoản có thể xem, cập nhật hoặc gỡ bỏ hồ sơ. **Kết quả:** Thú cưng có hồ sơ hợp lệ, sẵn sàng đặt lịch.

#### BP-03 - Quản lý danh mục dịch vụ

Quản lý thêm dịch vụ spa mới (tên, mô tả, loài áp dụng, giá và thời lượng dự kiến theo nhóm kích cỡ) -> có thể chỉnh sửa hoặc ngừng cung cấp -> danh mục (kèm giá) được hiển thị khi đặt lịch. **Kết quả:** Danh mục dịch vụ luôn phản ánh đúng những gì cửa hàng thực sự cung cấp.

#### BP-04 - Đặt lịch hẹn spa

Khách hàng có tài khoản tự đặt trên web, hoặc lễ tân đặt thay khi khách (có tài khoản hoặc vãng lai) đến trực tiếp: chọn thú cưng -> chọn một hoặc nhiều dịch vụ áp dụng cho loài của thú cưng -> chọn khung giờ còn trống (theo dịch vụ, thú cưng đã chọn và số nhân viên spa có ca làm còn rảnh – SA 2.3.3) -> hệ thống ghi nhận lịch hẹn spa ở trạng thái “Chờ xác nhận” -> khách hàng có tài khoản nhận thông báo xác nhận đã gửi yêu cầu. **Ngoại lệ:** hết khung giờ trống - chọn khung giờ khác.

#### BP-05 - Xác nhận lịch hẹn spa và phân công nhân viên spa

Quản lý xem lịch hẹn spa mới hoặc quay về “Chờ xác nhận” (BR-26, BR-27) -> hệ thống đề xuất nhân viên spa phù hợp (dựa trên lịch làm việc và tình trạng phân công hiện tại) -> quản lý xác nhận đề xuất hoặc điều chỉnh nhân viên khác, rồi xác nhận lịch hẹn (hoặc từ chối nếu không thể đáp ứng) -> khách hàng có tài khoản và nhân viên spa được phân công đều nhận thông báo. **Lưu ý:** Khách hàng không có quyền chỉ định nhân viên; quyết định cuối cùng thuộc về quản lý.

#### BP-06 - Thay đổi hoặc hủy lịch hẹn

Khách hàng có tài khoản (hoặc quản lý) yêu cầu thay đổi hoặc hủy -> hệ thống kiểm tra điều kiện thời gian còn lại trước giờ hẹn -> nếu còn trong hạn cho phép: khách hàng thay đổi lịch hẹn (khung giờ/thời điểm nhận-trả, thú cưng, dịch vụ) và lịch hẹn quay về “Chờ xác nhận” để quản lý duyệt (khi duyệt, hệ thống tính lại số tiền), hoặc khách hàng hủy và lịch hẹn chuyển “Đã hủy”; nếu quá hạn, khách hàng cần liên hệ trực tiếp để quản lý xử lý -> các bên liên quan nhận thông báo. Áp dụng cho cả lịch hẹn spa và lịch hẹn lưu trú.

#### BP-07 - Thực hiện dịch vụ spa tại cửa hàng

Lễ tân xác nhận tiếp nhận thú cưng và ghi nhận cân nặng thực tế -> lịch hẹn chuyển “Đã tiếp nhận” -> hệ thống đối chiếu với hồ sơ trước khi thực hiện dịch vụ (BR-23; nếu cân nặng tăng vượt ngưỡng dung sai và sang nhóm kích cỡ lớn hơn thì chờ khách hàng xác nhận chi phí mới, quá 30 phút không phản hồi thì tự động hủy) -> nhân viên spa chụp ảnh trước chăm sóc -> nhân viên spa bắt đầu thực hiện dịch vụ, chuyển “Đang thực hiện” -> cập nhật hoàn tất từng dịch vụ trong lịch hẹn -> khi toàn bộ dịch vụ hoàn tất, chụp ảnh sau chăm sóc, đánh dấu “Hoàn tất”, bàn giao thú cưng. **Ngoại lệ:** cửa hàng giữ chỗ tối đa 15 phút sau giờ hẹn đã xác nhận; quá thời gian này mà chưa được tiếp nhận -> tự động chuyển “Đã hủy”.

#### BP-08 - Thanh toán dịch vụ

Hệ thống xác định số tiền từng khoản thanh toán. Lịch spa: tổng giá các dịch vụ đã sử dụng, thanh toán sau khi “Hoàn tất”. Lịch lưu trú: tiền lưu trú (số đêm × (giá lưu trú + giá thức ăn)) thanh toán trước khi gửi thú cưng; phí phạt trả muộn (nếu có) thanh toán khi nhận lại thú cưng. -> Khách hàng thanh toán tại quầy (tiền mặt hoặc chuyển khoản QR, do lễ tân hoặc quản lý xác nhận) hoặc, riêng lịch spa, trực tuyến qua cổng thanh toán (chỉ khách hàng có tài khoản) -> hệ thống ghi nhận trạng thái thanh toán. **Kết quả:** Mọi khoản thanh toán của lịch hẹn được đánh dấu đã thanh toán, hoàn tất vòng đời nghiệp vụ.

#### BP-09 - Quản lý nhân viên

Quản lý tạo tài khoản/hồ sơ cho nhân viên mới, chọn vai trò (lễ tân hoặc nhân viên spa) -> cập nhật thông tin khi cần -> có thể vô hiệu hóa tài khoản khi nhân viên ngừng làm việc (lịch hẹn spa đã phân công được chuyển về chờ xác nhận - BR-27). **Ghi chú phạm vi:** chỉ ở mức quản lý hồ sơ/tài khoản phục vụ phân công công việc, không bao gồm nghiệp vụ nhân sự chuyên sâu.

#### BP-10 - Thông báo nghiệp vụ (quy trình hỗ trợ, gắn liền với BP-04 -> BP-08 và BP-12 tại các thời điểm thay đổi trạng thái)

Một process nghiệp vụ khác tạo ra sự kiện cần thông báo -> hệ thống xác định actor có tài khoản cần nhận -> actor nhận được thông báo tương ứng (xác nhận đặt lịch, kết quả xác nhận/phân công, thay đổi trạng thái thực hiện, hủy lịch hẹn, yêu cầu xác nhận chi phí mới, kết quả thanh toán). Khách vãng lai không có tài khoản nên không nhận thông báo.

#### BP-11 - Quản lý chuồng và giá lưu trú

Quản lý thêm chuồng (mã chuồng, loài và nhóm kích cỡ phù hợp) -> thiết lập giá lưu trú và giá thức ăn theo đêm cho từng loài, nhóm kích cỡ, cùng mức phí phạt trả muộn mỗi lần -> có thể cập nhật hoặc ngừng sử dụng chuồng. **Kết quả:** Sức chứa và giá lưu trú phản ánh đúng những gì cửa hàng thực sự cung cấp.

#### BP-12 - Lưu trú thú cưng (Hotel)

1. **Đặt lịch:** khách hàng có tài khoản tự đặt trên web, hoặc lễ tân đặt thay khi khách đến trực tiếp; chọn thú cưng, thời điểm nhận và thời điểm trả (ngày, giờ; số đêm tính theo ngày). Hệ thống kiểm tra còn chuồng phù hợp trống trong toàn bộ các đêm, hiển thị tiền lưu trú tạm tính và ghi nhận lịch hẹn lưu trú “Chờ xác nhận”.

2. **Xác nhận:** quản lý xác nhận chuồng do hệ thống đề xuất hoặc chọn chuồng khác, rồi xác nhận (hoặc từ chối nếu không thể đáp ứng).

3. **Gửi thú cưng:** khi thú cưng đến, lễ tân ghi nhận cân nặng thực tế và hệ thống đối chiếu với hồ sơ (BR-23). Nếu hết chuồng phù hợp thì thông báo khách hàng, quản lý từ chối và hủy vì cửa hàng không thể đáp ứng. Nếu có chi phí mới thì khách hàng chấp nhận. Khách hàng thanh toán tiền lưu trú tại quầy (BP-08); lễ tân tiếp nhận, thú cưng vào chuồng đã gán, lịch chuyển “Đang lưu trú”.

4. **Nhận lại thú cưng:** khi khách đến đón, lễ tân ghi nhận thời điểm trả thực tế (trả sớm xử lý như bình thường, không hoàn tiền; trả muộn quá 30 phút thu phí phạt khi nhận lại thú cưng - BP-08), trả thú cưng, lịch chuyển “Hoàn tất” và chuồng được giải phóng.

**Lưu ý:** Lưu trú không kèm dịch vụ spa; khách muốn spa phải đặt lịch hẹn spa riêng (BP-04). **Ngoại lệ:** hết chỗ khi đặt - chọn ngày khác; quá 15 phút kể từ giờ nhận đã xác nhận mà thú cưng chưa được tiếp nhận -> tự động “Đã hủy” (vắng mặt). Thay đổi/hủy theo BP-06.

### Vòng đời lịch hẹn

Lịch hẹn spa (BP-04 -> BP-08): Chờ xác nhận -> Đã xác nhận -> Đã tiếp nhận -> Đang thực hiện -> Hoàn tất.

Lịch hẹn lưu trú (BP-12, BP-08): Chờ xác nhận -> Đã xác nhận -> Đang lưu trú -> Hoàn tất.

“Đã hủy” - có thể xảy ra từ bất kỳ trạng thái nào ở trên, trước “Hoàn tất”. Là trạng thái kết thúc, không chuyển sang trạng thái khác sau khi đã “Đã hủy”. Trạng thái “Đã hủy” phân biệt theo lý do:

- (a) Khách hàng chủ động hủy - khách hàng tự hủy lịch hẹn (spa hoặc lưu trú) trong thời hạn tự phục vụ (FR-CHG-01).
- (b) Cửa hàng không thể đáp ứng - quản lý từ chối hoặc hủy vì không có khả năng đáp ứng (FR-ASG-04, FR-HTL-06, FR-CHG-03).
- (c) Theo yêu cầu của khách hàng ngoài thời hạn tự phục vụ - khách hàng muốn hủy lịch hẹn nhưng đã quá mốc tự phục vụ; được quản lý xử lý thay (FR-CHG-03).
- (d) Vắng mặt - khách hàng không đến đúng lịch hẹn (spa hoặc lưu trú) trong thời gian giữ chỗ tối đa (15 phút) sau giờ hẹn, hệ thống tự động hủy (FR-EXE-07).
- (e) Khách hàng từ chối, hoặc không phản hồi trong 30 phút, chi phí mới khi cân nặng thực tế làm tăng nhóm kích cỡ - lỗi do khách hàng, hệ thống tự động hủy (BR-23, FR-EXE-11).

Trạng thái lịch hẹn chỉ được chuyển đổi theo đúng trình tự tiến của vòng đời tương ứng, không bỏ qua bước, không chuyển ngược; ngoại lệ: chuyển sang “Đã hủy”, và quay từ “Đã xác nhận” về “Chờ xác nhận” khi khách hàng thay đổi lịch hẹn (BR-26) hoặc nhân viên spa phụ trách bị vô hiệu hóa (BR-27).

**Vòng đời thanh toán:** mỗi khoản thanh toán chuyển Chưa thanh toán -> Đã thanh toán. Lịch hẹn spa có 1 khoản (sau khi “Hoàn tất”); lịch hẹn lưu trú có tối đa 2 khoản: tiền lưu trú (trước khi gửi thú cưng) và phí phạt trả muộn (khi nhận lại thú cưng). Không đặt cọc khi đặt lịch; không có trạng thái “Hoàn tiền” (việc hoàn tiền xử lý ngoài hệ thống - BR-24).

## 3.4. Quy tắc nghiệp vụ

27 quy tắc nghiệp vụ (BR-01 -> BR-27) ràng buộc hệ thống trong toàn bộ tài liệu, được tham chiếu xuyên suốt Phần 4 và Phần 5:

| **Mã** | **Quy tắc** |
|---|---|
| BR-01 | Mỗi lịch hẹn phải gắn với một khách hàng đã có hồ sơ thú cưng. Khách hàng gồm 2 loại:<br>(a) khách hàng có tài khoản hợp lệ - tự đặt lịch trên web hoặc được lễ tân đặt thay khi đến trực tiếp;<br>(b) khách vãng lai - không có tài khoản, được lễ tân ghi nhận thông tin liên hệ và đặt lịch thay. |
| BR-02 | Một lịch hẹn phải gắn với đúng một thú cưng. Lịch hẹn spa phải có ít nhất một dịch vụ cụ thể áp dụng cho loài của thú cưng; lịch hẹn lưu trú gắn với một chuồng (BR-21). |
| BR-03 | Lịch hẹn chỉ được xác nhận khi cửa hàng thực sự có khả năng đáp ứng: lịch hẹn spa cần có nhân sự phù hợp trong khung giờ yêu cầu; lịch hẹn lưu trú cần có chuồng phù hợp còn trống trong toàn bộ các đêm. |
| BR-04 | Một nhân viên spa không được phân công cho hai lịch hẹn spa trùng khung giờ. |
| BR-05 | Cập nhật trạng thái thực hiện chỉ do:<br>(a) lễ tân hoặc quản lý - đối với tiếp nhận thú cưng (kèm ghi nhận cân nặng thực tế) và trả thú cưng lưu trú;<br>(b) nhân viên spa được phân công hoặc quản lý - đối với các bước thực hiện và hoàn tất lịch hẹn spa. |
| BR-06 | Lịch hẹn spa chỉ chuyển sang trạng thái “Hoàn tất” khi toàn bộ dịch vụ trong lịch hẹn đã được thực hiện xong. |
| BR-07 | Thanh toán lịch hẹn spa chỉ được ghi nhận khi lịch hẹn “Hoàn tất”. Với lịch hẹn lưu trú: tiền lưu trú chỉ được ghi nhận khi lịch hẹn “Đã xác nhận” (trước khi tiếp nhận); phí phạt trả muộn chỉ được ghi nhận khi lịch hẹn “Đang lưu trú” (lúc trả thú cưng). Lịch hẹn lưu trú chỉ chuyển “Đang lưu trú” khi tiền lưu trú đã thanh toán, và chỉ chuyển “Hoàn tất” khi phí phạt trả muộn (nếu có) đã thanh toán. |
| BR-08 | Khách hàng có tài khoản được quyền tự hủy hoặc đổi lịch hẹn (spa hoặc lưu trú) miễn phí trên web nếu thực hiện trước giờ hẹn (giờ bắt đầu khung giờ spa hoặc giờ nhận lưu trú) tối thiểu một khoảng thời gian do cửa hàng cấu hình (1-2 tiếng); sau mốc này, chức năng tự hủy/đổi bị khóa và khách hàng cần liên hệ trực tiếp (hotline) để quản lý xử lý. Cửa hàng giữ chỗ tối đa 15 phút sau giờ hẹn đã xác nhận; nếu quá thời gian này mà thú cưng chưa được tiếp nhận (check-in), hệ thống tự động chuyển lịch hẹn sang trạng thái “Đã hủy” với lý do vắng mặt. |
| BR-09 | Cửa hàng chấp nhận thanh toán tại quầy (tiền mặt hoặc chuyển khoản ngân hàng qua mã QR, được lễ tân/quản lý xác nhận thủ công) và thanh toán trực tuyến qua cổng thanh toán (sandbox VNPAY/MoMo) trên web. Thanh toán trực tuyến chỉ áp dụng cho lịch hẹn spa sau khi hoàn tất; mọi khoản thanh toán của lịch hẹn lưu trú thực hiện tại quầy. |
| BR-10 | Khách hàng không có quyền chỉ định nhân viên spa cụ thể khi đặt lịch hẹn (chỉ chọn thú cưng, dịch vụ và khung giờ mong muốn). Hệ thống hỗ trợ đề xuất nhân viên spa phù hợp dựa trên lịch làm việc và tình trạng phân công hiện tại, nhưng quyết định cuối cùng về nhân viên phụ trách thuộc về quản lý. |
| BR-11 | Mỗi dịch vụ trong danh mục phải có một mức giá xác định theo loài và nhóm kích cỡ của thú cưng (BR-19) do quản lý thiết lập, làm cơ sở tính tổng chi phí của lịch hẹn spa. |
| BR-12 | Mỗi dịch vụ trong danh mục phải có thời lượng dự kiến theo loài và nhóm kích cỡ (BR-19) do quản lý thiết lập, làm cơ sở xác định khung giờ khả dụng khi đặt lịch và khi phân công nhân viên spa. |
| BR-13 | Một mốc giờ của lịch hẹn spa còn chỗ khi (1) không muộn hơn mốc bắt đầu muộn nhất của mọi dịch vụ đã chọn, và (2) số nhân viên spa đang hoạt động có ca làm bao phủ trọn khoảng giữ chỗ, trừ số nhân viên cần nhiều nhất tại một thời điểm của các lịch hẹn đang giữ chỗ, không ít hơn số nhân viên cần của lịch hẹn (SA 2.3.3). Mốc không đạt hiển thị “Đã kín” hoặc “không nhận dịch vụ ở mốc này”. |
| BR-14 | Trạng thái lịch hẹn chỉ được chuyển đổi theo đúng trình tự tiến của vòng đời tương ứng với loại lịch hẹn (Phần 3.3), không bỏ bước và không chuyển ngược, trừ 2 ngoại lệ:<br>(a) chuyển sang “Đã hủy” từ bất kỳ trạng thái nào trước khi hoàn tất (không được chuyển ngược từ “Đã hủy”);<br>(b) quay từ “Đã xác nhận” về “Chờ xác nhận” theo BR-26 hoặc BR-27. |
| BR-15 | Nếu một khách hàng bị đánh dấu vắng mặt quá 3 lần trong vòng 30 ngày, hệ thống tạm khóa quyền tự đặt lịch hẹn trực tuyến của khách hàng đó; khách hàng cần liên hệ trực tiếp (hotline) để tiếp tục đặt lịch. Khóa không áp dụng khi lễ tân đặt lịch thay khách đến trực tiếp. |
| BR-16 | Mọi thao tác xem hoặc thay đổi dữ liệu gắn với một chủ thể cụ thể (hồ sơ thú cưng, lịch hẹn, ảnh minh chứng, lịch sử sử dụng dịch vụ, thông tin thanh toán, thông tin tài khoản cá nhân) phải được hệ thống kiểm tra quyền sở hữu/phạm vi phù hợp với vai trò của actor thực hiện yêu cầu, không chỉ dựa vào việc actor đã đăng nhập hợp lệ: khách hàng chỉ được xem hoặc thao tác trên dữ liệu thuộc sở hữu của chính mình; nhân viên spa chỉ được xem hoặc cập nhật các lịch hẹn spa được phân công cho mình; lễ tân được xem lịch hẹn, hồ sơ khách và thú cưng trong phạm vi cửa hàng để phục vụ đặt lịch, tiếp nhận, thanh toán nhưng không cập nhật tiến độ thực hiện; quản lý có toàn quyền truy cập trong phạm vi cửa hàng. |
| BR-17 | Trước khi hệ thống ghi nhận “Đã thanh toán” cho một khoản thanh toán, số tiền thực nhận (tại quầy hoặc qua cổng thanh toán) phải khớp với số tiền của khoản đó, xác định theo BR-11 (lịch spa) hoặc BR-22 (lịch lưu trú: tiền lưu trú; phí phạt trả muộn), theo nhóm kích cỡ đã được đối chiếu (BR-23); không được đánh dấu “Đã thanh toán” khi số tiền nhận được chưa đủ. |
| BR-18 | Khi có nhiều yêu cầu xảy ra gần như đồng thời (nhiều khách hàng cùng đặt một khung giờ; nhiều lịch hẹn spa cùng được xem xét phân công cho một nhân viên spa; nhiều lịch hẹn lưu trú cùng được xem xét cho một chuồng hoặc cho số chuồng còn lại), hệ thống phải đảm bảo kết quả cuối cùng vẫn tuân thủ đúng năng lực phục vụ (BR-13), không phân công trùng nhân viên spa (BR-04) và không gán trùng chuồng (BR-21); cơ chế kỹ thuật cụ thể để đảm bảo tính nhất quán này thuộc giai đoạn thiết kế kỹ thuật. |
| BR-19 | Cửa hàng chỉ phục vụ 4 loài: chó, mèo, thỏ, chuột lang. Nhóm kích cỡ (Nhỏ, Vừa, Lớn) của thú cưng do hệ thống tự xác định theo Bảng mốc phân nhóm kích cỡ bên dưới (giá trị cấu hình được). Riêng chó xác định theo cả cân nặng và chiều cao (vai), lấy nhóm cao hơn. Nhóm kích cỡ là căn cứ xác định giá, thời lượng dịch vụ spa, giá lưu trú và chuồng phù hợp. |
| BR-20 | Lịch hẹn spa chỉ được chuyển sang “Đang thực hiện” khi thú cưng có ảnh trước chăm sóc hợp lệ: ảnh gần nhất của thú cưng, do nhân viên spa tải lên trong vòng 7 ngày tính đến thời điểm bắt đầu thực hiện; và chỉ được chuyển sang “Hoàn tất” khi đã có ít nhất một ảnh sau chăm sóc tải lên cho lịch hẹn đó. Khách hàng có tài khoản được xem ảnh minh chứng của lịch hẹn thuộc sở hữu của mình. |
| BR-21 | Lưu trú tính theo đêm. Mỗi chuồng chứa một thú cưng tại một thời điểm; sức chứa lưu trú là số chuồng đang sử dụng. Mỗi lịch hẹn lưu trú được gán một chuồng phù hợp với loài và nhóm kích cỡ; một chuồng không được gán cho hai lịch hẹn lưu trú trùng đêm. Hệ thống phải cho biết mỗi chuồng đang chứa thú cưng của khách hàng nào. |
| BR-22 | Lịch hẹn lưu trú có tối đa 2 khoản thanh toán:<br>(1) Tiền lưu trú = số đêm × (giá lưu trú/đêm + giá thức ăn/đêm), thanh toán trước khi gửi thú cưng; giá lưu trú và giá thức ăn (cửa hàng cung cấp, tính phí) theo loài và nhóm kích cỡ; số đêm tính theo lịch hẹn (từ ngày nhận đến ngày trả dự kiến).<br>(2) Phí phạt trả muộn (nếu có), thanh toán khi nhận lại thú cưng: trễ không quá 30 phút không tính phí; từ phút thứ 31, cứ mỗi 60 phút tính một lần phí phạt (trên 30 đến 90 phút: 1 lần; trên 90 đến 150 phút: 2 lần; ...), tức số lần = ⌈(số phút trễ − 30) / 60⌉; thời gian trễ tính từ thời điểm trả dự kiến đến khi khách nhận lại thú cưng; mức phí phạt mỗi lần do quản lý thiết lập.<br>Trả sớm: xử lý như trả bình thường, không hoàn tiền.<br>Lịch hẹn lưu trú không kèm dịch vụ spa; muốn spa phải đặt lịch hẹn spa riêng. |
| BR-23 | Khi tiếp nhận lịch hẹn, trước khi bắt đầu thực hiện dịch vụ spa hoặc trước khi thu tiền lưu trú, lễ tân ghi nhận cân nặng thực tế của thú cưng; hệ thống đối chiếu với cân nặng khai báo trong hồ sơ (chiều cao của chó giữ theo hồ sơ):<br>(a) cân nặng thực tế nhỏ hơn khai báo: ghi nhận cân nặng mới; nếu thú cưng xuống nhóm kích cỡ nhỏ hơn thì tự động giảm chi phí theo nhóm mới;<br>(b) cân nặng thực tế lớn hơn khai báo mà chênh lệch không vượt ngưỡng dung sai, hoặc vượt ngưỡng nhưng thú cưng vẫn cùng nhóm kích cỡ: chỉ ghi nhận cân nặng thực tế, chi phí của lịch hẹn không đổi;<br>(c) cân nặng thực tế lớn hơn khai báo, vượt ngưỡng dung sai và chuyển sang nhóm kích cỡ lớn hơn: hệ thống tính lại chi phí theo nhóm mới (phụ thu) và thông báo khách hàng; khách hàng xác nhận thì tiếp tục (thực hiện dịch vụ spa hoặc thu tiền lưu trú) và cập nhật hồ sơ; khách hàng từ chối, hoặc không phản hồi trong 30 phút, thì lịch hẹn tự động bị hủy (lỗi do khách hàng).<br>Chênh lệch bằng ngưỡng dung sai được tính là nằm trong ngưỡng; ngưỡng áp dụng theo ranh giới nhóm cao nhất mà cân nặng thực tế vượt qua (Bảng ngưỡng dung sai bên dưới, cấu hình được).<br>Khi nhóm kích cỡ thay đổi, thời lượng và khung giờ của lịch hẹn spa giữ nguyên như lúc đặt.<br>Với lịch hẹn lưu trú, nếu chuồng đã gán không còn phù hợp nhóm kích cỡ mới thì quản lý gán chuồng phù hợp khác (FR-HTL-05); nếu hết chuồng phù hợp thì khách hàng được thông báo và quản lý từ chối, hủy lịch hẹn với lý do “cửa hàng không thể đáp ứng”. |
| BR-24 | Khi quản lý hủy lịch hẹn đã có khoản thanh toán “Đã thanh toán”: nếu lý do là “cửa hàng không thể đáp ứng” thì cửa hàng hoàn 100% số tiền đã thanh toán; nếu do khách hàng thì không hoàn. Việc hoàn tiền do cửa hàng liên hệ và xử lý riêng với khách hàng, ngoài hệ thống; hệ thống không có trạng thái hoàn tiền. |
| BR-25 | Khi khách hàng gỡ hồ sơ thú cưng: hồ sơ chưa từng phát sinh lịch hẹn thì xóa hẳn; hồ sơ đã có lịch sử lịch hẹn thì xóa mềm - chuyển từ “đang hoạt động” sang “ngừng hoạt động” và ẩn khỏi giao diện khách hàng, dữ liệu vẫn được giữ cho các lịch hẹn liên quan. |
| BR-26 | Khi khách hàng tự thay đổi lịch hẹn (khung giờ hoặc thời điểm nhận/trả, thú cưng, dịch vụ), lịch hẹn quay về “Chờ xác nhận” để quản lý duyệt; khi duyệt, hệ thống tính lại số tiền khách hàng phải trả (BR-11, BR-22) và quản lý xem xét lại việc phân công nhân viên spa hoặc gán chuồng; quản lý có thể từ chối nếu cửa hàng không thể đáp ứng. |
| BR-27 | Khi tài khoản nhân viên spa bị vô hiệu hóa, các lịch hẹn spa “Đã xác nhận” đã phân công cho nhân viên đó quay về “Chờ xác nhận” để quản lý phân công lại; nếu nhân viên đó là nhân viên cuối cùng rảnh trong khung giờ của lịch hẹn thì quản lý từ chối lịch hẹn (cửa hàng không thể đáp ứng). Khách hàng được thông báo. |

### Bảng mốc phân nhóm kích cỡ (BR-19)

| **Loài** | **Tiêu chí** | **Nhỏ** | **Vừa** | **Lớn** |
|---|---|---|---|---|
| Chó | Cân nặng | Dưới 10 kg | 10 kg đến dưới 25 kg | Từ 25 kg |
| Chó | Chiều cao (vai) | Dưới 35 cm | 35 cm đến dưới 55 cm | Từ 55 cm |
| Mèo | Cân nặng | Dưới 3 kg | 3 kg đến dưới 5 kg | Từ 5 kg |
| Thỏ | Cân nặng | Dưới 1,5 kg | 1,5 kg đến dưới 3 kg | Từ 3 kg |
| Chuột lang | Cân nặng | Dưới 1 kg | Không áp dụng | Từ 1 kg |

### Bảng ngưỡng dung sai (BR-23)

| **Loài** | **Ranh giới nhóm** | **Ngưỡng dung sai (cân nặng)** |
|---|---|---|
| Chuột lang | Nhỏ -> Lớn | 0,2 kg |
| Thỏ | Nhỏ -> Vừa; Vừa -> Lớn | 0,3 kg |
| Mèo | Nhỏ -> Vừa; Vừa -> Lớn | 0,5 kg |
| Chó | Nhỏ -> Vừa | 1,5 kg |
| Chó | Vừa -> Lớn | 2,5 kg |

# PHẦN 4: YÊU CẦU CHỨC NĂNG CHI TIẾT

## 4.1. Danh sách tính năng tổng quan

| **Nhóm tính năng** | **Business Process** | **Mã FR** | **Platform** |
|---|---|---|---|
| 4.2.1 Account Management - Đăng ký, đăng nhập, cập nhật thông tin khách hàng; ghi nhận khách vãng lai | BP-01 | FR-ACC-01 -> FR-ACC-04 | Web khách hàng; web nhân viên (FR-ACC-04) |
| 4.2.2 Pet Profile Management - Tạo, xem/cập nhật, gỡ bỏ hồ sơ thú cưng; xác định nhóm kích cỡ | BP-02 | FR-PET-01 -> FR-PET-04 | Web khách hàng; web nhân viên; hệ thống (FR-PET-04) |
| 4.2.3 Service Catalog Management - Thêm/sửa/ngừng dịch vụ; xem danh mục | BP-03 | FR-SVC-01 -> FR-SVC-04 | Web quản lý (quản lý); web khách hàng, web nhân viên (xem) |
| 4.2.4 Appointment Booking - Chọn thú cưng/dịch vụ, xem khung giờ, gửi yêu cầu đặt lịch spa, theo dõi trạng thái/lịch sử, khóa & gỡ khóa do vắng mặt | BP-04 | FR-BOOK-01 -> FR-BOOK-07 | Web khách hàng; web nhân viên (lễ tân đặt thay); web quản lý (FR-BOOK-07); hệ thống (FR-BOOK-06) |
| 4.2.5 Spa Appointment Confirmation & Staff Assignment - Đề xuất nhân viên spa, xác nhận/điều chỉnh phân công, xác nhận/từ chối lịch hẹn spa | BP-05 | FR-ASG-01 -> FR-ASG-04 | Web quản lý; hệ thống (FR-ASG-01) |
| 4.2.6 Lifecycle Control - Kiểm soát chuyển trạng thái lịch hẹn và thanh toán (cross-cutting) | BP-04 -> BP-08, BP-12 | FR-LFC-01, FR-LFC-02 | Hệ thống (không giao diện riêng) |
| 4.2.7 Appointment Change/Cancellation - Tự thay đổi/hủy lịch hẹn trong hạn, khóa sau hạn, quản lý xử lý can thiệp | BP-06 | FR-CHG-01 -> FR-CHG-03 | Web khách hàng; web quản lý |
| 4.2.8 Service Execution - Xem lịch hẹn, tiếp nhận, đối chiếu cân nặng thực tế, xác nhận chi phí mới, cập nhật tiến độ, hoàn tất, tự động hủy do vắng mặt, giám sát tiến độ, ảnh minh chứng trước/sau | BP-07 | FR-EXE-01 -> FR-EXE-11 | Web nhân viên; web quản lý; hệ thống (FR-EXE-07) |
| 4.2.9 Payment - Xác định số tiền, ghi nhận thanh toán tại quầy, thanh toán trực tuyến, theo dõi tình hình thanh toán | BP-08 | FR-PAY-01 -> FR-PAY-04 | Web khách hàng; web nhân viên; web quản lý; hệ thống (FR-PAY-01) |
| 4.2.10 Staff Management - Tạo, cập nhật, vô hiệu hóa tài khoản nhân viên | BP-09 | FR-STF-01 -> FR-STF-03 | Web quản lý |
| 4.2.11 Notification - Thông báo đặt lịch, xác nhận/phân công, thay đổi trạng thái, hủy, thanh toán, yêu cầu xác nhận chi phí mới | BP-10 | FR-NOT-01 -> FR-NOT-06 | Web khách hàng; web nhân viên; hệ thống |
| 4.2.12 Cage & Hotel Pricing Management - Thêm/cập nhật/ngừng sử dụng chuồng; thiết lập giá lưu trú, thức ăn và phí phạt trả muộn | BP-11 | FR-HTL-01 -> FR-HTL-03 | Web quản lý |
| 4.2.13 Hotel Stay - Đặt lưu trú, xác nhận & gán chuồng, tiếp nhận, xem tình trạng chuồng, trả thú cưng | BP-12 | FR-HTL-04 -> FR-HTL-09 | Web khách hàng; web nhân viên; web quản lý |

## 4.2. Mô tả chức năng chi tiết

### 4.2.1 Quản lý tài khoản - Khách hàng (BP-01)

#### FR-ACC-01 – Đăng ký tài khoản khách hàng

**Actor:** Khách hàng | **Platform:** Web khách hàng

**Điều kiện tiên quyết:** Người dùng chưa có tài khoản trong hệ thống.

**Mô tả:** Hệ thống phải cho phép người dùng đăng ký tài khoản khách hàng bằng cách cung cấp thông tin cá nhân cơ bản (họ tên, thông tin liên hệ) và thông tin xác thực.

**Ngoại lệ:** Nếu thông tin liên hệ đã được dùng cho một tài khoản khác, hoặc thông tin không hợp lệ, hệ thống phải từ chối đăng ký và thông báo lý do.

**Quy tắc nghiệp vụ:** BR-01.

**Tiêu chí nghiệm thu:**

- Hệ thống tạo tài khoản mới và cho phép đăng nhập khi thông tin đăng ký hợp lệ, chưa từng được sử dụng.
- Hệ thống từ chối và hiển thị thông báo lỗi trùng lặp nếu thông tin liên hệ đã tồn tại trước đó.

#### FR-ACC-02 – Đăng nhập tài khoản khách hàng

**Actor:** Khách hàng | **Platform:** Web khách hàng

**Điều kiện tiên quyết:** Tài khoản đã tồn tại và hợp lệ.

**Mô tả:** Hệ thống phải cho phép khách hàng đăng nhập bằng thông tin xác thực đã đăng ký để sử dụng các chức năng khác.

**Ngoại lệ:** Nếu thông tin xác thực không đúng, hệ thống phải từ chối đăng nhập và thông báo lỗi.

**Quy tắc nghiệp vụ:** không có ràng buộc nghiệp vụ riêng; là điều kiện tiên quyết cho các FR khác.

**Tiêu chí nghiệm thu:**

- Khi người dùng đăng nhập với thông tin xác thực đúng, hệ thống cấp quyền truy cập vào các chức năng của khách hàng.
- Khi người dùng đăng nhập với thông tin xác thực sai, hệ thống từ chối và báo lỗi.

#### FR-ACC-03 – Cập nhật thông tin cá nhân khách hàng

**Actor:** Khách hàng | **Platform:** Web khách hàng

**Điều kiện tiên quyết:** Khách hàng đã đăng nhập.

**Mô tả:** Hệ thống phải cho phép khách hàng xem và cập nhật thông tin cá nhân của chính mình. Hệ thống phải kiểm tra tài khoản đang được xem, cập nhật thuộc đúng khách hàng đang đăng nhập, không chỉ dựa vào việc đã đăng nhập hợp lệ.

**Ngoại lệ:** Nếu yêu cầu nhắm đến một tài khoản khác, hệ thống phải từ chối thao tác.

**Quy tắc nghiệp vụ:** BR-16.

**Tiêu chí nghiệm thu:**

- Khi khách hàng đã đăng nhập cập nhật hợp lệ thông tin cá nhân của chính mình, hệ thống lưu thay đổi.
- Khi cố gắng xem hoặc cập nhật tài khoản khác, hệ thống từ chối thao tác.

#### FR-ACC-04 – Lễ tân ghi nhận khách vãng lai

**Actor:** Lễ tân | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lễ tân đã đăng nhập; khách hàng đến trực tiếp và chưa có tài khoản.

**Mô tả:** Hệ thống phải cho phép lễ tân ghi nhận khách vãng lai (họ tên, thông tin liên hệ) để gắn với hồ sơ thú cưng và lịch hẹn. Khách vãng lai không có tài khoản đăng nhập.

**Ngoại lệ:** Nếu thông tin liên hệ đã thuộc một khách hàng hiện có, hệ thống phải từ chối tạo trùng và yêu cầu lễ tân chọn khách hàng hiện có.

**Quy tắc nghiệp vụ:** BR-01.

**Tiêu chí nghiệm thu:**

- Khi lễ tân nhập thông tin hợp lệ, chưa tồn tại, hệ thống lưu khách vãng lai và không tạo thông tin đăng nhập.
- Hệ thống từ chối và báo lỗi trùng lặp nếu thông tin liên hệ đã tồn tại.

### 4.2.2 Quản lý hồ sơ thú cưng (BP-02)

#### FR-PET-01 – Tạo hồ sơ thú cưng

**Actor:** Khách hàng có tài khoản; Lễ tân (thay khách đến trực tiếp) | **Platform:** Web khách hàng; web nhân viên

**Điều kiện tiên quyết:** Khách hàng đã đăng nhập; hoặc lễ tân đã đăng nhập và đã chọn/ghi nhận khách hàng (FR-ACC-04).

**Điều kiện kích hoạt:** Cần đặt lịch cho một thú cưng chưa có hồ sơ.

**Mô tả:** Hệ thống phải cho phép tạo hồ sơ thú cưng mới gắn với khách hàng, gồm: tên, loài (chó, mèo, thỏ, chuột lang), giống, tính cách, cân nặng, chiều cao, đặc điểm lông, ghi chú (tiền sử bệnh, lưu ý chăm sóc). Thông tin do khách hàng khai (lễ tân nhập thay khi khách đến trực tiếp). Bắt buộc: tên, loài, giống, cân nặng và chiều cao (đối với chó).

**Ngoại lệ:** Thiếu thông tin bắt buộc hoặc loài không thuộc 4 loài phục vụ -> từ chối.

**Quy tắc nghiệp vụ:** BR-01, BR-02, BR-19.

**Tiêu chí nghiệm thu:**

- Khi nhập thông tin thú cưng hợp lệ, hệ thống lưu hồ sơ và gắn với khách hàng tương ứng.
- Khi thiếu thông tin bắt buộc hoặc loài không được phục vụ, hệ thống từ chối và báo lỗi.

#### FR-PET-02 – Xem và cập nhật hồ sơ thú cưng

**Actor:** Khách hàng có tài khoản (xem, cập nhật hồ sơ của mình); Lễ tân (xem, cập nhật hồ sơ khi phục vụ khách tại cửa hàng, kể cả cập nhật cân nặng khi tiếp nhận); Nhân viên spa (chỉ xem hồ sơ gắn với lịch hẹn được phân công); Quản lý (chỉ xem) | **Platform:** Web khách hàng; web nhân viên; web quản lý

**Mô tả:** Hệ thống phải cho phép xem và cập nhật hồ sơ thú cưng đúng phạm vi của từng actor; phải kiểm tra quyền sở hữu/phạm vi trước khi cho xem, cập nhật, không chỉ dựa vào việc đã đăng nhập hợp lệ.

**Ngoại lệ:** Hồ sơ nằm ngoài phạm vi của actor đang đăng nhập -> từ chối thao tác.

**Quy tắc nghiệp vụ:** BR-16, BR-19.

**Tiêu chí nghiệm thu:**

- Khi cập nhật hợp lệ hồ sơ thuộc phạm vi của actor, hệ thống lưu thay đổi.
- Khi cố gắng xem hoặc cập nhật hồ sơ ngoài phạm vi (ví dụ hồ sơ của khách hàng khác, hoặc nhân viên spa cập nhật hồ sơ), hệ thống từ chối.

#### FR-PET-03 – Gỡ bỏ hồ sơ thú cưng

**Actor:** Khách hàng có tài khoản | **Platform:** Web khách hàng

**Mô tả:** Hệ thống phải cho phép khách hàng gỡ bỏ hồ sơ thú cưng thuộc sở hữu của mình theo BR-25: hồ sơ chưa từng phát sinh lịch hẹn thì xóa hẳn; hồ sơ đã có lịch sử lịch hẹn thì xóa mềm (chuyển từ “đang hoạt động” sang “ngừng hoạt động” và ẩn khỏi giao diện khách hàng). Phải kiểm tra quyền sở hữu trước khi gỡ bỏ.

**Ngoại lệ:** Hồ sơ không thuộc sở hữu của khách hàng đang đăng nhập -> từ chối.

**Quy tắc nghiệp vụ:** BR-16, BR-25.

**Tiêu chí nghiệm thu:**

- Hồ sơ chưa từng phát sinh lịch hẹn: hệ thống xóa hẳn khỏi dữ liệu.
- Hồ sơ đã có lịch sử lịch hẹn: hệ thống chuyển sang “ngừng hoạt động”, ẩn khỏi danh sách của khách hàng và vẫn giữ dữ liệu cho các lịch hẹn liên quan.
- Khi cố gắng gỡ bỏ hồ sơ thuộc về khách hàng khác, hệ thống từ chối.

#### FR-PET-04 – Hệ thống xác định nhóm kích cỡ thú cưng

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Điều kiện kích hoạt:** Hồ sơ thú cưng được tạo hoặc cập nhật cân nặng/chiều cao.

**Mô tả:** Hệ thống phải tự xác định nhóm kích cỡ (Nhỏ, Vừa, Lớn) của thú cưng từ loài, cân nặng và chiều cao (đối với chó) theo bảng mốc BR-19; không nhận nhóm kích cỡ do client tự gửi.

**Quy tắc nghiệp vụ:** BR-19.

**Tiêu chí nghiệm thu:**

- Với mỗi loài, hệ thống xác định đúng nhóm theo bảng mốc BR-19 (chó: lấy nhóm cao hơn giữa cân nặng và chiều cao).
- Nhóm kích cỡ do client gửi lên bị bỏ qua.

### 4.2.3 Quản lý danh mục dịch vụ (BP-03)

#### FR-SVC-01 – Thêm dịch vụ mới

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý thêm dịch vụ spa mới vào danh mục, gồm tên, mô tả nghiệp vụ, loài áp dụng, giá dịch vụ và thời lượng dự kiến theo từng nhóm kích cỡ của loài đó.

**Quy tắc nghiệp vụ:** BR-11 (giá), BR-12 (thời lượng), BR-19.

**Tiêu chí nghiệm thu:** Khi quản lý thêm dịch vụ với thông tin hợp lệ (tên, loài áp dụng, giá và thời lượng cho từng nhóm), hệ thống lưu vào danh mục và hiển thị cho khách hàng.

#### FR-SVC-02 – Chỉnh sửa dịch vụ

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý chỉnh sửa thông tin một dịch vụ hiện có, bao gồm loài áp dụng, giá và thời lượng dự kiến theo nhóm kích cỡ.

**Quy tắc nghiệp vụ:** BR-11, BR-12, BR-19.

**Tiêu chí nghiệm thu:** Khi cập nhật hợp lệ dịch vụ đang tồn tại, hệ thống lưu thay đổi và áp dụng cho các lượt đặt lịch tiếp theo; lịch hẹn đã đặt nhưng chưa ghi nhận thanh toán được tính số tiền theo đơn giá hiện có tại thời điểm ghi nhận (FR-PAY-01).

#### FR-SVC-03 – Ngừng cung cấp dịch vụ

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý ngừng cung cấp một dịch vụ khi cần.

**Quy tắc nghiệp vụ:** không có ràng buộc riêng.

**Tiêu chí nghiệm thu:** Khi quản lý ngừng cung cấp dịch vụ đang hoạt động, hệ thống không còn hiển thị dịch vụ này cho khách hàng khi đặt lịch mới.

#### FR-SVC-04 – Xem danh mục dịch vụ

**Actor:** Khách hàng, Nhân viên | **Platform:** Web khách hàng; web nhân viên

**Mô tả:** Hệ thống phải cho phép xem danh mục dịch vụ đang cung cấp, kèm giá và thời lượng dự kiến theo loài và nhóm kích cỡ.

**Quy tắc nghiệp vụ:** BR-11, BR-12.

**Tiêu chí nghiệm thu:** Khi xem danh mục có ít nhất một dịch vụ đang hoạt động, hệ thống hiển thị đầy đủ tên, giá và thời lượng của từng dịch vụ theo loài và nhóm kích cỡ.

### 4.2.4 Đặt lịch hẹn spa (BP-04)

#### FR-BOOK-01 – Chọn thú cưng và dịch vụ cho lịch hẹn spa

**Actor:** Khách hàng có tài khoản; Lễ tân (thay khách đến trực tiếp) | **Platform:** Web khách hàng; web nhân viên

**Điều kiện tiên quyết:** Khách hàng đã đăng nhập và có ít nhất một hồ sơ thú cưng; hoặc lễ tân đã chọn khách hàng (có tài khoản hoặc vãng lai) và thú cưng.

**Mô tả:** Hệ thống phải cho phép chọn một thú cưng cụ thể và một hoặc nhiều dịch vụ cho lịch hẹn spa; chỉ hiển thị dịch vụ áp dụng cho loài của thú cưng, kèm giá theo nhóm kích cỡ.

**Quy tắc nghiệp vụ:** BR-02, BR-11.

**Tiêu chí nghiệm thu:**

- Khi tiếp tục quy trình sau khi đã chọn một thú cưng và ít nhất một dịch vụ, hệ thống ghi nhận lựa chọn để chuyển sang bước chọn khung giờ.
- Dịch vụ không áp dụng cho loài của thú cưng không thể được chọn.

#### FR-BOOK-02 – Xem khung giờ khả dụng

**Actor:** Khách hàng có tài khoản; Lễ tân | **Platform:** Web khách hàng; web nhân viên

**Mô tả:** Hệ thống phải hiển thị các khung giờ còn trống theo quy tắc BR-13 (phụ thuộc dịch vụ và thú cưng đã chọn); mốc đã kín hoặc không nhận dịch vụ được hiển thị là không còn chỗ.

**Quy tắc nghiệp vụ:** BR-13.

**Tiêu chí nghiệm thu:** Khi xem khung giờ khả dụng, hệ thống không hiển thị mốc giờ không đủ nhân viên, hoặc muộn hơn mốc bắt đầu muộn nhất của dịch vụ đã chọn, là còn trống.

#### FR-BOOK-03 – Gửi yêu cầu đặt lịch hẹn spa

**Actor:** Khách hàng có tài khoản; Lễ tân (thay khách đến trực tiếp) | **Platform:** Web khách hàng; web nhân viên

**Điều kiện tiên quyết:** Khách tự đặt: đã đăng nhập, có hồ sơ thú cưng hợp lệ, tài khoản không bị khóa quyền tự đặt lịch (BR-15). Lễ tân đặt thay: khách hàng và thú cưng đã có hồ sơ (BR-15 không áp dụng).

**Mô tả:** Hệ thống phải tạo lịch hẹn spa mới ở trạng thái “Chờ xác nhận” khi gửi yêu cầu hợp lệ.

**Ngoại lệ:** tài khoản bị khóa (BR-15) khi tự đặt -> từ chối, hướng dẫn liên hệ hotline; khung giờ không còn trống -> từ chối, yêu cầu chọn khung giờ khác; nhiều yêu cầu gần như đồng thời vượt năng lực phục vụ -> chỉ số lượng trong giới hạn năng lực (BR-13) được chấp nhận, phần vượt bị từ chối như hết khung giờ (cơ chế kỹ thuật cụ thể - R-04).

**Quy tắc nghiệp vụ:** BR-01, BR-02, BR-15, BR-18.

**Tiêu chí nghiệm thu:**

- Khi gửi yêu cầu đặt lịch với đầy đủ điều kiện và khung giờ còn trống, hệ thống tạo lịch hẹn spa “Chờ xác nhận”.
- Khi khách hàng tự đặt từ tài khoản đang bị khóa quyền tự đặt lịch, hệ thống từ chối và thông báo lý do.
- Khi lễ tân đặt thay cho khách vãng lai hoặc khách đang bị khóa, hệ thống vẫn tạo lịch hẹn spa “Chờ xác nhận”.

#### FR-BOOK-04 – Theo dõi trạng thái lịch hẹn

**Actor:** Khách hàng có tài khoản | **Platform:** Web khách hàng

**Mô tả:** Hệ thống phải cho phép khách hàng xem trạng thái các lịch hẹn (spa và lưu trú) của mình; phải kiểm tra quyền sở hữu, kể cả khi truy cập trực tiếp bằng id lịch hẹn không thuộc về mình.

**Ngoại lệ:** lịch hẹn không thuộc sở hữu -> từ chối, không trả về thông tin.

**Quy tắc nghiệp vụ:** BR-16.

**Tiêu chí nghiệm thu:**

- Khi xem danh sách lịch hẹn của mình, hệ thống hiển thị đúng trạng thái hiện tại của từng lịch hẹn.
- Khi cố gắng xem lịch hẹn thuộc về khách hàng khác (kể cả bằng id), hệ thống từ chối và không trả về thông tin.

#### FR-BOOK-05 – Xem lịch sử sử dụng dịch vụ

**Actor:** Khách hàng có tài khoản | **Platform:** Web khách hàng

**Mô tả:** Hệ thống phải cho phép khách hàng xem lại các lịch hẹn đã hoàn tất của thú cưng thuộc sở hữu mình; phải kiểm tra quyền sở hữu trước khi trả dữ liệu.

**Ngoại lệ:** yêu cầu nhắm tới thú cưng/lịch hẹn không thuộc sở hữu -> từ chối.

**Quy tắc nghiệp vụ:** BR-16.

**Tiêu chí nghiệm thu:**

- Khi xem lịch sử của thú cưng có ít nhất một lịch hẹn đã hoàn tất, hệ thống hiển thị đầy đủ.
- Khi cố gắng xem thú cưng thuộc khách hàng khác, hệ thống từ chối.

#### FR-BOOK-06 – Theo dõi số lần vắng mặt và khóa quyền tự đặt lịch trực tuyến

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Điều kiện kích hoạt:** Một lịch hẹn (spa hoặc lưu trú) chuyển “Đã hủy” với lý do vắng mặt (FR-EXE-07).

**Mô tả:** Hệ thống phải theo dõi số lần vắng mặt của mỗi khách hàng trong cửa sổ 30 ngày gần nhất; khi vượt quá 3 lần, tự động khóa quyền tự đặt lịch trực tuyến.

**Quy tắc nghiệp vụ:** BR-15.

**Tiêu chí nghiệm thu:**

- Khi ghi nhận lịch hẹn thứ 4 bị đánh dấu vắng mặt trong vòng 30 ngày, hệ thống khóa quyền tự đặt lịch.
- Khi gửi yêu cầu đặt lịch mới với không quá 3 lần vắng mặt trong vòng 30 ngày, hệ thống không áp dụng khóa.

#### FR-BOOK-07 – Quản lý gỡ khóa quyền tự đặt lịch cho Khách hàng

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Tài khoản khách hàng đang bị khóa (BR-15).

**Điều kiện kích hoạt:** Khách hàng liên hệ trực tiếp (hotline) sau khi bị khóa.

**Mô tả:** Hệ thống phải cho phép quản lý gỡ khóa quyền tự đặt lịch trực tuyến cho một khách hàng đang bị khóa.

**Quy tắc nghiệp vụ:** BR-15.

**Tiêu chí nghiệm thu:** Khi quản lý gỡ khóa tài khoản đang bị khóa, khách hàng có thể tự đặt lịch trở lại.

### 4.2.5 Xác nhận lịch hẹn spa và phân công nhân viên spa (BP-05)

#### FR-ASG-01 – Hệ thống đề xuất nhân viên spa phù hợp

**Actor:** Hệ thống | **Platform:** Hệ thống (kết quả hiển thị trên web quản lý)

**Điều kiện kích hoạt:** Lịch hẹn spa ở trạng thái “Chờ xác nhận” (mới tạo, khách hàng đã thay đổi - BR-26, hoặc nhân viên phụ trách bị vô hiệu hóa - BR-27).

**Mô tả:** Hệ thống phải xác định và đề xuất nhân viên spa phù hợp dựa trên lịch làm việc và tình trạng phân công hiện tại trong khung giờ tương ứng.

**Quy tắc nghiệp vụ:** BR-04, BR-10, BR-12, BR-13.

**Tiêu chí nghiệm thu:** Khi xử lý đề xuất phân công cho lịch hẹn spa mới “Chờ xác nhận”, hệ thống chỉ đề xuất nhân viên spa không trùng khung giờ (BR-04).

#### FR-ASG-02 – Quản lý xác nhận hoặc điều chỉnh nhân viên spa phụ trách

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Hệ thống đã đề xuất nhân viên spa.

**Mô tả:** Hệ thống phải cho phép quản lý xác nhận đề xuất hoặc điều chỉnh sang nhân viên spa khác phù hợp hơn. Khách hàng không có quyền chỉ định nhân viên. Khi nhiều lịch hẹn được xử lý phân công gần như đồng thời, hệ thống phải đảm bảo không phân công trùng nhân viên spa cho hai lịch hẹn trùng khung giờ.

**Quy tắc nghiệp vụ:** BR-04, BR-10, BR-18.

**Tiêu chí nghiệm thu:**

- Khi xác nhận điều chỉnh sang nhân viên spa khác không trùng khung giờ, hệ thống chấp nhận.
- Khi phân công cho nhân viên spa đã có lịch hẹn trùng khung giờ, hệ thống từ chối và báo lỗi xung đột (BR-04).

#### FR-ASG-03 – Quản lý xác nhận lịch hẹn spa

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Nhân viên spa phụ trách đã xác định.

**Mô tả:** Hệ thống phải cho phép quản lý xác nhận lịch hẹn spa khi cửa hàng có khả năng đáp ứng. Khi xác nhận lịch hẹn do khách hàng đã thay đổi (BR-26), hệ thống tính lại số tiền khách hàng phải trả (FR-PAY-01).

**Ngoại lệ:** Không thể đáp ứng -> quản lý từ chối (FR-ASG-04).

**Quy tắc nghiệp vụ:** BR-03, BR-26.

**Tiêu chí nghiệm thu:** Khi quản lý xác nhận lịch hẹn spa đã có nhân viên spa phụ trách hợp lệ, hệ thống chuyển trạng thái sang “Đã xác nhận”.

#### FR-ASG-04 – Quản lý từ chối lịch hẹn spa khi cửa hàng không thể đáp ứng

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Lịch hẹn spa ở trạng thái “Chờ xác nhận”.

**Mô tả:** Hệ thống phải cho phép quản lý từ chối lịch hẹn spa khi không thể đáp ứng; chuyển sang “Đã hủy” với lý do “cửa hàng không thể đáp ứng”. Không định nghĩa trạng thái nào khác ngoài các trạng thái tại Phần 3.3.

**Quy tắc nghiệp vụ:** BR-03.

**Tiêu chí nghiệm thu:** Khi quản lý từ chối lịch hẹn spa “Chờ xác nhận” do không thể đáp ứng, hệ thống chuyển trạng thái sang “Đã hủy” kèm lý do tương ứng và gửi thông báo đến khách hàng (nếu có tài khoản).

### 4.2.6 Kiểm soát vòng đời (BP-04 -> BP-08, BP-12)

#### FR-LFC-01 – Kiểm soát chuyển trạng thái lịch hẹn

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Mô tả:** Hệ thống phải đảm bảo trạng thái lịch hẹn chỉ chuyển đúng trình tự tiến của vòng đời tương ứng loại lịch hẹn (spa hoặc lưu trú). Hai ngoại lệ: (a) chuyển sang “Đã hủy” từ bất kỳ trạng thái nào trước “Hoàn tất”; (b) quay từ “Đã xác nhận” về “Chờ xác nhận” khi khách hàng thay đổi lịch hẹn (BR-26) hoặc nhân viên spa phụ trách bị vô hiệu hóa (BR-27). Hệ thống phải từ chối mọi thao tác chuyển trạng thái sai trình tự, chuyển sang trạng thái không được định nghĩa, hoặc chuyển ngược từ “Đã hủy”.

**Quy tắc nghiệp vụ:** BR-14, BR-26, BR-27.

**Tiêu chí nghiệm thu:**

- Không cho phép thay đổi trạng thái của lịch hẹn đã hủy.
- Không cho phép chuyển thẳng trạng thái lịch hẹn spa từ “Chờ xác nhận” sang “Đang thực hiện”.
- Không cho phép chuyển thẳng trạng thái lịch hẹn lưu trú từ “Đã xác nhận” sang “Hoàn tất”.
- Lịch hẹn chỉ được quay từ “Đã xác nhận” về “Chờ xác nhận” trong 2 trường hợp trên; mọi chuyển ngược khác bị từ chối.

#### FR-LFC-02 – Kiểm soát chuyển trạng thái thanh toán

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Mô tả:** Hệ thống phải đảm bảo trạng thái của từng khoản thanh toán chỉ chuyển từ “Chưa thanh toán” sang “Đã thanh toán”, đúng thời điểm theo BR-07, và chỉ khi số tiền thực nhận khớp đủ với số tiền của khoản đó (FR-PAY-01/BR-11/BR-22). Từ chối trong mọi trường hợp số tiền chưa đủ.

**Quy tắc nghiệp vụ:** BR-07, BR-17.

**Tiêu chí nghiệm thu:**

- Lịch hẹn spa chỉ được ghi nhận thanh toán khi “Hoàn tất”; lịch hẹn lưu trú chỉ được ghi nhận tiền lưu trú khi “Đã xác nhận” và phí phạt khi “Đang lưu trú”.
- Chỉ cập nhật trạng thái “Đã thanh toán” khi số tiền thanh toán đã khớp đủ.
- Lịch hẹn lưu trú không chuyển “Đang lưu trú” khi tiền lưu trú chưa thanh toán, và không chuyển “Hoàn tất” khi phí phạt trả muộn (nếu có) chưa thanh toán.

### 4.2.7 Thay đổi hoặc hủy bỏ lịch hẹn (BP-06)

#### FR-CHG-01 – Khách hàng tự thay đổi hoặc hủy lịch hẹn trong thời hạn cho phép

**Actor:** Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện tiên quyết:** Lịch hẹn (spa hoặc lưu trú) chưa hoàn tất, chưa bị hủy; còn trong thời hạn cấu hình trước giờ hẹn; thuộc sở hữu của khách hàng đang đăng nhập.

**Mô tả:** Hệ thống phải cho phép khách hàng, khi yêu cầu trước giờ hẹn tối thiểu một khoảng thời gian do cửa hàng cấu hình (BR-08): (a) tự thay đổi lịch hẹn - khung giờ (lịch spa) hoặc thời điểm nhận/trả (lịch lưu trú), thú cưng, dịch vụ (lịch spa); khung giờ hoặc thời điểm mới phải còn khả dụng (BR-13 hoặc BR-21), thú cưng mới phải thuộc khách hàng và dịch vụ phải áp dụng cho loài của thú cưng (BR-02); sau khi thay đổi, lịch hẹn quay về “Chờ xác nhận” để quản lý duyệt (BR-26); (b) hủy miễn phí, ghi nhận lý do “Khách hàng chủ động hủy”. Phải kiểm tra quyền sở hữu trước khi thực hiện.

**Ngoại lệ:** lịch hẹn không thuộc sở hữu -> từ chối.

**Quy tắc nghiệp vụ:** BR-02, BR-08, BR-13, BR-14, BR-16, BR-21, BR-26.

**Tiêu chí nghiệm thu:**

- Chỉ cho phép đổi lịch hẹn (khung giờ/thời điểm nhận-trả, thú cưng, dịch vụ) hoặc hủy lịch hẹn (kèm lý do) nếu khách hàng thao tác trên chính lịch hẹn của mình và trước mốc thời gian quy định.
- Sau khi khách hàng thay đổi, lịch hẹn ở trạng thái “Chờ xác nhận”.
- Khách hàng không thể thay đổi hay hủy lịch hẹn của người khác.

#### FR-CHG-02 – Khóa chức năng tự thay đổi, hủy sau mốc thời gian cho phép

**Actor:** Hệ thống | **Platform:** Web khách hàng

**Mô tả:** Hệ thống phải khóa chức năng tự thay đổi hoặc hủy lịch hẹn (spa hoặc lưu trú) khi yêu cầu gửi sau mốc thời gian cho phép, và thông báo cần liên hệ hotline.

**Quy tắc nghiệp vụ:** BR-08.

**Tiêu chí nghiệm thu:** Khách hàng không thể tự thay đổi hoặc hủy lịch hẹn khi đã quá mốc thời gian cho phép; hệ thống chặn thao tác và yêu cầu liên hệ hotline để được hỗ trợ.

#### FR-CHG-03 – Quản lý xử lý thay đổi, hủy lịch hẹn khi cần can thiệp

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý thay đổi, hủy lịch hẹn (spa và lưu trú) khi cửa hàng không thể đáp ứng hoặc khi khách hàng yêu cầu ngoài thời hạn tự phục vụ; ghi nhận lý do hủy tương ứng (hoàn tiền: BR-24). Khi thay đổi khung giờ, nhân viên spa hoặc ngày lưu trú/chuồng, hệ thống vẫn kiểm tra BR-13, BR-04, BR-21.

**Quy tắc nghiệp vụ:** BR-08, BR-14, BR-21, BR-24.

**Tiêu chí nghiệm thu:**

- Hệ thống cập nhật trạng thái “Đã hủy” (kèm lý do) và thông báo cho các bên khi quản lý hủy lịch hẹn do không thể phục vụ.
- Hệ thống cập nhật trạng thái “Đã hủy” (kèm lý do) khi quản lý xử lý yêu cầu hủy quá mốc thời gian quy định từ khách hàng.

### 4.2.8 Thực hiện dịch vụ (BP-07)

#### FR-EXE-01 – Xem danh sách lịch hẹn

**Actor:** Nhân viên spa; Lễ tân | **Platform:** Web nhân viên

**Mô tả:** Hệ thống phải cho phép nhân viên spa xem các lịch hẹn spa được phân công cho mình; cho phép lễ tân xem lịch hẹn trong phạm vi cửa hàng để phục vụ tiếp nhận và thanh toán. Kết quả giới hạn đúng phạm vi từng vai trò.

**Ngoại lệ:** nhân viên spa xem trực tiếp lịch hẹn không phân công cho mình -> từ chối (trừ quản lý).

**Quy tắc nghiệp vụ:** BR-16.

**Tiêu chí nghiệm thu:** Nhân viên spa chỉ được phép xem các lịch hẹn đã phân công cho chính mình và hệ thống sẽ chặn mọi quyền truy cập vào lịch hẹn của nhân viên spa khác; lễ tân xem được lịch hẹn toàn cửa hàng nhưng không có quyền cập nhật tiến độ thực hiện.

#### FR-EXE-02 – Lễ tân tiếp nhận thú cưng (lịch hẹn spa)

**Actor:** Lễ tân | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lịch hẹn spa “Đã xác nhận” và có nhân viên spa phụ trách; khách hàng đưa thú cưng đến.

**Mô tả:** Hệ thống phải cho phép lễ tân xác nhận tiếp nhận thú cưng và ghi nhận cân nặng thực tế (FR-EXE-10), chuyển lịch hẹn sang “Đã tiếp nhận”.

**Quy tắc nghiệp vụ:** BR-05, BR-08 (giới hạn giữ chỗ 15 phút - FR-EXE-07).

**Tiêu chí nghiệm thu:** Chỉ chuyển trạng thái sang “Đã tiếp nhận” nếu lễ tân (hoặc quản lý) thao tác xác nhận khi lịch hẹn spa “Đã xác nhận” vẫn còn trong thời gian giữ chỗ.

#### FR-EXE-03 – Nhân viên spa cập nhật tiến độ thực hiện dịch vụ

**Actor:** Nhân viên spa | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lịch hẹn spa “Đã tiếp nhận” hoặc “Đang thực hiện”. Để chuyển “Đang thực hiện”: đã có ảnh trước chăm sóc hợp lệ (FR-EXE-09) và không đang chờ khách hàng xác nhận chi phí mới (FR-EXE-11).

**Mô tả:** Hệ thống phải cho phép nhân viên spa được phân công cập nhật tiến độ từng dịch vụ (có thể kèm ghi chú), bắt đầu bằng chuyển “Đang thực hiện”.

**Ngoại lệ:** chỉ nhân viên spa được phân công hoặc quản lý mới được cập nhật (BR-05); chưa có ảnh trước chăm sóc hợp lệ (BR-20) hoặc đang chờ khách hàng xác nhận chi phí mới (BR-23) -> từ chối chuyển “Đang thực hiện”.

**Quy tắc nghiệp vụ:** BR-05, BR-20, BR-23.

**Tiêu chí nghiệm thu:**

- Chỉ nhân viên spa được phân công hoặc quản lý mới có quyền cập nhật lịch hẹn spa; hệ thống sẽ chặn thao tác này từ bất kỳ người dùng nào khác.
- Hệ thống chặn chuyển “Đang thực hiện” khi chưa có ảnh trước chăm sóc hợp lệ hoặc khi đang chờ khách hàng xác nhận chi phí mới.

#### FR-EXE-04 – Đánh dấu hoàn tất lịch hẹn spa

**Actor:** Nhân viên spa | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Tất cả dịch vụ trong lịch hẹn đã thực hiện xong; đã có ảnh sau chăm sóc (FR-EXE-09).

**Mô tả:** Hệ thống chỉ cho phép chuyển “Hoàn tất” khi toàn bộ dịch vụ đã hoàn tất và có ảnh sau chăm sóc.

**Quy tắc nghiệp vụ:** BR-06, BR-20.

**Tiêu chí nghiệm thu:** Chỉ cho phép cập nhật trạng thái “Hoàn tất” khi toàn bộ dịch vụ đã hoàn thành và có ảnh sau chăm sóc; hệ thống sẽ chặn thao tác này nếu còn bất kỳ dịch vụ nào chưa xong hoặc chưa có ảnh sau.

#### FR-EXE-05 – Quản lý cập nhật trực tiếp trạng thái thực hiện

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý cập nhật trực tiếp trạng thái thực hiện của một lịch hẹn khi cần thiết.

**Quy tắc nghiệp vụ:** BR-05, BR-20.

**Tiêu chí nghiệm thu:** Quản lý được phép cập nhật trạng thái lịch hẹn, với điều kiện thao tác phải diễn ra đúng theo trình tự vòng đời (FR-LFC-01) và đáp ứng BR-06, BR-20 đối với lịch hẹn spa.

#### FR-EXE-06 – Nhân viên spa xem lịch sử công việc đã thực hiện

**Actor:** Nhân viên spa | **Platform:** Web nhân viên

**Mô tả:** Hệ thống phải cho phép nhân viên spa xem lại lịch sử lịch hẹn spa mình đã thực hiện; kết quả giới hạn đúng phạm vi.

**Quy tắc nghiệp vụ:** BR-16.

**Tiêu chí nghiệm thu:** Hệ thống chỉ hiển thị đầy đủ lịch sử các lịch hẹn do chính nhân viên spa thực hiện (nếu có) và ẩn toàn bộ các lịch hẹn thuộc về nhân viên khác.

#### FR-EXE-07 – Tự động hủy lịch hẹn do vắng mặt

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Điều kiện tiên quyết:** Lịch hẹn (spa hoặc lưu trú) “Đã xác nhận” nhưng chưa được tiếp nhận.

**Điều kiện kích hoạt:** Quá 15 phút kể từ giờ hẹn đã xác nhận (giờ bắt đầu khung giờ spa hoặc giờ nhận lưu trú) mà chưa được tiếp nhận.

**Mô tả:** Hệ thống phải tự động chuyển “Đã hủy” với lý do vắng mặt khi quá thời gian giữ chỗ tối đa 15 phút; với lịch hẹn lưu trú, chuồng được giải phóng.

**Quy tắc nghiệp vụ:** BR-08.

**Tiêu chí nghiệm thu:** Hệ thống tiến hành quét định kỳ và tự động cập nhật trạng thái “Đã hủy” (lý do: vắng mặt) đối với mọi lịch hẹn đã quá giờ 15 phút mà không có dữ liệu tiếp nhận.

#### FR-EXE-08 – Quản lý giám sát tiến độ thực hiện dịch vụ

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý xem tổng quan tiến độ thực hiện của toàn bộ lịch hẹn (spa và lưu trú) tại cửa hàng.

**Quy tắc nghiệp vụ:** không có ràng buộc riêng.

**Tiêu chí nghiệm thu:** Tại giao diện tổng quan, hệ thống phải phản ánh đúng trạng thái thực tế của tất cả các lịch hẹn hiện có.

#### FR-EXE-09 – Nhân viên spa ghi nhận ảnh minh chứng trước và sau chăm sóc

**Actor:** Nhân viên spa (phụ trách) - tải lên và xem; Khách hàng có tài khoản, Quản lý - xem | **Platform:** Web nhân viên; web khách hàng; web quản lý

**Điều kiện tiên quyết:** Lịch hẹn spa “Đã tiếp nhận” (ảnh trước) hoặc “Đang thực hiện” (ảnh sau).

**Mô tả:** Hệ thống phải cho phép nhân viên spa được phân công tải lên ảnh thú cưng trước và sau khi chăm sóc, gắn với lịch hẹn và phân biệt trước/sau. Ảnh trước chỉ hợp lệ khi là ảnh gần nhất của thú cưng, được tải lên trong vòng 7 ngày tính đến thời điểm bắt đầu thực hiện (BR-20). Khách hàng có tài khoản xem được ảnh của lịch hẹn thuộc sở hữu của mình; nhân viên spa phụ trách và quản lý xem được ảnh trong phạm vi của mình.

**Ngoại lệ:** tải lên bởi actor không phải nhân viên spa phụ trách, hoặc xem ngoài phạm vi (BR-16) -> từ chối.

**Quy tắc nghiệp vụ:** BR-16, BR-20.

**Tiêu chí nghiệm thu:**

- Ảnh được lưu gắn đúng lịch hẹn và phân biệt được trước/sau chăm sóc.
- Khi ảnh gần nhất của thú cưng được tải lên quá 7 ngày hoặc chưa có, ảnh trước không hợp lệ và hệ thống không cho chuyển “Đang thực hiện”.
- Khách hàng xem được ảnh của lịch hẹn của mình và không xem được ảnh của lịch hẹn thuộc khách hàng khác.

#### FR-EXE-10 – Lễ tân ghi nhận cân nặng thực tế và hệ thống đối chiếu với hồ sơ

**Actor:** Lễ tân (quản lý khi cần - BR-05); Hệ thống | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lịch hẹn spa “Đã tiếp nhận” (FR-EXE-02), chưa chuyển “Đang thực hiện”; hoặc lịch hẹn lưu trú “Đã xác nhận”, thú cưng đã đến và chưa thu tiền lưu trú.

**Mô tả:** Hệ thống phải cho phép lễ tân ghi nhận cân nặng thực tế của thú cưng khi tiếp nhận và tự đối chiếu với hồ sơ theo BR-23. Trường hợp cần khách hàng xác nhận (tăng vượt ngưỡng dung sai và sang nhóm lớn hơn): hệ thống tạo yêu cầu xác nhận (FR-NOT-06, FR-EXE-11) và lịch hẹn giữ nguyên trạng thái hiện tại (spa: “Đã tiếp nhận”; lưu trú: “Đã xác nhận”; không thêm trạng thái mới). Hồ sơ thú cưng được cập nhật theo cân nặng thực tế (trường hợp cần xác nhận: sau khi khách hàng xác nhận). Với lịch hẹn lưu trú, khi nhóm kích cỡ thay đổi, hệ thống kiểm tra chuồng đã gán còn phù hợp (BR-21): nếu không, quản lý gán chuồng phù hợp khác (FR-HTL-05); nếu hết chuồng phù hợp, khách hàng được thông báo (khách vãng lai: lễ tân thông báo trực tiếp) và quản lý từ chối, hủy lịch hẹn với lý do “cửa hàng không thể đáp ứng” (FR-CHG-03).

**Quy tắc nghiệp vụ:** BR-05, BR-19, BR-21, BR-23.

**Tiêu chí nghiệm thu:**

- Cân nặng thực tế nhỏ hơn khai báo và xuống nhóm nhỏ hơn: hệ thống ghi nhận cân nặng mới và giảm chi phí (dịch vụ spa hoặc tiền lưu trú) theo nhóm mới.
- Cân nặng tăng trong ngưỡng dung sai (ví dụ chuột lang 0,9 kg lên 1,1 kg), hoặc vượt ngưỡng nhưng cùng nhóm: hệ thống chỉ ghi nhận cân nặng, chi phí không đổi.
- Cân nặng tăng vượt ngưỡng và sang nhóm lớn hơn: hệ thống tính lại chi phí, tạo yêu cầu xác nhận và chặn chuyển “Đang thực hiện” (lịch spa) hoặc thu tiền lưu trú, chuyển “Đang lưu trú” (lịch lưu trú) cho đến khi khách hàng xác nhận.
- Lịch hẹn lưu trú hết chuồng phù hợp sau khi đổi nhóm: khách hàng được thông báo và lịch hẹn bị hủy với lý do “cửa hàng không thể đáp ứng”.

#### FR-EXE-11 – Xác nhận chi phí mới và xử lý khi khách hàng từ chối hoặc không phản hồi

**Actor:** Khách hàng có tài khoản; Lễ tân (ghi nhận phản hồi của khách vãng lai hoặc phản hồi trực tiếp/qua điện thoại); Hệ thống | **Platform:** Web khách hàng; web nhân viên

**Điều kiện tiên quyết:** Có yêu cầu xác nhận chi phí mới từ FR-EXE-10.

**Mô tả:** Hệ thống phải cho phép khách hàng xác nhận hoặc từ chối chi phí mới. Xác nhận: hồ sơ được cập nhật theo cân nặng thực tế, lịch hẹn tiếp tục theo chi phí mới. Từ chối, hoặc quá 30 phút kể từ khi tạo yêu cầu mà chưa có phản hồi: hệ thống tự động chuyển lịch hẹn “Đã hủy” với lý do lỗi do khách hàng (BR-23). Khách vãng lai: lễ tân liên hệ theo thông tin liên hệ đã ghi nhận và ghi nhận phản hồi.

**Ngoại lệ:** yêu cầu nhắm đến lịch hẹn không thuộc sở hữu của khách hàng đang đăng nhập -> từ chối (BR-16).

**Quy tắc nghiệp vụ:** BR-16, BR-23.

**Tiêu chí nghiệm thu:**

- Khi khách hàng xác nhận, hệ thống cập nhật hồ sơ theo cân nặng thực tế và cho phép lịch hẹn tiếp tục theo chi phí mới.
- Khi khách hàng từ chối, hoặc quá 30 phút chưa phản hồi, hệ thống chuyển lịch hẹn “Đã hủy” với lý do lỗi do khách hàng.
- Khách hàng không thể xác nhận hoặc từ chối yêu cầu thuộc lịch hẹn của khách hàng khác.

### 4.2.9 Thanh toán (BP-08)

#### FR-PAY-01 – Xác định số tiền cần thanh toán

**Actor:** Hệ thống | **Platform:** Hệ thống (không giao diện riêng)

**Điều kiện tiên quyết:** Lịch hẹn spa “Hoàn tất”; hoặc lịch hẹn lưu trú “Đã xác nhận” (tiền lưu trú) / “Đang lưu trú” (phí phạt trả muộn).

**Mô tả:** Hệ thống phải tự xác định số tiền của từng khoản thanh toán, dựa trên đơn giá hiện có và nhóm kích cỡ đã được đối chiếu khi tiếp nhận (BR-23): lịch hẹn spa bằng tổng giá các dịch vụ đã sử dụng theo loài và nhóm kích cỡ (BR-11); lịch hẹn lưu trú gồm tiền lưu trú và phí phạt trả muộn (nếu có) theo BR-22. Không chấp nhận số tiền do client tự gửi.

**Quy tắc nghiệp vụ:** BR-11, BR-22.

**Tiêu chí nghiệm thu:**

- Tổng tiền thanh toán của một lịch hẹn spa “Hoàn tất” phải bằng tổng giá (theo nhóm kích cỡ đã xác nhận) của tất cả các dịch vụ thành phần.
- Tiền lưu trú phải bằng số đêm × (giá lưu trú/đêm + giá thức ăn/đêm); phí phạt trả muộn phải bằng số lần phí × mức phí mỗi lần theo BR-22.

#### FR-PAY-02 – Ghi nhận thanh toán tại quầy

**Actor:** Lễ tân, quản lý | **Platform:** Web nhân viên, web quản lý

**Điều kiện tiên quyết:** Khoản thanh toán chưa thanh toán và đang ở thời điểm được ghi nhận theo BR-07.

**Mô tả:** Hệ thống phải cho phép lễ tân hoặc quản lý ghi nhận thanh toán tại quầy (tiền mặt hoặc chuyển khoản qua mã QR, xác nhận thủ công) cho khách hàng có tài khoản hoặc vãng lai, gồm mọi khoản thanh toán của lịch hẹn lưu trú. Trước khi chuyển “Đã thanh toán”, phải xác minh số tiền thực nhận khớp đủ với FR-PAY-01.

**Ngoại lệ:** số tiền thấp hơn yêu cầu -> từ chối chuyển trạng thái.

**Quy tắc nghiệp vụ:** BR-07, BR-09, BR-17.

**Tiêu chí nghiệm thu:** Hệ thống chỉ cập nhật trạng thái “Đã thanh toán” cho khoản thanh toán đang ở thời điểm được ghi nhận (BR-07) khi số tiền thanh toán khớp đủ và sẽ từ chối mọi trường hợp thanh toán thiếu.

#### FR-PAY-03 – Thanh toán trực tuyến

**Actor:** Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện tiên quyết:** Lịch hẹn spa “Hoàn tất”, chưa thanh toán, thuộc sở hữu của khách hàng đang đăng nhập.

**Mô tả:** Hệ thống phải cho phép khách hàng thanh toán trực tuyến qua cổng thanh toán đã xác nhận (VNPAY, MoMo - sandbox) cho lịch hẹn spa của chính mình. Số tiền gửi đến cổng thanh toán do hệ thống tự xác định (FR-PAY-01), không dựa trên số tiền client gửi. Trước khi chuyển “Đã thanh toán”, phải xác minh số tiền cổng thanh toán xác nhận khớp đủ.

**Ngoại lệ:** lịch hẹn không thuộc sở hữu, lịch hẹn lưu trú (chỉ thanh toán tại quầy - BR-09), hoặc số tiền xác nhận thấp hơn -> từ chối.

**Quy tắc nghiệp vụ:** BR-07, BR-09, BR-16, BR-17.

**Tiêu chí nghiệm thu:** Hệ thống chỉ cập nhật trạng thái “Đã thanh toán” khi khách hàng thanh toán trực tuyến thành công, khớp đủ tiền cho lịch hẹn spa “Hoàn tất” của chính mình, đồng thời chặn mọi thao tác thanh toán trực tuyến đối với lịch hẹn của người khác và lịch hẹn lưu trú.

#### FR-PAY-04 – Theo dõi tình hình thanh toán

**Actor:** Quản lý (toàn cửa hàng); Khách hàng có tài khoản (lịch hẹn của mình), Lễ tân, Nhân viên spa (lịch hẹn được phân công) xem tình hình thanh toán của một lịch hẹn cụ thể | **Platform:** Web quản lý; web khách hàng; web nhân viên

**Mô tả:** Hệ thống phải cho phép quản lý xem tình hình thanh toán (Đã thanh toán/Chưa thanh toán) của các lịch hẹn, gồm từng khoản thanh toán của lịch hẹn lưu trú.

**Quy tắc nghiệp vụ:** không có ràng buộc riêng.

**Tiêu chí nghiệm thu:** Tại giao diện danh sách, hệ thống phải phản ánh đúng trạng thái thanh toán thực tế (đã thanh toán hoặc chưa thanh toán) của tất cả các lịch hẹn.

### 4.2.10 Quản lý nhân viên (BP-09)

#### FR-STF-01 – Tạo tài khoản, hồ sơ nhân viên

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý tạo tài khoản, hồ sơ cho nhân viên mới và chọn vai trò của nhân viên (lễ tân hoặc nhân viên spa).

**Tiêu chí nghiệm thu:** Hệ thống tạo tài khoản thành công và cho phép nhân viên truy cập vào web nhân viên với các chức năng đúng vai trò khi thông tin cung cấp là hoàn toàn hợp lệ.

#### FR-STF-02 – Cập nhật thông tin nhân viên

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý cập nhật thông tin nhân viên (gồm vai trò) khi cần.

**Tiêu chí nghiệm thu:** Hệ thống ghi nhận và lưu trữ các thay đổi khi thông tin của nhân viên (hiện có) được cập nhật hợp lệ.

#### FR-STF-03 – Vô hiệu hóa tài khoản nhân viên

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý vô hiệu hóa tài khoản nhân viên khi nhân viên ngừng làm việc. Khi nhân viên spa bị vô hiệu hóa, các lịch hẹn spa “Đã xác nhận” đã phân công cho nhân viên đó quay về “Chờ xác nhận” để quản lý phân công lại, hoặc từ chối nếu không còn nhân viên spa rảnh trong khung giờ đó; khách hàng được thông báo (FR-NOT-03).

**Quy tắc nghiệp vụ:** BR-14, BR-27.

**Tiêu chí nghiệm thu:**

- Tài khoản bị vô hiệu hóa sẽ lập tức mất quyền đăng nhập và không còn xuất hiện trong danh sách phân công lịch hẹn mới.
- Các lịch hẹn spa “Đã xác nhận” đã phân công cho nhân viên spa đó chuyển về “Chờ xác nhận” và khách hàng có tài khoản nhận được thông báo.

### 4.2.11 Thông báo (BP-10)

Thông báo chỉ gửi tới actor có tài khoản; khách vãng lai không nhận thông báo.

#### FR-NOT-01 – Thông báo xác nhận đã gửi yêu cầu đặt lịch

**Actor:** Hệ thống -> Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện kích hoạt:** Lịch hẹn (spa hoặc lưu trú) tạo ở “Chờ xác nhận” (FR-BOOK-03, FR-HTL-04).

**Mô tả:** Hệ thống phải thông báo cho khách hàng khi yêu cầu đặt lịch đã được ghi nhận.

**Tiêu chí nghiệm thu:** Khách hàng sẽ nhận được thông báo xác nhận ngay khi hệ thống tiếp nhận thành công yêu cầu.

#### FR-NOT-02 – Thông báo kết quả xác nhận lịch hẹn và phân công

**Actor:** Hệ thống -> Khách hàng có tài khoản, nhân viên spa | **Platform:** Web khách hàng, web nhân viên

**Điều kiện kích hoạt:** Lịch hẹn spa xác nhận kèm nhân viên spa phụ trách (FR-ASG-03) hoặc điều chỉnh (FR-ASG-02); lịch hẹn lưu trú được xác nhận kèm chuồng (FR-HTL-05); kể cả khi lịch hẹn được duyệt lại sau khi khách hàng thay đổi (BR-26).

**Mô tả:** Hệ thống phải thông báo khách hàng khi lịch hẹn được xác nhận (kèm số tiền đã tính lại nếu khách hàng đã thay đổi lịch hẹn) và nhân viên spa khi được phân công, điều chỉnh phụ trách.

**Tiêu chí nghiệm thu:** Khách hàng (và nhân viên spa phụ trách đối với lịch hẹn spa) sẽ nhận được thông báo tương ứng ngay khi hệ thống xử lý xong việc xác nhận lịch hẹn.

#### FR-NOT-03 – Thông báo thay đổi trạng thái thực hiện dịch vụ

**Actor:** Hệ thống -> Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện kích hoạt:** Lịch hẹn chuyển trạng thái (spa: tiếp nhận, đang thực hiện, hoàn tất; lưu trú: đang lưu trú, hoàn tất), hoặc quay về “Chờ xác nhận” do nhân viên spa phụ trách bị vô hiệu hóa (BR-27).

**Mô tả:** Hệ thống phải thông báo khách hàng khi lịch hẹn chuyển sang các trạng thái thực hiện chính, hoặc quay về “Chờ xác nhận” để phân công lại nhân viên.

**Tiêu chí nghiệm thu:** Khách hàng sẽ nhận được thông báo hoàn tất dịch vụ ngay khi hệ thống cập nhật trạng thái lịch hẹn thành “Hoàn tất”.

#### FR-NOT-04 – Thông báo hủy lịch hẹn

**Actor:** Hệ thống -> Khách hàng có tài khoản, nhân viên spa | **Platform:** Web khách hàng, web nhân viên

**Điều kiện kích hoạt:** Lịch hẹn chuyển “Đã hủy” (mọi lý do).

**Mô tả:** Hệ thống phải thông báo khách hàng và nhân viên spa phụ trách (nếu có) khi lịch hẹn bị hủy, kèm lý do.

**Tiêu chí nghiệm thu:** Khách hàng và nhân viên spa phụ trách (nếu có) sẽ nhận được thông báo kèm lý do hủy ngay khi hệ thống xử lý việc hủy lịch hẹn.

#### FR-NOT-05 – Thông báo trạng thái thanh toán

**Actor:** Hệ thống -> Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện kích hoạt:** Trạng thái thanh toán chuyển “Đã thanh toán”.

**Mô tả:** Hệ thống phải thông báo khách hàng khi thanh toán được ghi nhận thành công.

**Tiêu chí nghiệm thu:** Khách hàng sẽ nhận được thông báo xác nhận ngay khi hệ thống xử lý sự kiện ghi nhận thanh toán thành công.

#### FR-NOT-06 – Thông báo yêu cầu xác nhận chi phí mới

**Actor:** Hệ thống -> Khách hàng có tài khoản | **Platform:** Web khách hàng

**Điều kiện kích hoạt:** Cân nặng thực tế vượt ngưỡng dung sai và chuyển sang nhóm kích cỡ lớn hơn (FR-EXE-10).

**Mô tả:** Hệ thống phải thông báo khách hàng kèm cân nặng thực tế và chi phí mới để khách hàng xác nhận hoặc từ chối trong 30 phút (FR-EXE-11). Khách vãng lai được lễ tân liên hệ trực tiếp.

**Quy tắc nghiệp vụ:** BR-23.

**Tiêu chí nghiệm thu:** Khách hàng nhận được thông báo kèm cân nặng thực tế và chi phí mới ngay khi hệ thống tạo yêu cầu xác nhận.

### 4.2.12 Quản lý chuồng và giá lưu trú (BP-11)

#### FR-HTL-01 – Thêm chuồng

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý thêm chuồng, gồm mã chuồng và loài, nhóm kích cỡ thú cưng phù hợp. Số chuồng đang sử dụng là sức chứa lưu trú.

**Ngoại lệ:** mã chuồng đã tồn tại -> từ chối.

**Quy tắc nghiệp vụ:** BR-21.

**Tiêu chí nghiệm thu:**

- Khi quản lý thêm chuồng với thông tin hợp lệ, hệ thống lưu chuồng và tính vào sức chứa lưu trú.
- Hệ thống từ chối nếu mã chuồng đã tồn tại.

#### FR-HTL-02 – Cập nhật, ngừng sử dụng chuồng

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý cập nhật thông tin chuồng và ngừng sử dụng chuồng khi cần.

**Quy tắc nghiệp vụ:** BR-21.

**Tiêu chí nghiệm thu:**

- Khi cập nhật hợp lệ chuồng hiện có, hệ thống lưu thay đổi.
- Chuồng đã ngừng sử dụng không còn được đề xuất hoặc gán cho lịch hẹn lưu trú mới và không tính vào sức chứa.

#### FR-HTL-03 – Thiết lập giá lưu trú, thức ăn và phí phạt trả muộn

**Actor:** Quản lý | **Platform:** Web quản lý

**Mô tả:** Hệ thống phải cho phép quản lý thiết lập và cập nhật giá lưu trú/đêm và giá thức ăn/đêm theo từng loài và nhóm kích cỡ, cùng mức phí phạt trả muộn mỗi lần (BR-22).

**Quy tắc nghiệp vụ:** BR-19, BR-22.

**Tiêu chí nghiệm thu:** Khi quản lý thiết lập hoặc cập nhật giá và mức phí phạt hợp lệ, hệ thống lưu thay đổi và áp dụng cho các lịch hẹn lưu trú tạo sau đó.

### 4.2.13 Lưu trú thú cưng (BP-12)

#### FR-HTL-04 – Xem tình trạng còn chỗ và gửi yêu cầu đặt lưu trú

**Actor:** Khách hàng có tài khoản; Lễ tân (thay khách đến trực tiếp) | **Platform:** Web khách hàng; web nhân viên

**Điều kiện tiên quyết:** Khách tự đặt: đã đăng nhập, có hồ sơ thú cưng hợp lệ, tài khoản không bị khóa quyền tự đặt lịch (BR-15). Lễ tân đặt thay: khách hàng (có tài khoản hoặc vãng lai) và thú cưng đã có hồ sơ (BR-15 không áp dụng).

**Mô tả:** Hệ thống phải cho phép chọn thú cưng, thời điểm nhận và thời điểm trả (ngày, giờ; số đêm tính theo ngày); hiển thị tình trạng còn chỗ (còn ít nhất một chuồng phù hợp trống trong toàn bộ các đêm), số đêm và tiền lưu trú tạm tính theo hồ sơ (BR-22; được đối chiếu lại khi tiếp nhận - BR-23); tạo lịch hẹn lưu trú ở trạng thái “Chờ xác nhận” khi yêu cầu hợp lệ.

**Ngoại lệ:** tài khoản bị khóa (BR-15) khi tự đặt -> từ chối, hướng dẫn liên hệ hotline; hết chỗ -> từ chối, yêu cầu chọn ngày khác; ngày trả không sau ngày nhận -> từ chối; nhiều yêu cầu gần như đồng thời vượt sức chứa -> chỉ số lượng trong sức chứa được chấp nhận, phần vượt bị từ chối như hết chỗ (cơ chế kỹ thuật cụ thể - R-04).

**Quy tắc nghiệp vụ:** BR-01, BR-02, BR-15, BR-18, BR-21, BR-22.

**Tiêu chí nghiệm thu:**

- Khi gửi yêu cầu đầy đủ điều kiện và còn chỗ, hệ thống tạo lịch hẹn lưu trú “Chờ xác nhận”.
- Khi hết chỗ trong khoảng thời gian yêu cầu, hệ thống từ chối và yêu cầu chọn ngày khác.
- Khi khách hàng tự đặt từ tài khoản đang bị khóa quyền tự đặt lịch, hệ thống từ chối và thông báo lý do; lễ tân đặt thay vẫn được tạo lịch hẹn.
- Lịch hẹn lưu trú không chứa dịch vụ spa; muốn spa phải đặt lịch hẹn spa riêng.

#### FR-HTL-05 – Quản lý gán chuồng và xác nhận lịch hẹn lưu trú

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Lịch hẹn lưu trú ở trạng thái “Chờ xác nhận”.

**Mô tả:** Hệ thống phải đề xuất chuồng phù hợp loài và nhóm kích cỡ, còn trống trong toàn bộ các đêm; cho phép quản lý xác nhận đề xuất hoặc chọn chuồng khác phù hợp, sau đó xác nhận lịch hẹn. Khi nhiều lịch hẹn lưu trú được xử lý gần như đồng thời, hệ thống phải đảm bảo không gán trùng chuồng. Khi xác nhận lịch hẹn do khách hàng đã thay đổi (BR-26), hệ thống tính lại tiền lưu trú (FR-PAY-01).

**Ngoại lệ:** không thể đáp ứng -> quản lý từ chối (FR-HTL-06).

**Quy tắc nghiệp vụ:** BR-03, BR-18, BR-21, BR-26.

**Tiêu chí nghiệm thu:**

- Khi quản lý xác nhận lịch hẹn lưu trú với chuồng phù hợp còn trống, hệ thống chuyển trạng thái sang “Đã xác nhận”.
- Khi gán chuồng đã được gán cho lịch hẹn lưu trú khác trùng đêm, hệ thống từ chối và báo lỗi xung đột (BR-21).

#### FR-HTL-06 – Quản lý từ chối lịch hẹn lưu trú khi cửa hàng không thể đáp ứng

**Actor:** Quản lý | **Platform:** Web quản lý

**Điều kiện tiên quyết:** Lịch hẹn lưu trú ở trạng thái “Chờ xác nhận”.

**Mô tả:** Hệ thống phải cho phép quản lý từ chối lịch hẹn lưu trú khi không thể đáp ứng; chuyển sang “Đã hủy” với lý do “cửa hàng không thể đáp ứng”.

**Quy tắc nghiệp vụ:** BR-03.

**Tiêu chí nghiệm thu:** Khi quản lý từ chối lịch hẹn lưu trú “Chờ xác nhận”, hệ thống chuyển trạng thái sang “Đã hủy” kèm lý do tương ứng và gửi thông báo đến khách hàng (nếu có tài khoản).

#### FR-HTL-07 – Lễ tân tiếp nhận thú cưng lưu trú

**Actor:** Lễ tân | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lịch hẹn lưu trú “Đã xác nhận”, còn trong thời gian giữ chỗ (BR-08); cân nặng thực tế đã được đối chiếu và không đang chờ khách hàng xác nhận chi phí mới (FR-EXE-10, FR-EXE-11); tiền lưu trú đã thanh toán (FR-PAY-02); khách hàng đưa thú cưng đến.

**Mô tả:** Hệ thống phải cho phép lễ tân xác nhận tiếp nhận, chuyển lịch hẹn sang “Đang lưu trú”; chuồng đã gán được ghi nhận đang chứa thú cưng này.

**Quy tắc nghiệp vụ:** BR-05, BR-07, BR-08, BR-21, BR-23.

**Tiêu chí nghiệm thu:**

- Chỉ chuyển sang “Đang lưu trú” khi lễ tân (hoặc quản lý) xác nhận trên lịch hẹn lưu trú “Đã xác nhận” còn trong thời gian giữ chỗ, đã đối chiếu cân nặng và tiền lưu trú đã thanh toán.
- Sau khi tiếp nhận, chuồng hiển thị đang chứa đúng thú cưng và khách hàng tương ứng.

#### FR-HTL-08 – Xem tình trạng chuồng

**Actor:** Lễ tân, Quản lý | **Platform:** Web nhân viên, web quản lý

**Mô tả:** Hệ thống phải cho phép xem danh sách chuồng và tình trạng (trống/đang chứa); với chuồng đang chứa, hiển thị thú cưng, khách hàng (chủ) và thời điểm trả dự kiến.

**Quy tắc nghiệp vụ:** BR-21.

**Tiêu chí nghiệm thu:** Mỗi chuồng đang có thú cưng lưu trú hiển thị đúng thú cưng và khách hàng tương ứng; chuồng không có thú cưng hiển thị là trống.

#### FR-HTL-09 – Lễ tân trả thú cưng lưu trú

**Actor:** Lễ tân | **Platform:** Web nhân viên

**Điều kiện tiên quyết:** Lịch hẹn lưu trú “Đang lưu trú”; phí phạt trả muộn (nếu có) đã thanh toán (FR-PAY-02).

**Mô tả:** Hệ thống phải cho phép lễ tân ghi nhận thời điểm trả thực tế, xác nhận bàn giao thú cưng cho khách hàng, chuyển lịch hẹn sang “Hoàn tất” và giải phóng chuồng. Trả sớm hơn thời điểm trả dự kiến: xử lý như trả bình thường, không hoàn tiền. Trả muộn quá 30 phút: hệ thống tính phí phạt (BR-22, FR-PAY-01) và chỉ cho hoàn tất khi phí phạt đã thanh toán.

**Quy tắc nghiệp vụ:** BR-05, BR-07, BR-22.

**Tiêu chí nghiệm thu:**

- Chỉ chuyển “Hoàn tất” từ “Đang lưu trú” khi lễ tân (hoặc quản lý) xác nhận và phí phạt trả muộn (nếu có) đã thanh toán.
- Sau khi hoàn tất, chuồng hiển thị trống và có thể gán cho lịch hẹn lưu trú khác.
- Trễ không quá 30 phút: không tính phí; từ phút thứ 31, mỗi 60 phút tính một lần phí phạt; trả sớm: chi phí không đổi và không hoàn tiền.

## 4.3. Yêu cầu phi chức năng

### Bảo mật

- Hệ thống phải yêu cầu xác thực trước khi cho phép truy cập bất kỳ chức năng nào dành riêng cho một vai trò (Khách hàng, Lễ tân, Nhân viên spa, Quản lý).
- Hệ thống phải đảm bảo một actor chỉ thực hiện được các hành động thuộc phạm vi quyền hạn của vai trò mình. (BR-05)
- Hệ thống phải kiểm tra quyền sở hữu, phạm vi cụ thể của dữ liệu (không chỉ vai trò và việc đã đăng nhập) trước khi cho xem hoặc thay đổi dữ liệu gắn với một chủ thể cụ thể (hồ sơ thú cưng, lịch hẹn, ảnh minh chứng, lịch sử sử dụng dịch vụ, thông tin thanh toán, thông tin tài khoản cá nhân). (BR-16)
- Hệ thống phải luôn thực hiện lại việc xác thực và kiểm tra quyền tại phía backend cho mọi request, không phụ thuộc vào việc kiểm tra đã được thực hiện ở phía web.

### Tính toàn vẹn dữ liệu

- Hệ thống phải đảm bảo một nhân viên spa không được phân công cho hai lịch hẹn spa trùng khung giờ, và một chuồng không được gán cho hai lịch hẹn lưu trú trùng đêm. (BR-04, BR-21)
- Hệ thống phải đảm bảo trạng thái lịch hẹn và trạng thái thanh toán chỉ chuyển đổi theo đúng vòng đời đã xác định. (BR-14, BR-07)
- Hệ thống phải đảm bảo lịch hẹn spa chỉ chuyển “Hoàn tất” khi toàn bộ dịch vụ trong lịch hẹn đã hoàn tất và có ảnh sau chăm sóc. (BR-06, BR-20)
- Hệ thống phải đảm bảo một khoản thanh toán của lịch hẹn chỉ được ghi nhận “Đã thanh toán” khi số tiền thực nhận (tại quầy hoặc qua cổng thanh toán trực tuyến) khớp đủ với số tiền cần thanh toán được xác định từ giá dịch vụ hoặc giá lưu trú; không được đánh dấu “Đã thanh toán” khi số tiền nhận được chưa đủ và không được chấp nhận số tiền cần thanh toán do client tự gửi lên. (BR-17)
- Khi có nhiều yêu cầu xảy ra gần như đồng thời (nhiều khách hàng cùng đặt một khung giờ hoặc cùng đặt lưu trú; nhiều lịch hẹn cùng được xem xét phân công cho một nhân viên spa hoặc một chuồng), hệ thống phải đảm bảo kết quả cuối cùng vẫn tuân thủ đúng năng lực phục vụ, sức chứa lưu trú và không phân công/gán trùng. (BR-18, BR-04, BR-13, BR-21)

### Độ tin cậy

- Cơ chế tự động hủy do vắng mặt (FR-EXE-07), cơ chế theo dõi, khóa quyền đặt lịch do vắng mặt lặp lại (FR-BOOK-06) và cơ chế tự hủy sau 30 phút khách hàng không phản hồi chi phí mới (FR-EXE-11) phải được thực hiện đáng tin cậy để không bỏ sót lịch hẹn quá hạn, không bỏ sót việc áp dụng khóa. (BR-08, BR-15, BR-23)

### Hiệu suất

- Hệ thống phải phản hồi các thao tác đặt lịch, tra cứu và cập nhật trạng thái trong thời gian hợp lý để không ảnh hưởng đến trải nghiệm sử dụng.

### Tính khả dụng

- Hệ thống phải sẵn sàng phục vụ đặt lịch trực tuyến trong thời gian hoạt động của cửa hàng.

### Tính tương thích

- Web phải hoạt động ổn định trên các trình duyệt phổ biến.

# PHẦN 5: BẢO MẬT HỆ THỐNG

## 5.1. Phân quyền người dùng

### Bảng 1 - Ma trận phân quyền theo nhóm hành động

| **Nhóm hành động** | **Khách hàng** | **Lễ tân** | **Nhân viên spa** | **Quản lý** |
|---|---|---|---|---|
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
| Quản lý phân lịch làm việc (ca làm) cho nhân viên spa (bổ sung theo SA: X-01, FR-STF-04) | Không | Không | Không | Có |
| Quản lý cấu hình tham số hệ thống (bổ sung theo SA: X-09, FR-CFG-01) | Không | Không | Không | Có |

### Bảng 2 - Ma trận quyền sở hữu/phạm vi theo module dữ liệu (chi tiết hóa “xem/thêm/sửa/xóa” theo từng module)

| **Module dữ liệu** | **Khách hàng** | **Lễ tân** | **Nhân viên spa** | **Quản lý** |
|---|---|---|---|---|
| Khách vãng lai | Không có quyền | Ghi nhận, xem | Không có quyền | Không có quyền |
| Hồ sơ thú cưng | Xem/thêm/sửa/xóa - chỉ hồ sơ do mình sở hữu | Xem/thêm/sửa - khi phục vụ khách tại cửa hàng | Chỉ xem - hồ sơ gắn với lịch hẹn được phân công | Chỉ xem - hồ sơ gắn với lịch hẹn trong cửa hàng |
| Danh mục dịch vụ | Chỉ xem | Chỉ xem | Chỉ xem | Toàn quyền: thêm/sửa/ngừng cung cấp |
| Chuồng và giá lưu trú | Chỉ xem giá và tình trạng còn chỗ | Xem giá, tình trạng còn chỗ và tình trạng chuồng | Không có quyền (không có chức năng tương ứng) | Toàn quyền: thêm/sửa/ngừng sử dụng chuồng, thiết lập giá |
| Lịch hẹn spa - danh sách, chi tiết, lịch sử, đổi/hủy, tiếp nhận, tiến độ/trạng thái | Chỉ lịch hẹn của mình: xem, đặt mới, đổi/hủy trong hạn, xác nhận chi phí mới | Toàn cửa hàng: xem, đặt thay khách đến trực tiếp, tiếp nhận, ghi nhận cân nặng | Chỉ lịch hẹn được phân công: xem, cập nhật tiến độ, hoàn tất | Toàn cửa hàng: xem, xác nhận/từ chối, phân công, cập nhật trạng thái, xử lý đổi/hủy khi cần |
| Lịch hẹn lưu trú | Chỉ lịch hẹn của mình: xem, đặt mới, đổi/hủy trong hạn, xác nhận chi phí mới | Toàn cửa hàng: xem, đặt thay khách đến trực tiếp, tiếp nhận, ghi nhận cân nặng, trả thú cưng | Không có quyền (không có chức năng tương ứng) | Toàn cửa hàng: xem, xác nhận/từ chối, gán chuồng, xử lý đổi/hủy |
| Ảnh minh chứng trước/sau | Chỉ xem - ảnh của lịch hẹn của mình | Không có quyền | Tải lên, xem - lịch hẹn được phân công | Chỉ xem - toàn cửa hàng |
| Thanh toán | Của lịch hẹn thuộc sở hữu của mình: thanh toán trực tuyến (lịch spa), xem trạng thái | Toàn cửa hàng: ghi nhận tại quầy, xem trạng thái | Chỉ xem trạng thái - lịch hẹn được phân công | Toàn cửa hàng: ghi nhận tại quầy, theo dõi tổng thể |
| Tài khoản nhân viên | Không có quyền | Không có quyền (không tự quản lý tài khoản khác) | Không có quyền (không tự quản lý tài khoản khác) | Toàn quyền: tạo, sửa, vô hiệu hóa |
| Thông báo | Chỉ thông báo gửi cho mình | Không có chức năng tương ứng | Chỉ thông báo gửi cho mình | Không có chức năng tương ứng |

**Nguyên tắc áp dụng chung:** Việc kiểm tra quyền sở hữu, phạm vi (BR-16) phải luôn được thực hiện lại ở phía backend cho mọi request, không phụ thuộc vào việc kiểm tra đã được thực hiện ở phía web. Khi xác thực hoặc kiểm tra quyền gặp lỗi, kết quả mặc định là từ chối truy cập. Không bao giờ mặc định cho phép.

## 5.2. Bảo mật dữ liệu và đăng nhập

### Yêu cầu xác thực chung

- Hệ thống phải yêu cầu xác thực trước khi cho phép truy cập bất kỳ chức năng nào dành riêng cho một vai trò (Khách hàng, Lễ tân, Nhân viên spa, Quản lý).
- Hệ thống phải đảm bảo một actor chỉ thực hiện được các hành động thuộc phạm vi quyền hạn của vai trò mình.
- Hệ thống phải luôn thực hiện lại việc xác thực và kiểm tra quyền tại phía backend cho mọi request, không phụ thuộc vào việc kiểm tra đã được thực hiện ở phía web.

### Phương thức xác thực an toàn

- **Cơ chế:** JWT Bearer Authentication kết hợp ASP.NET Core Identity để quản lý user/password hash.
- **Access token:** JWT thời hạn ngắn, chứa UserId, Role (Customer, Staff, Manager); backend luôn lấy danh tính, vai trò từ token đã xác thực, không nhận từ request do client tự khai báo. Vai trò của nhân viên (lễ tân/nhân viên spa) do backend xác định từ dữ liệu nhân viên, không nhận từ client.
- **Refresh token:** thời hạn dài hơn, lưu phía backend dưới dạng băm (không lưu token thô) để có thể thu hồi.
- **Mật khẩu:** băm bằng cơ chế của ASP.NET Core Identity (PasswordHasher); không bao giờ trả PasswordHash trong response.
- Tài khoản bị vô hiệu hóa (IsActive = false, ví dụ nhân viên bị vô hiệu hóa - FR-STF-03) bị từ chối đăng nhập, làm mới token; các refresh token liên quan bị thu hồi.
- **Quyền tối thiểu khi tạo tài khoản:** đăng ký luôn tạo Role = Customer; tạo nhân viên luôn tạo Role = Staff kèm vai trò lễ tân hoặc nhân viên spa do quản lý chọn; khách vãng lai không có tài khoản đăng nhập; không có chức năng nào tạo tài khoản quản lý qua giao diện vận hành thông thường (xem R-02, Phần 7.2).
- **Mã hóa/an toàn truyền tải:** không ghi mật khẩu, token, hay secret vào log hệ thống; secret (khóa ký JWT, connection string, secret cổng thanh toán) không nằm trong source code, được cấp qua biến môi trường/secret store.
- **Xác thực cổng thanh toán (webhook):** callback từ cổng thanh toán bên ngoài (VNPAY/MoMo) không mang JWT của hệ thống - được xác minh bằng cơ chế chữ ký/secret riêng của cổng thanh toán trước khi xử lý; không xác minh được -> từ chối và không cập nhật trạng thái thanh toán.

### Các kiểm soát bảo mật bổ sung (áp dụng cho mọi request, không tạo chức năng nghiệp vụ mới)

- Rate limiting cho các endpoint không cần token (đăng ký/đăng nhập/làm mới token) và thao tác đặt lịch của khách hàng, nhằm hạn chế spam làm gián đoạn dịch vụ.
- CORS chỉ cho phép đúng 3 origin web đã biết (quản lý/nhân viên/khách hàng).
- Dữ liệu quan trọng (giá, số tiền, role, nhóm kích cỡ, trạng thái lịch hẹn/thanh toán, nhân viên phụ trách, chuồng được gán) luôn do hệ thống tự xác định phía backend, không bao giờ nhận trực tiếp từ client.
- Ghi log sự kiện bảo mật (đăng nhập thất bại, request bị từ chối, webhook bị từ chối) kèm danh tính người thực hiện, phục vụ theo dõi và truy vết.

# PHẦN 6: YÊU CẦU TÍCH HỢP

## 6.1. Yêu cầu tích hợp bên thứ ba

### Cổng thanh toán trực tuyến (VNPAY / MoMo - bản sandbox)

- **Mục đích nghiệp vụ:** cho phép khách hàng có tài khoản thanh toán trực tuyến cho lịch hẹn spa đã hoàn tất, thay thế/bổ sung cho thanh toán tại quầy (BR-09, FR-PAY-03).
- **Chiều giao tiếp - Khởi tạo thanh toán:** hệ thống (backend) gửi yêu cầu khởi tạo thanh toán sang cổng thanh toán, với số tiền do hệ thống tự xác định (FR-PAY-01). Không nhận số tiền từ client.
- **Chiều giao tiếp - Xác nhận kết quả (webhook/callback):** cổng thanh toán gọi ngược về backend để xác nhận kết quả giao dịch.
- **Yêu cầu xác thực, toàn vẹn cho tích hợp:** endpoint nhận callback không thể mang JWT của hệ thống (vì được gọi bởi bên ngoài) nên phải xác minh nguồn gốc request bằng cơ chế riêng của cổng thanh toán (chữ ký/secret trên payload theo tài liệu tích hợp của VNPAY/MoMo); request không xác minh được -> từ chối, không cập nhật trạng thái thanh toán và ghi log.
- **Yêu cầu đối chiếu số tiền:** chữ ký hợp lệ chưa đủ để đánh dấu “Đã thanh toán”. Số tiền trong callback còn phải khớp đủ với số tiền cần thanh toán đã xác định (BR-17).
- **Phạm vi môi trường:** tích hợp ở mức sandbox (môi trường thử nghiệm của VNPAY/MoMo).

**Các phương thức thanh toán khác (không phải tích hợp bên thứ ba API):** thanh toán tại quầy bằng tiền mặt, hoặc chuyển khoản ngân hàng qua mã QR được lễ tân hoặc quản lý xác nhận thủ công (BR-09). Đây là quy trình thủ công tại cửa hàng, không phải một tích hợp API với bên thứ ba.

# PHẦN 7: MA TRẬN PHỤ THUỘC VÀ RỦI RO

## 7.1. Giả định & Ràng buộc

### Giả định

| **Mã** | **Giả định** |
|---|---|
| A-01 | Hệ thống phục vụ một cửa hàng spa thú cưng duy nhất, không đa chi nhánh, không franchise, không marketplace. |
| A-02 | Chỉ có 3 role: Khách hàng, Nhân viên (vai trò lễ tân hoặc nhân viên spa), Quản lý. |
| A-03 | Mốc thời gian tự hủy hoặc đổi miễn phí (BR-08) là 1-2 tiếng trước giờ hẹn, do cửa hàng cấu hình. |
| A-04 | Thời gian giữ chỗ tối đa sau giờ hẹn là 15 phút trước khi tự động chuyển vắng mặt. |
| A-05 | Ngưỡng khóa quyền tự đặt lịch: quá 3 lần vắng mặt trong cửa sổ 30 ngày gần nhất. |
| A-06 | Không đặt cọc khi đặt lịch. Lịch hẹn spa thanh toán sau khi hoàn tất; lịch hẹn lưu trú trả trước tiền lưu trú khi gửi thú cưng, phí phạt trả muộn (nếu có) trả khi nhận lại thú cưng. |
| A-07 | Tình trạng khả dụng của mốc giờ tính theo dịch vụ, thú cưng đã chọn và số nhân viên spa có ca làm còn rảnh (SA 2.3.3, thay giả định cũ về năng lực phục vụ chung). |
| A-08 | Cửa hàng chỉ phục vụ 4 loài: chó, mèo, thỏ, chuột lang. |
| A-09 | Lịch hẹn lưu trú có thời điểm nhận và thời điểm trả (ngày, giờ); mỗi chuồng chứa một thú cưng tại một thời điểm (BR-21). |

### Ràng buộc

| **Mã** | **Ràng buộc** |
|---|---|
| C-01 | Phạm vi: 3 web (quản lý, nhân viên, khách hàng). |
| C-02 | Công nghệ định hướng: Backend ASP.NET Core Web API, Entity Framework Core, FluentValidation, Serilog, Swagger/OpenAPI; Frontend React/Next.js (TypeScript), TailwindCSS, React Hook Form, TanStack Query, Axios; Database Supabase (PostgreSQL); giao tiếp Web-Backend hoàn toàn qua RESTful API, Web không truy cập database trực tiếp. |
| C-03 | Công cụ hỗ trợ: GitHub (quản lý mã nguồn), Postman (kiểm thử), PlantUML (thiết kế CSDL/UML). |
| C-04 | Nguyên tắc kiểm soát phạm vi: không tự ý thêm chức năng ngoài nghiệp vụ, không liên quan hoặc không cần thiết; không xây dựng chức năng chỉ để tăng số lượng; mọi chức năng mới phải có cơ sở từ nghiệp vụ, yêu cầu hệ thống. |
| C-05 | Chiến lược xác thực cụ thể chưa được khóa tại thời điểm biên soạn tài liệu này - xem Phần 5.2 và R-01. |

## 7.2. Rủi ro dự kiến và sự phụ thuộc

### Rủi ro dự kiến

| **Mã** | **Rủi ro** | **Ảnh hưởng nếu không được xử lý kịp thời** |
|---|---|---|
| R-01 | Cơ chế, chiến lược xác thực chưa được chốt chính thức (mới ở mức đề xuất - Phần 5.2). | Có thể cần điều chỉnh lại toàn bộ luồng đăng nhập, phân quyền. |
| R-02 | Quy trình khởi tạo tài khoản quản lý đầu tiên chưa được mô tả. | Không có cách xác định rõ ai, luồng nào tạo tài khoản quản lý đầu tiên trong hệ thống khi triển khai thực tế. |
| R-03 | Chưa có chỉ số định lượng cho các Non-Functional Requirement (thời gian phản hồi, % uptime, số người dùng đồng thời...). | Khó đánh giá khách quan chất lượng phi chức năng khi kiểm thử/nghiệm thu nếu không có tiêu chí cụ thể. |
| R-04 | Cơ chế kỹ thuật cụ thể đảm bảo nhất quán khi có nhiều yêu cầu đặt lịch, phân công, gán chuồng gần như đồng thời (BR-18) mới ở mức đề xuất, chưa được xác nhận/audit cuối cùng. | Nếu cơ chế đề xuất không được thông qua, có thể ảnh hưởng đến việc đảm bảo không vượt năng lực phục vụ (BR-13), không phân công trùng nhân viên spa (BR-04) và không gán trùng chuồng (BR-21) khi tải đồng thời cao. |
| R-05 | Tích hợp cổng thanh toán (VNPAY/MoMo) mới ở mức sandbox; cơ chế xác minh chữ ký webhook cụ thể theo từng provider chưa được xác nhận. | Có thể cần điều chỉnh luồng xác minh thanh toán khi chọn provider chính thức, ảnh hưởng đến FR-PAY-03 và tiến độ tích hợp. |

### Sự phụ thuộc

| **Mã** | **Phụ thuộc** | **Mô tả** |
|---|---|---|
| D-01 | Phụ thuộc vào giai đoạn technical architecture để chốt R-01 (chiến lược xác thực) và R-04 (cơ chế đồng thời) trước khi coi là quyết định cuối cùng. |  |
| D-02 | Phụ thuộc vào cổng thanh toán bên ngoài (VNPAY/MoMo - sandbox) để hoàn thiện FR-PAY-03 và cơ chế webhook. | Hệ thống bên ngoài, nằm ngoài Trust Boundary của backend; chỉ được tin sau khi xác minh chữ ký. |
| D-03 | Các business rule về kiểm tra quyền sở hữu, phạm vi, đối chiếu số tiền thanh toán và xử lý đồng thời (BR-16, BR-17, BR-18) phụ thuộc vào việc có một cơ chế kiểm soát nhất quán, áp dụng thống nhất cho toàn bộ chức năng liên quan (hồ sơ thú cưng, lịch hẹn, ảnh minh chứng, thanh toán, thông báo). Cơ chế kỹ thuật cụ thể không thuộc phạm vi tài liệu này. | Nếu cơ chế kiểm soát nhất quán không được tuân thủ khi cài đặt, các yêu cầu liên quan đến quyền sở hữu, số tiền, đồng thời (BR-16, BR-17, BR-18) có nguy cơ bị vi phạm rải rác ở nhiều chức năng. |
