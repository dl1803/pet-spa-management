import Link from "next/link";
import { Suspense } from "react";
import { PawLogo } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import { ActiveHeaderNav, HeaderNav } from "./header-nav";

export function BrandMark() {
  return (
    <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-lagoon after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-white after:bg-apricot after:content-['']">
      <PawLogo className="size-5 fill-white" />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex min-h-[60px] max-w-[1200px] flex-wrap items-center justify-between gap-y-1.5 px-3 py-1.5 sm:h-[68px] sm:flex-nowrap sm:justify-start sm:gap-7 sm:px-4 sm:py-0 md:px-8 max-[980px]:gap-3 max-[860px]:gap-1.5">
        <Link
          href={ROUTES.home}
          className="order-1 flex items-center gap-2.5 whitespace-nowrap text-base font-bold text-ink hover:text-ink max-[860px]:gap-0"
        >
          <BrandMark />
          <span className="max-[860px]:sr-only">Spa thú cưng</span>
        </Link>
        <Suspense fallback={<HeaderNav pathname={null} />}>
          <ActiveHeaderNav />
        </Suspense>
      </div>
    </header>
  );
}

