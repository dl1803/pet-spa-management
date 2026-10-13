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
dotnet restore
dotnet run
```
> API Swagger mặc định: `http://localhost:5000/swagger`

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
