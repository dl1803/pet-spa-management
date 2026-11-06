# Web Nhân viên

Ứng dụng Next.js độc lập cho lễ tân và nhân viên spa.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/staff-web`:

```powershell
npm ci
npm run dev -- --port 3001
```

Mở http://localhost:3001. Trang gốc chỉ giới thiệu ứng dụng; các màn Lịch sử công việc (`/lich-su-cong-viec`), Thông báo (`/thong-bao`) và Thực hiện dịch vụ (`/lich-hen/[appointmentId]/thuc-hien`) của Nhân viên spa dùng dữ liệu mô phỏng, chưa kết nối backend. Màn Thực hiện dịch vụ chưa có menu; mở bằng đường dẫn trực tiếp với mã lịch mô phỏng trong `features/service-execution/mock-data.ts`. Màn Lịch hẹn của Lễ tân (`/lich-hen`) cũng dùng dữ liệu mô phỏng (chỉ có lịch cho ngày hôm nay); mục menu “Lịch hẹn” chưa bật vì dùng chung với Nhân viên spa.
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
`components/layout/header-nav.tsx` khi trang đích đã có. Người làm trang mới được phép sửa duy nhất cờ `available` trong
`header-nav.tsx` để bật menu của trang mình. Không sửa phần khác của shell. Nút Đăng xuất bị vô hiệu hóa cho tới khi có phiên đăng nhập. Đã bật: Lịch sử công việc và Thông báo của Nhân viên spa.

- `app/(main)`: layout có thanh trên và trang giới thiệu.
- `components/layout`: thanh trên, menu theo vai trò, menu tài khoản; phần đọc đường dẫn nằm trong `Suspense`.
- `components/icons.tsx`: biểu tượng SVG và logo theo UI demo.
- `lib/routes.ts`: đường dẫn các màn của Web Nhân viên.
- `lib/api/types.ts`, `lib/labels.ts`: vai trò nhân viên (`Receptionist`, `SpaStaff`), lịch hẹn, thú cưng, ảnh lịch hẹn, thông báo và nhãn tiếng Việt.
- `lib/api`: Axios client và chuẩn hóa lỗi thành `ApiError`; đủ 25 mã lỗi, cùng nội dung với Web Quản lý.
- `app/providers.tsx`, `lib/query-client.ts`: Query Provider và cấu hình retry; cache server tách riêng, trình duyệt giữ cùng client.
- `components/feedback`: lỗi nội tuyến, cảnh báo nghiệp vụ, lỗi trường, trạng thái không có quyền và toast.
- `components/ui`, `components/domain`, `components/layout/page-header.tsx`: thành phần giao diện dùng chung, sao chép từ Web Khách hàng (riêng `pet-avatar.tsx` từ Web Quản lý); `button.tsx`, `select.tsx` theo vùng chạm 44px của Web Nhân viên.
- `features/work-history`, `features/notifications`, `features/service-execution`: màn Lịch sử công việc, Thông báo và Thực hiện dịch vụ; dữ liệu mô phỏng nằm trong `mock-data.ts`.
- `features/reception-appointments`: màn Lịch hẹn của Lễ tân (toàn cửa hàng); dữ liệu mô phỏng nằm trong `mock-data.ts`.
- `lib/format.ts`, `lib/time.ts`: định dạng ngày giờ theo múi giờ cửa hàng.

Để gọi backend, sao chép `.env.example` thành `.env.local` và điền `NEXT_PUBLIC_API_BASE_URL`
gồm tiền tố `/api/v1`. Biến này công khai trong bundle trình duyệt; không chứa secret.
Nếu thiếu URL, client dừng trước khi gửi request và trả `ApiError` loại `configuration`, không retry.
Development hiển thị tên biến cần cấu hình; production hiển thị câu lỗi chung.
Trang giới thiệu hiện chưa gọi API.

`apiClient` và `setAccessTokenProvider` chỉ dùng trong trình duyệt, sau khi component đã mount hoặc
trong event handler; gọi khi SSR/Server Component/Server Action sẽ bị chặn trước khi đọc token hay gửi request.
Module có ranh giới `use client` và kiểm tra runtime, vì Client Component vẫn có thể được render trên server.
Dùng `useQuery`/`useMutation` trong client component. Chưa dùng `useSuspenseQuery` hay prefetch ở
Server Component với `apiClient` cho tới khi có API client phía server. Chưa cung cấp API client phía server.

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

`npm test` chạy test infrastructure với HTTP stub tự khởi động và tự dừng trong tiến trình test, cùng test menu theo vai trò của `HeaderNav`, hàm định dạng và hai màn Lịch sử công việc, Thông báo và màn Lịch hẹn của Lễ tân. Lệnh này không cần backend, Next.js server hoặc source ngoài thư mục app.
Loader ESM của Node biên dịch TypeScript/TSX trong bộ nhớ bằng dependency TypeScript đã có, không sinh file build cho test.

`npm run test:smoke` kiểm tra trang gốc, khối “Chưa đăng nhập”, liên kết không dẫn tới 404, icon và đường dẫn
không tồn tại; cần production server đang chạy như hướng dẫn trên. Mặc định dùng
`http://127.0.0.1:3001`; đặt biến `SMOKE_BASE_URL` để kiểm tra server ở địa chỉ khác.
Các test này không xác nhận backend thật hay đăng nhập thật.

Build cần truy cập Google Fonts để tải Be Vietnam Pro.
