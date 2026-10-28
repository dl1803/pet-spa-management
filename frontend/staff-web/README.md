# Web Nhân viên

Ứng dụng Next.js độc lập cho lễ tân và nhân viên spa.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/staff-web`:

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000. Trang gốc chỉ giới thiệu ứng dụng; chưa có màn nghiệp vụ hay kết nối backend.

Kiểm tra trước khi commit:

```powershell
npm run lint
npm run build
npx tsc --noEmit
```

Build sinh kiểu Next.js trước khi kiểm tra TypeScript. Để chạy bản production:

```powershell
npm run start
```

Trong terminal khác, kiểm tra trang gốc của server đang chạy:

```powershell
node --input-type=module -e 'import assert from "node:assert/strict"; const r = await fetch("http://localhost:3000"); assert.equal(r.status, 200); assert.match(await r.text(), /Web Nhân viên/); console.log("HTTP smoke test PASS");'
```

Build cần truy cập Google Fonts để tải Geist theo cấu hình khởi tạo.
