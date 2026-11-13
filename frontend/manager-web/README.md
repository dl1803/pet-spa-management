# Web Quản lý

Ứng dụng Next.js độc lập cho quản lý dịch vụ Spa & Lưu trú thú cưng.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/manager-web`:

```powershell
npm ci
npm run dev -- --port 3002
```

Mở http://localhost:3002. Cần backend đang chạy và tài khoản Quản lý đã được tạo; chưa đăng nhập thì mọi đường dẫn chuyển về `/dang-nhap`.
Sau đăng nhập, trang gốc là màn Tổng quan (dữ liệu mô phỏng).
Dừng server bằng Ctrl+C trong terminal đã khởi chạy.

Khung quản lý dùng Be Vietnam Pro, token màu chung với Web Khách hàng và thanh bên rộng 248px.
Dưới 980px, menu chuyển thành thanh ngang cuộn được. Liên kết “Đến nội dung chính” hỗ trợ bàn phím.

- `app/(main)`: layout có thanh bên, `SessionGate`, trang Tổng quan và trang chi tiết lịch hẹn `lich-hen/[appointmentId]`.
- `app/(auth)/dang-nhap`: màn Đăng nhập quản lý, không có khung; `features/auth` chứa form và màn hình.
- `app/api/session/{login,refresh,logout}`, `proxy.ts`, `lib/auth`: phiên đăng nhập (xem mục “Đăng nhập và phiên”).
- `components/layout`: sidebar, menu và đánh dấu mục đang chọn; phần đọc đường dẫn nằm trong `Suspense`.
- `components/icons.tsx`: biểu tượng SVG và logo theo UI demo.
- `lib/routes.ts`: đường dẫn quản lý; lịch spa và lưu trú dùng chung `/lich-hen`.
- `lib/api`: Axios client và chuẩn hóa lỗi thành `ApiError`; đủ 25 mã lỗi theo backend.
- `app/providers.tsx`, `lib/query-client.ts`: Query Provider và cấu hình retry; cache server tách riêng, trình duyệt giữ cùng client.
- `components/feedback`: lỗi nội tuyến, lỗi trường, trạng thái không có quyền và toast.

Chỉ liên kết Tổng quan đang khả dụng. Các mục chưa có màn hình được vô hiệu hóa, có mô tả
“Chức năng chưa khả dụng”; bật `available` trong menu khi đã có trang đích.
Khối tài khoản (`SidebarAccount`) hiện `userName` và “Quản lý” của phiên; nút Đăng xuất chỉ bấm được khi đã có phiên.
Khối này ẩn dưới 980px cùng thanh bên. Huy hiệu chờ xác nhận nhận `pendingCount`, đang để `null` nên ẩn; không hiển thị số liệu giả.

Để gọi backend, sao chép `.env.example` thành `.env.local` và điền `NEXT_PUBLIC_API_BASE_URL`
gồm tiền tố `/api/v1`. Biến này công khai trong bundle trình duyệt; không chứa secret.
Nếu thiếu URL, client dừng trước khi gửi request và trả `ApiError` loại `configuration`, không retry.
Development hiển thị tên biến cần cấu hình; production hiển thị câu lỗi chung.
Các trang hiện dùng dữ liệu mô phỏng, chưa gọi API.

`apiClient` và `setAccessTokenProvider` chỉ dùng trong trình duyệt, sau khi component đã mount hoặc
trong event handler; gọi khi SSR/Server Component/Server Action sẽ bị chặn trước khi đọc token hay gửi request.
Module có ranh giới `use client` và kiểm tra runtime, vì Client Component vẫn có thể được render trên server.
Chưa cung cấp API client phía server.

Mọi lời gọi backend từ trình duyệt dùng `apiClient`. Lỗi mất mạng và 5xx hiển thị câu chung; 429 hiển thị cảnh báo
thử lại sau; 403 `FORBIDDEN` dùng `ForbiddenState`, khác với 403 `BOOKING_LOCKED` là lỗi nghiệp vụ.
Các lỗi còn lại ưu tiên `detail`, rồi `title`. Query không retry 4xx; mạng/5xx retry tối đa 3 lần;
mutation không tự retry. `setAccessTokenProvider` nhận hàm lấy token trong bộ nhớ. Khi API trả 401, `apiClient` làm mới token một lần
qua `setSessionHandlers` (do `SessionProvider` đăng ký) rồi gửi lại request; làm mới bị từ chối thì về `/dang-nhap`.

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
npm run start -- --port 3002
```

Trong terminal khác, kiểm tra trang gốc của server đang chạy:

```powershell
npm run test:smoke
```

`npm test` chạy test infrastructure với HTTP stub tự khởi động và tự dừng trong tiến trình test.
Lệnh này không cần backend, Next.js server hoặc source ngoài thư mục app. Loader ESM của Node
biên dịch TypeScript/TSX trong bộ nhớ bằng dependency TypeScript đã có, không sinh file build cho test.

`npm run test:smoke` kiểm tra chuyển hướng khi chưa đăng nhập, màn đăng nhập, khung chờ phiên (dùng cookie phiên giả), menu khả dụng,
nút đăng xuất bị khóa khi chưa có phiên, route handler phiên, icon và đường dẫn không tồn tại; cần production server đang chạy như hướng dẫn trên. Mặc định dùng
`http://127.0.0.1:3002`; đặt biến `SMOKE_BASE_URL` để kiểm tra server ở địa chỉ khác.

Khi có đầy đủ repository, chạy `npm run test:contract` để đối chiếu mã lỗi frontend với backend.
Test này nằm tại `tests/manager-web-contract.test.mjs` ở gốc repository và tách khỏi test mặc định
của app; không chạy trong bản chỉ chứa frontend.

Các test tự động không xác nhận backend thật; đăng nhập thật phải thử tay với backend đang chạy (xem “Đăng nhập và phiên”).
Build cần truy cập Google Fonts để tải Be Vietnam Pro.

## Đăng nhập và phiên

Tài khoản Quản lý đăng nhập bằng số điện thoại và mật khẩu qua route handler của chính web này (`/api/session/login`,
`/api/session/refresh`, `/api/session/logout`); các route này gọi backend `/auth/*` và `/me` ở phía server của Next.js.
Refresh token chỉ nằm trong cookie `ps_manager_rt` (httpOnly, SameSite=Lax, Secure khi chạy https, sống 7 ngày), trình duyệt không đọc được.
Access token chỉ nằm trong bộ nhớ trình duyệt và mất khi tải lại trang; `SessionGate` lấy lại bằng `/api/session/refresh`
rồi gọi `GET /me`. Không lưu token vào `localStorage` hay `sessionStorage`.

- `proxy.ts` chỉ kiểm tra có cookie `ps_manager_rt` khác rỗng hay không: chưa có thì chuyển về `/dang-nhap?next=…`; đã có thì chuyển khỏi `/dang-nhap` về `/`.
  Quyền thật luôn do backend kiểm tra.
- Chỉ tài khoản `role = Manager` được vào. Tài khoản khác đăng nhập đúng vẫn bị từ chối (403) và không được lưu phiên.
  `SessionGate` kiểm tra lại `role` sau khi khôi phục phiên.
- Tài khoản Quản lý đầu tiên do backend tạo khi khởi động từ `Seed__ManagerUserName`, `Seed__ManagerPassword` (xem `backend/.env.example`).
- Cổng chạy backend cục bộ là 5000 (`NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1`); backend phải cho phép origin `http://localhost:3002`
  (`Cors__AllowedOrigins`).
- Cookie của `localhost` dùng chung giữa các cổng nên mỗi web dùng tên cookie riêng; tên của web này là `ps_manager_rt`.
