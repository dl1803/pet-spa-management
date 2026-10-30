import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[10px] bg-white px-4 py-2 text-lagoon-800 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Đến nội dung chính
      </a>
      <Sidebar />
      <div className="ml-62 max-[980px]:ml-0">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1280px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5"
        >
          {children}
        </main>
      </div>
    </>
  );
}
