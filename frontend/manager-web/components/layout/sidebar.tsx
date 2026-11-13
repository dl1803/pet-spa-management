import Link from "next/link";
import { Suspense } from "react";
import { PawLogo } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import { SidebarAccount } from "./sidebar-account";
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
      <SidebarAccount />
    </aside>
  );
}
