"use client";

import type { ReactNode } from "react";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import type { StaffRole } from "@/lib/api/types";
import { useSession } from "./session-context";

// Lớp 3 của route guard (Frontend-Architecture 4.2). Chỉ ẩn/hiện giao diện; quyền thật do backend kiểm tra.
// Đặt bên trong SessionGate nên khi render đã có vai trò.
export function RoleGate({ allow, children }: { allow: readonly StaffRole[]; children: ReactNode }) {
  const { staffRole } = useSession();
  if (staffRole === null || !allow.includes(staffRole)) return <ForbiddenState />;
  return <>{children}</>;
}
