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
Lễ tân và Nhân viên spa dùng chung một khung: thanh trên nền `lagoon-700` cao 64px, nội dung tối đa 1320px.
Dưới 980px menu cuộn ngang được; dưới 640px menu chỉ còn biểu tượng (nhãn vẫn có cho trình đọc màn hình).
Liên kết “Đến nội dung chính” hỗ trợ bàn phím.

Menu hiển thị theo vai trò: Lễ tân có Lịch hẹn, Tiếp nhận, Trả thú cưng, Khách hàng, Đặt lịch thay, Chuồng,
Thanh toán; Nhân viên spa có Lịch hẹn, Lịch sử công việc, Dịch vụ và nút Thông báo. Menu tài khoản có Hồ sơ cá nhân,
Danh mục dịch vụ (chỉ Lễ tân) và Đăng xuất. Chưa có phiên đăng nhập nên `(main)/layout.tsx` truyền `role={null}`:
khung chỉ hiện logo và khối “Chưa đăng nhập”, chưa hiện mục menu nào. Khi có phiên, truyền vai trò thật vào `SiteHeader`.
Mọi mục chưa có trang đích bị vô hiệu hóa, có mô tả “Chức năng chưa khả dụng”; bật `available` trong
`components/layout/header-nav.tsx` khi trang đích đã có. Nút Đăng xuất bị vô hiệu hóa cho tới khi có phiên đăng nhập.

- `app/(main)`: layout có thanh trên và trang giới thiệu.
- `components/layout`: thanh trên, menu theo vai trò, menu tài khoản; phần đọc đường dẫn nằm trong `Suspense`.
- `components/icons.tsx`: biểu tượng SVG và logo theo UI demo.
- `lib/routes.ts`: đường dẫn các màn của Web Nhân viên.
- `lib/api/types.ts`, `lib/labels.ts`: vai trò nhân viên (`Receptionist`, `SpaStaff`) và nhãn tiếng Việt.
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
npm run test:smoke
```

`npm test` chạy test infrastructure với HTTP stub tự khởi động và tự dừng trong tiến trình test, cùng test
menu theo vai trò của `HeaderNav`. Lệnh này không cần backend, Next.js server hoặc source ngoài thư mục app.
Loader ESM của Node biên dịch TypeScript/TSX trong bộ nhớ bằng dependency TypeScript đã có, không sinh file build cho test.

`npm run test:smoke` kiểm tra trang gốc, khối “Chưa đăng nhập”, liên kết không dẫn tới 404, icon và đường dẫn
không tồn tại; cần production server đang chạy như hướng dẫn trên. Mặc định dùng
`http://127.0.0.1:3001`; đặt biến `SMOKE_BASE_URL` để kiểm tra server ở địa chỉ khác.
Các test này không xác nhận backend thật hay đăng nhập thật.

Build cần truy cập Google Fonts để tải Be Vietnam Pro.
