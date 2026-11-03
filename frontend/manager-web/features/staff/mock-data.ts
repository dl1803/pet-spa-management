import { ApiError } from "@/lib/api/errors";
import type { Staff, StaffCreateRequest, StaffUpdateRequest } from "@/lib/api/types";
import { FORM_MESSAGES, normalizePhone } from "./forms";

// Dữ liệu mô phỏng theo UI demo (MW-08), đúng hình dạng Staff của GET /staff (chưa có ngày tạo).
// Thay bằng dữ liệu API thật khi nối backend.
const id = (n: number) => `6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f0${n}`;

export const MOCK_STAFF: Staff[] = [
  { staffId: id(2), userName: "0912334501", fullName: "Nguyễn Thị Hạnh", staffRole: "SpaStaff", isActive: true },
  { staffId: id(3), userName: "0987210334", fullName: "Trần Thị Quyên", staffRole: "SpaStaff", isActive: true },
  { staffId: id(1), userName: "0905667812", fullName: "Lê Minh Tâm", staffRole: "SpaStaff", isActive: true },
  { staffId: id(4), userName: "0918402773", fullName: "Đặng Hoàng Phúc", staffRole: "SpaStaff", isActive: false },
  { staffId: id(5), userName: "0934778120", fullName: "Phạm Thu Hà", staffRole: "Receptionist", isActive: true },
  { staffId: id(6), userName: "0976455019", fullName: "Vũ Khánh Linh", staffRole: "Receptionist", isActive: true },
];

// Mô phỏng kết quả server sau POST /staff: tài khoản mới đang hoạt động; mật khẩu không được giữ lại.
export function buildMockStaff(request: StaffCreateRequest, staffId: string): Staff {
  return {
    staffId,
    userName: request.userName,
    fullName: request.fullName,
    staffRole: request.staffRole,
    isActive: true,
  };
}

// Mô phỏng POST /staff. Số điện thoại là tên đăng nhập duy nhất (X-02): đã có thì API trả 409 DUPLICATE_CONTACT
// (openapi createStaff). Hàm ném ApiError giống hệt API thật để StaffForm xử lý một cách duy nhất khi nối backend.
// So với MỌI tài khoản, kể cả đã vô hiệu hóa, vì tài khoản vô hiệu hóa vẫn giữ tên đăng nhập.
// Mô phỏng này chỉ thấy danh sách nhân viên; backend còn kiểm tra cả số điện thoại của khách hàng.
export function createMockStaff(current: Staff[], request: StaffCreateRequest, staffId: string): Staff[] {
  const userName = normalizePhone(request.userName);
  if (current.some((item) => item.userName === userName)) {
    throw new ApiError({ kind: "http", status: 409, code: "DUPLICATE_CONTACT", title: FORM_MESSAGES.phoneDuplicate });
  }
  return [...current, buildMockStaff({ ...request, userName }, staffId)];
}

// Mô phỏng PUT /staff/{id}: chỉ đổi họ tên và vai trò, giữ nguyên số điện thoại và trạng thái.
export function updateMockStaff(current: Staff[], staffId: string, request: StaffUpdateRequest): Staff[] {
  return current.map((item) =>
    item.staffId === staffId ? { ...item, fullName: request.fullName, staffRole: request.staffRole } : item,
  );
}

// Mô phỏng POST /staff/{id}/deactivate: IsActive = false, người đó vẫn nằm trong danh sách.
export function deactivateMockStaff(current: Staff[], staffId: string): Staff[] {
  return current.map((item) => (item.staffId === staffId ? { ...item, isActive: false } : item));
}
