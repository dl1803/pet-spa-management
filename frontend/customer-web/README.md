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

| Thư mục | Nội dung |
| --- | --- |
| `app/(main)` | Các màn hình có thanh trên (CW-03 → CW-13) |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 |
| `components/layout` | Thanh trên của web khách hàng |
| `components/feedback` | Hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `FieldError`, toast |
| `lib/api` | `apiClient` (Axios) và chuẩn hóa error envelope thành `ApiError` |
| `lib/routes.ts` | Đường dẫn các màn hình |

## Gọi API và hiển thị lỗi

- Mọi lời gọi backend dùng `apiClient`; lỗi trả ra luôn là `ApiError` (`kind`, `status`, `code`, `title`, `detail`).
- `getErrorMessage(error)` trả câu hiển thị theo mục 6.6: mất mạng / 5xx → câu chung, 429 → nhắc thử lại sau, 403 `FORBIDDEN` → không có quyền, còn lại → `detail` (thiếu thì `title`) của envelope.
- 409: dùng `<ErrorAlert error={error} />` ngay tại chỗ thao tác rồi tải lại dữ liệu liên quan.
- 403: dùng `<ForbiddenState />` thay cho nội dung trang (kiểm tra bằng `isForbiddenError`).
- Kết quả tức thời: `useToast().showSuccess(...)` (tự ẩn) hoặc `useToast().showError(error)` (giữ đến khi đóng).
- Lỗi của ô nhập (React Hook Form): `<FieldError id="..." message={errors.field?.message} />`.
- TanStack Query không thử lại lỗi 4xx.
