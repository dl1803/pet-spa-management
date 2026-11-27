"use client";

import { useSession } from "@/lib/auth/session-context";
import { useUnreadNotificationCount } from "@/lib/queries/notifications";
import { SiteHeader } from "./site-header";

// Cầu nối giữa phiên (client) và khung trang: vai trò thật vào menu, số chưa đọc cho NVS, nút Đăng xuất gọi signOut.
export function SessionSiteHeader() {
  const { status, staffRole, signOut } = useSession();
  const unread = useUnreadNotificationCount({ enabled: status === "authenticated" && staffRole === "SpaStaff" });
  return (
    <SiteHeader
      role={staffRole}
      pending={status === "idle" || status === "restoring"}
      unreadNotifications={unread.data ?? null}
      onLogout={staffRole === null ? undefined : () => void signOut()}
    />
  );
}
