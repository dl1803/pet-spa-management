import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { PawLogo } from "@/components/icons";
import type { Species } from "@/lib/api/types";

type AuthLayoutProps = {
  heading: string;
  description: string;
  species: Species[];
  children: ReactNode;
};


export function AuthLayout({ heading, description, species, children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <div className="relative flex flex-col overflow-hidden bg-lagoon px-14 py-12 text-white max-[980px]:hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-[360px] rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute right-[60px] top-[120px] size-40 rounded-full bg-apricot/[0.18]" />
        <div className="relative flex items-center gap-2.5 whitespace-nowrap text-base font-bold">
          <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon after:bg-apricot after:content-['']">
            <PawLogo className="size-5 fill-lagoon" />
          </span>
          <span>
            Spa thú cưng
            <small className="block text-[11px] font-medium leading-[14px] text-[#A9D9DC]">
              Chăm sóc và lưu trú cho chó, mèo, thỏ, chuột lang
            </small>
          </span>
        </div>
        <h2 className="relative mt-auto max-w-[460px] text-[34px] font-bold leading-[42px] tracking-[-0.02em]">
          {heading}
        </h2>
        <p className="relative mt-3.5 max-w-[420px] text-[15px] leading-6 text-[#C9E9EB]">{description}</p>
        <div className="relative mt-8 flex gap-3">
          {species.map((item) => (
            <span key={item} className="rounded-[22px] shadow-[0_0_0_4px_rgba(255,255,255,0.12)]">
              <PetAvatar species={item} size="lg" />
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-8 py-12 max-[640px]:px-4">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </main>
  );
}

