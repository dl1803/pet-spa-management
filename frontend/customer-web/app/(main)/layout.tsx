import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5">
        {children}
      </main>
    </>
  );
}

