"use client";

import { useSession } from "@/lib/auth/session-context";
import { SiteHeader } from "./site-header";

// Cầu nối giữa phiên (client) và khung trang: vai trò thật vào menu, nút Đăng xuất gọi signOut.
export function SessionSiteHeader() {
  const { status, staffRole, signOut } = useSession();
  return (
    <SiteHeader
      role={staffRole}
      pending={status === "idle" || status === "restoring"}
      onLogout={staffRole === null ? undefined : () => void signOut()}
    />
  );
}
