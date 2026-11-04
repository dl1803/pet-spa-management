import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[10px] bg-white px-4 py-2 text-lagoon-800 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Đến nội dung chính
      </a>
      {/* Tạm thời null. Nhận vai trò thật ở A-05 (sau ID121/A-04). */}
      <SiteHeader role={null} />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1320px] px-6 pb-[72px] pt-6 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5"
      >
        {children}
      </main>
    </>
  );
}
