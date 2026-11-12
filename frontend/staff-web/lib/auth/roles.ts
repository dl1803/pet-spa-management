import type { Me } from "@/lib/api/types";

// Web nhân viên chỉ nhận role = Staff có staffRole hợp lệ (Authorization 3.6).
export function isStaffMe(me: Me | null | undefined): me is Me {
  return !!me && me.role === "Staff" && (me.staffRole === "Receptionist" || me.staffRole === "SpaStaff");
}
