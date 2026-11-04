# Web Nhân viên

Ứng dụng Next.js độc lập cho lễ tân và nhân viên spa.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/staff-web`:

```powershell
npm ci
npm run dev -- --port 3001
```

Mở http://localhost:3001. Trang gốc chỉ giới thiệu ứng dụng; chưa có màn nghiệp vụ hay kết nối backend.
Dừng server bằng Ctrl+C trong terminal đã khởi chạy.

Ứng dụng dùng Be Vietnam Pro và token màu chung với Web Khách hàng, Web Quản lý (`app/globals.css`).

- `components/icons.tsx`: biểu tượng SVG theo UI demo.
- `lib/api`: Axios client và chuẩn hóa lỗi thành `ApiError`; đủ 25 mã lỗi, cùng nội dung với Web Quản lý.
- `app/providers.tsx`, `lib/query-client.ts`: Query Provider và cấu hình retry; cache server tách riêng, trình duyệt giữ cùng client.
- `components/feedback`: lỗi nội tuyến, lỗi trường, trạng thái không có quyền và toast.

Để gọi backend, sao chép `.env.example` thành `.env.local` và điền `NEXT_PUBLIC_API_BASE_URL`
gồm tiền tố `/api/v1`. Biến này công khai trong bundle trình duyệt; không chứa secret.
Nếu thiếu URL, client dừng trước khi gửi request và trả `ApiError` loại `configuration`, không retry.
Development hiển thị tên biến cần cấu hình; production hiển thị câu lỗi chung.
Trang giới thiệu hiện chưa gọi API.

`apiClient` và `setAccessTokenProvider` chỉ dùng trong trình duyệt, sau khi component đã mount hoặc
trong event handler; gọi khi SSR/Server Component/Server Action sẽ bị chặn trước khi đọc token hay gửi request.
Module có ranh giới `use client` và kiểm tra runtime, vì Client Component vẫn có thể được render trên server.
Chưa cung cấp API client phía server.

Mọi lời gọi backend từ trình duyệt dùng `apiClient`. Lỗi mất mạng và 5xx hiển thị câu chung; 429 hiển thị cảnh báo
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
npm test
```

Build sinh kiểu Next.js trước khi kiểm tra TypeScript. Để chạy bản production:

```powershell
npm run start -- --port 3001
```

Trong terminal khác, kiểm tra trang gốc của server đang chạy:

```powershell
node --input-type=module -e 'import assert from "node:assert/strict"; const r = await fetch("http://localhost:3001"); assert.equal(r.status, 200); assert.match(await r.text(), /Web Nhân viên/); console.log("HTTP smoke test PASS");'
```

`npm test` chạy test infrastructure với HTTP stub tự khởi động và tự dừng trong tiến trình test.
Lệnh này không cần backend, Next.js server hoặc source ngoài thư mục app. Loader ESM của Node
biên dịch TypeScript/TSX trong bộ nhớ bằng dependency TypeScript đã có, không sinh file build cho test.
Các test này không xác nhận backend thật hay đăng nhập thật.

Build cần truy cập Google Fonts để tải Be Vietnam Pro.
