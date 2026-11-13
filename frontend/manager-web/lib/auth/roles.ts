import type { Me } from "@/lib/api/types";

// Web quản lý chỉ nhận role = Manager (Authorization 3.6).
export function isManagerMe(me: Me | null | undefined): me is Me {
  return !!me && me.role === "Manager";
}
