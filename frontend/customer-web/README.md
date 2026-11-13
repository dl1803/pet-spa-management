# Web khách hàng – Spa thú cưng

Next.js (App Router, TypeScript), TailwindCSS, Axios, TanStack Query, React Hook Form (WBS 1.5).

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

Kiểm tra trước khi tạo PR: `npm run lint` và `npm run build`.

## Cấu trúc

| Thư mục / Tệp | Nội dung |
| --- | --- |
| `app/(main)` | Các màn hình có thanh trên |
| `app/api/session` | Route handler phiên: đăng nhập, làm mới, đăng xuất |
| `app/globals.css` | Token màu, phông chữ |
| `components/layout` | Thanh trên của web khách hàng |
| `components/feedback` | Hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `FieldError`, toast |
| `lib/api` | `apiClient` (Axios) và chuẩn hóa error envelope thành `ApiError` |
| `lib/auth` | Cấu hình vai trò/cookie, access token trong bộ nhớ, làm mới 401, `SessionGate` |
| `lib/routes.ts` | Đường dẫn các màn hình |
| `proxy.ts` | Chuyển hướng theo cookie phiên |

## Phiên đăng nhập

- Access token lưu trong bộ nhớ trình duyệt, mất khi tải lại trang.
- Refresh token lưu trong cookie httpOnly `ps_rt` do route handler phiên đặt (thời hạn 7 ngày).
- Route handler gọi backend bằng `NEXT_PUBLIC_API_BASE_URL` và chuyển tiếp `X-Forwarded-For` để backend ghi nhận IP thật của người dùng.

## Gọi API và hiển thị lỗi

- Mọi lời gọi backend dùng `apiClient` (ngoại lệ: route handler phiên gọi trực tiếp sang backend bằng fetch); lỗi trả ra luôn là `ApiError` (`kind`, `status`, `code`, `title`, `detail`).
- `getErrorMessage(error)` trả câu hiển thị theo mục 6.6: mất mạng / 5xx → câu chung, 429 → nhắc thử lại sau, 403 `FORBIDDEN` → không có quyền, còn lại → `detail` (thiếu thì `title`) của envelope.
- 409: dùng `<ErrorAlert error={error} />` ngay tại chỗ thao tác rồi tải lại dữ liệu liên quan.
- 403: dùng `<ForbiddenState />` thay cho nội dung trang (kiểm tra bằng `isForbiddenError`).
- Kết quả tức thời: `useToast().showSuccess(...)` (tự ẩn) hoặc `useToast().showError(error)` (giữ đến khi đóng).
- Lỗi của ô nhập (React Hook Form): `<FieldError id="..." message={errors.field?.message} />`.
- TanStack Query không thử lại lỗi 4xx.
