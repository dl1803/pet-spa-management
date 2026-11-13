"use client";

import { Icon } from "@/components/icons";
import { useSession } from "@/lib/auth/session-context";

// Khối tài khoản cuối thanh bên (UI-Screens 2.1 D): QL không có họ tên trong API nên hiện userName (G-11).
// Nút Đăng xuất chỉ bấm được khi đã có phiên.
export function SidebarAccount() {
  const { status, me, signOut } = useSession();
  const subtitle = me !== null ? "Quản lý" : status === "failed" ? "Chưa xác định được phiên" : "Đang tải…";

  return (
    <div className="flex items-center gap-2.5 border-t border-white/10 p-3 max-[980px]:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-lagoon-800">
          <Icon name="user" />
        </span>
        <div className="min-w-0 leading-[18px]">
          <span className="block truncate font-bold">{me?.userName ?? "Tài khoản quản lý"}</span>
          <span className="block text-xs text-[#89BDC2]">{subtitle}</span>
        </div>
      </div>
      <button
        type="button"
        disabled={me === null}
        onClick={() => void signOut()}
        aria-label="Đăng xuất"
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[#D3E7E9] hover:bg-white/[.07] hover:text-white focus-visible:outline-apricot focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:text-[#89BDC2] disabled:hover:bg-transparent"
      >
        <Icon name="logout" />
      </button>
    </div>
  );
}
