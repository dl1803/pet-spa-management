môn# Web khách hàng – Spa thú cưng

Next.js (App Router, TypeScript), TailwindCSS, Axios, TanStack Query, React Hook Form (WBS 1.5.1.1 - S102-01).

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền NEXT_PUBLIC_API_BASE_URL nếu cần
npm run dev                  # http://localhost:3000
```

Kiểm tra trước khi tạo PR: `npm run lint` và `npm run build`.

## Cấu trúc hiện tại (D01)

| Thư mục / Tập tin | Nội dung |
| --- | --- |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 và Design System mục 2 |
| `app/layout.tsx` | Khung gốc HTML, phông Be Vietnam Pro, nạp Providers |
| `app/providers.tsx` | QueryClientProvider cho TanStack Query |
| `app/page.tsx` | Trang chủ khởi tạo Web Khách hàng |
| `app/icon.svg` | Biểu tượng dấu chân thú cưng |
