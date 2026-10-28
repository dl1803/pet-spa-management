# 🐾 Pet Spa & Hotel Management System (SE310)

Hệ thống quản lý dịch vụ Spa & Lưu trú thú cưng (Modular Monolith), phục vụ 3 nhóm người dùng: **Khách hàng**, **Nhân viên (Lễ tân / Spa)** và **Quản lý**.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ | Triển khai |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React, TypeScript) | Vercel |
| **Backend** | ASP.NET Core Web API (.NET, EF Core) | Render (Docker) |
| **Database** | PostgreSQL | Supabase |
| **Storage** | Supabase Storage (lưu ảnh trước / sau dịch vụ) | Supabase |
| **Thanh toán** | VNPAY / MoMo (Sandbox) | Gateway API |

---

## 🎯 Phân Hệ & Chức Năng Chính

* **Khách hàng (Customer Web)**: Đặt lịch Spa & Khách sạn thú cưng, theo dõi hồ sơ pet, lịch hẹn và xác nhận chi phí phát sinh.
* **Nhân viên (Staff Web)**: Tiếp nhận thú cưng, chụp ảnh trước/sau làm dịch vụ, cập nhật trạng thái phục vụ, thanh toán hóa đơn.
* **Quản lý (Manager Web)**: Phân ca làm việc, duyệt đổi/hủy lịch ngoài hạn, cấu hình bảng giá (theo cân nặng), xem báo cáo doanh thu.

---

## 📁 Cấu Trúc Thư Mục

```text
Pet-Spa-Management-SE310/
├── backend/            # ASP.NET Core Web API (.NET)
├── frontend/           # Next.js (TypeScript)
├── internal-docs/      # Tài liệu phân tích yêu cầu & thiết kế UI/UX
├── .gitignore
└── README.md
```

---

## 🚀 Khởi Chạy Nhanh (Quick Start)

### 1. Backend (ASP.NET Core)
```bash
cd backend
dotnet restore PetSpa.sln
dotnet run --project src/PetSpa.Api --launch-profile http
```
> Yêu cầu .NET SDK 9.0.305 trở lên trong dòng 9.0 (xem `backend/global.json`).
> Swagger mặc định: `http://localhost:5000/swagger`; OpenAPI JSON: `http://localhost:5000/swagger/v1/swagger.json`.

Backend gồm 4 project trong `backend/src`: `PetSpa.Domain` không phụ thuộc tầng khác; `PetSpa.Application` tham chiếu Domain; `PetSpa.Infrastructure` tham chiếu Application; `PetSpa.Api` tham chiếu Application và Infrastructure tại composition root.

Hiện tại backend mới có nền tảng ứng dụng, chưa có endpoint nghiệp vụ nên tài liệu OpenAPI chưa có operation. Swagger bật trong môi trường `Development`; môi trường khác chỉ bật khi cấu hình `Swagger__Enabled=true`. Để chạy HTTPS cục bộ, dùng profile `https` (cổng 7000) sau khi cấu hình chứng chỉ phát triển bằng `dotnet dev-certs https --trust`.

Kiểm tra build và định dạng mã:

```bash
dotnet build PetSpa.sln
dotnet format PetSpa.sln --verify-no-changes --no-restore
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
> Truy cập giao diện tại: `http://localhost:3000`

---

## 🌿 Quy Trình Git (Git Flow)

- `main`: Nhánh production, chứa mã nguồn ổn định.
- `dev`: Nhánh phát triển chính (tích hợp code của cả nhóm).
- `feature/<ten-tinh-nang>`: Nhánh phát triển tính năng riêng, tách từ `dev` và tạo PR về `dev`.
