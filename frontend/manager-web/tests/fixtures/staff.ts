import type { Staff } from "@/lib/api/types";

// Dữ liệu mẫu đúng hình dạng Staff của GET /staff, theo UI demo (MW-08); chỉ dùng cho kiểm thử.
const id = (n: number) => `6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f0${n}`;

export const MOCK_STAFF: Staff[] = [
  { staffId: id(2), userName: "0912334501", fullName: "Nguyễn Thị Hạnh", staffRole: "SpaStaff", isActive: true },
  { staffId: id(3), userName: "0987210334", fullName: "Trần Thị Quyên", staffRole: "SpaStaff", isActive: true },
  { staffId: id(1), userName: "0905667812", fullName: "Lê Minh Tâm", staffRole: "SpaStaff", isActive: true },
  { staffId: id(4), userName: "0918402773", fullName: "Đặng Hoàng Phúc", staffRole: "SpaStaff", isActive: false },
  { staffId: id(5), userName: "0934778120", fullName: "Phạm Thu Hà", staffRole: "Receptionist", isActive: true },
  { staffId: id(6), userName: "0976455019", fullName: "Vũ Khánh Linh", staffRole: "Receptionist", isActive: true },
];
