import type { Staff } from "@/lib/api/types";

export type StaffFilter = "all" | "spa" | "receptionist" | "inactive";

export const STAFF_FILTERS: { value: StaffFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "spa", label: "Nhân viên spa" },
  { value: "receptionist", label: "Lễ tân" },
  { value: "inactive", label: "Đã vô hiệu hóa" },
];

export function parseStaffFilter(value: string | null): StaffFilter {
  return STAFF_FILTERS.find((filter) => filter.value === value)?.value ?? "all";
}

// Lọc ở web trên dữ liệu đã tải (UI-Screens MW-08 vùng 2). Nhóm theo vai trò gồm cả người đã vô hiệu hóa,
// khớp số trên chip ở UI demo (Nhân viên spa 4 = 3 đang hoạt động + 1 đã vô hiệu hóa).
export function filterStaff(staff: Staff[], filter: StaffFilter): Staff[] {
  switch (filter) {
    case "spa":
      return staff.filter((item) => item.staffRole === "SpaStaff");
    case "receptionist":
      return staff.filter((item) => item.staffRole === "Receptionist");
    case "inactive":
      return staff.filter((item) => !item.isActive);
    default:
      return staff;
  }
}

export function countStaff(staff: Staff[]) {
  const active = staff.filter((item) => item.isActive);
  return {
    all: staff.length,
    spa: filterStaff(staff, "spa").length,
    receptionist: filterStaff(staff, "receptionist").length,
    inactive: staff.length - active.length,
    // Dòng tiêu đề chỉ đếm người đang hoạt động.
    activeSpa: active.filter((item) => item.staffRole === "SpaStaff").length,
    activeReceptionist: active.filter((item) => item.staffRole === "Receptionist").length,
  };
}

// Tên gọi trong câu: từ cuối của họ tên, theo UI demo (“Lê Minh Tâm” → “Tâm”).
export function getGivenName(fullName: string) {
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] ?? "";
}
