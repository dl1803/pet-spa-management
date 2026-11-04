import Link from "next/link";
import { Suspense } from "react";
import { PawLogo } from "@/components/icons";
import type { StaffRole } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";
import { ActiveHeaderNav, HeaderNav } from "./header-nav";
import { onDarkFocusClass, onDarkMutedTextClass } from "./header-styles";

export function BrandMark() {
  return (
    <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon-700 after:bg-apricot after:content-['']">
      <PawLogo className="size-5 fill-lagoon-700" />
    </span>
  );
}

export function SiteHeader({ role }: { role: StaffRole | null }) {
  return (
    <header className="sticky top-0 z-40 bg-lagoon-700 text-white">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-5 px-6 max-[980px]:gap-3 max-[980px]:px-3">
        <Link
          href={ROUTES.home}
          className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg text-base font-bold text-white hover:text-white max-[640px]:gap-0 ${onDarkFocusClass}`}
        >
          <BrandMark />
          <span className="max-[640px]:sr-only">
            Spa thú cưng
            <small className={`block text-[11px] font-medium leading-[14px] ${onDarkMutedTextClass} max-[980px]:hidden`}>
              Web nhân viên
            </small>
          </span>
        </Link>
        <Suspense fallback={<HeaderNav pathname={null} role={role} />}>
          <ActiveHeaderNav role={role} />
        </Suspense>
      </div>
    </header>
  );
}
