import Link from "next/link";
import { Suspense } from "react";
import { Icon, PawLogo } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import { ActiveSidebarNav, SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-62 flex-col bg-lagoon-800 text-[#CDE3E5] max-[980px]:static max-[980px]:w-auto max-[980px]:flex-row">
      <Link
        href={ROUTES.dashboard}
        className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-5 pb-4 pt-[18px] text-base font-bold text-white focus-visible:outline-apricot focus-visible:outline-offset-0"
      >
        <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon-800 after:bg-apricot after:content-['']">
          <PawLogo className="size-5 fill-lagoon-800" />
        </span>
        <span>
          Spa thú cưng
          <small className="block text-[11px] font-medium leading-[14px] text-[#89BDC2]">Web quản lý</small>
        </span>
      </Link>
      <Suspense fallback={<SidebarNav pathname={null} pendingCount={null} />}>
        <ActiveSidebarNav pendingCount={null} />
      </Suspense>
      <div className="flex items-center gap-2.5 border-t border-white/10 p-3 max-[980px]:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-lagoon-800">
            <Icon name="user" />
          </span>
          <div className="leading-[18px]">
            <span className="block font-bold">Tài khoản quản lý</span>
            <span id="session-unavailable" className="block text-xs text-[#89BDC2]">Chưa đăng nhập</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-label="Đăng xuất"
          aria-describedby="session-unavailable"
          className="grid size-9 shrink-0 cursor-not-allowed place-items-center rounded-[10px] text-[#89BDC2]"
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
