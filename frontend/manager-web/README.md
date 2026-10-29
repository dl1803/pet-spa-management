# Web Quản lý

Ứng dụng Next.js độc lập cho quản lý dịch vụ Spa & Lưu trú thú cưng.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/manager-web`:

```powershell
npm ci
npm run dev -- --port 3002
```

Mở http://localhost:3002. Trang gốc giới thiệu ứng dụng trong khung quản lý; chưa kết nối backend.
Dừng server bằng Ctrl+C trong terminal đã khởi chạy.

Khung quản lý dùng Be Vietnam Pro, token màu chung với Web Khách hàng và thanh bên rộng 248px.
Dưới 980px, menu chuyển thành thanh ngang cuộn được. Liên kết “Đến nội dung chính” hỗ trợ bàn phím.

- `app/(main)`: layout có thanh bên và trang giới thiệu.
- `components/layout`: sidebar, menu và đánh dấu mục đang chọn; phần đọc đường dẫn nằm trong `Suspense`.
- `components/icons.tsx`: biểu tượng SVG và logo theo UI demo.
- `lib/routes.ts`: đường dẫn quản lý; lịch spa và lưu trú dùng chung `/lich-hen`.
- `lib/api`: Axios client và chuẩn hóa lỗi thành `ApiError`; đủ 25 mã lỗi theo backend.
- `app/providers.tsx`, `lib/query-client.ts`: Query Provider và cấu hình retry; cache server tách riêng, trình duyệt giữ cùng client.
- `components/feedback`: lỗi nội tuyến, lỗi trường, trạng thái không có quyền và toast.

Chỉ liên kết Tổng quan đang khả dụng. Các mục chưa có màn hình được vô hiệu hóa, có mô tả
“Chức năng chưa khả dụng”; bật `available` trong menu khi đã có trang đích.
Khối tài khoản chưa đọc phiên đăng nhập; nút Đăng xuất bị vô hiệu hóa. Huy hiệu chờ xác nhận
nhận `pendingCount`, đang để `null` nên ẩn; không hiển thị số liệu giả.

Để gọi backend, sao chép `.env.example` thành `.env.local` và điền `NEXT_PUBLIC_API_BASE_URL`
gồm tiền tố `/api/v1`. Biến này công khai trong bundle trình duyệt; không chứa secret.
Nếu thiếu URL, client dừng trước khi gửi request. Trang giới thiệu hiện chưa gọi API.

Mọi lời gọi backend dùng `apiClient`. Lỗi mất mạng và 5xx hiển thị câu chung; 429 hiển thị cảnh báo
thử lại sau; 403 `FORBIDDEN` dùng `ForbiddenState`, khác với 403 `BOOKING_LOCKED` là lỗi nghiệp vụ.
Các lỗi còn lại ưu tiên `detail`, rồi `title`. Query không retry 4xx; mạng/5xx retry tối đa 3 lần;
mutation không tự retry. `setAccessTokenProvider` nhận hàm lấy token trong bộ nhớ; chưa có luồng đăng nhập/làm mới phiên.

Form dùng React Hook Form đã cài, luật validation đặt tại form nghiệp vụ.
Gắn `FieldError` với ô nhập qua `id` và `aria-describedby`, đặt `aria-invalid` khi có lỗi.
Backend hiện trả validation trong `detail`, chưa có lỗi theo trường: hiển thị bằng `ErrorAlert`, giữ dữ liệu đã nhập.
`useToast().showSuccess(message)` tự ẩn sau 3,4 giây; `showError(error)` giữ tới khi người dùng đóng.

Kiểm tra trước khi commit:

```powershell
npm run lint
npm run build
npx tsc --noEmit
node --test tests/infrastructure.test.mjs
```

Build sinh kiểu Next.js trước khi kiểm tra TypeScript. Để chạy bản production:

```powershell
npm run start -- --port 3002
```

Trong terminal khác, kiểm tra trang gốc của server đang chạy:

```powershell
node --test tests/shell.test.mjs
```

Smoke test kiểm tra trang gốc, menu khả dụng, nút đăng xuất bị khóa, icon và đường dẫn không tồn tại.
Test infrastructure chạy HTTP stub trong tiến trình test; không xác nhận backend thật hay đăng nhập thật.
Build cần truy cập Google Fonts để tải Be Vietnam Pro.
