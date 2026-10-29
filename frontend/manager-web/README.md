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

Chỉ liên kết Tổng quan đang khả dụng. Các mục chưa có màn hình được vô hiệu hóa, có mô tả
“Chức năng chưa khả dụng”; bật `available` trong menu khi đã có trang đích.
Khối tài khoản chưa đọc phiên đăng nhập; nút Đăng xuất bị vô hiệu hóa. Huy hiệu chờ xác nhận
nhận `pendingCount`, đang để `null` nên ẩn; không hiển thị số liệu giả.

Kiểm tra trước khi commit:

```powershell
npm run lint
npm run build
npx tsc --noEmit
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
Build cần truy cập Google Fonts để tải Be Vietnam Pro.
