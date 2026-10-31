import type { ReactNode } from "react";
import type { Species } from "@/lib/api/types";

const BACKGROUND_CLASS: Record<Species, string> = {
  Dog: "bg-sp-dog",
  Cat: "bg-sp-cat",
  Rabbit: "bg-sp-rabbit",
  GuineaPig: "bg-sp-guinea",
};

const ILLUSTRATION: Record<Species, ReactNode> = {
  Dog: (
    <>
      <ellipse cx="12.5" cy="24" rx="5.4" ry="9.4" transform="rotate(18 12.5 24)" fill="#C98A3D" />
      <ellipse cx="35.5" cy="24" rx="5.4" ry="9.4" transform="rotate(-18 35.5 24)" fill="#C98A3D" />
      <ellipse cx="24" cy="25.5" rx="12.2" ry="12.6" fill="#F0BE72" />
      <ellipse cx="24" cy="31.5" rx="7.2" ry="5.6" fill="#FCE6C2" />
      <circle cx="19.2" cy="23.4" r="1.8" fill="#14323A" />
      <circle cx="28.8" cy="23.4" r="1.8" fill="#14323A" />
      <circle cx="19.8" cy="22.8" r=".55" fill="#fff" />
      <circle cx="29.4" cy="22.8" r=".55" fill="#fff" />
      <ellipse cx="24" cy="29" rx="2.7" ry="2" fill="#14323A" />
      <path d="M24 30.9v2.1M21.5 33.6c1.3 1 3.7 1 5 0" stroke="#14323A" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  ),
  Cat: (
    <>
      <path d="M10.2 9 21.5 16.5 12.6 24z" fill="#8FB3BB" />
      <path d="M37.8 9 26.5 16.5 35.4 24z" fill="#8FB3BB" />
      <path d="M12.8 12.6 18.6 16.6 14.2 20.2z" fill="#F4B6AE" />
      <path d="M35.2 12.6 29.4 16.6 33.8 20.2z" fill="#F4B6AE" />
      <ellipse cx="24" cy="27.5" rx="13.6" ry="12" fill="#A9C7CE" />
      <ellipse cx="24" cy="32.4" rx="6.6" ry="4.6" fill="#E8F2F4" />
      <ellipse cx="18.6" cy="26" rx="1.6" ry="2.3" fill="#14323A" />
      <ellipse cx="29.4" cy="26" rx="1.6" ry="2.3" fill="#14323A" />
      <path d="M22.3 30h3.4L24 31.8z" fill="#E07F73" />
      <path d="M24 31.8v1.6M22 34.2c1.1.7 2.9.7 4 0" stroke="#14323A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M8.5 30l7 .8M8.8 34l6.8-1.2M39.5 30l-7 .8M39.2 34l-6.8-1.2" stroke="#5E8189" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  Rabbit: (
    <>
      <ellipse cx="18" cy="13.5" rx="4.3" ry="10.5" transform="rotate(-10 18 13.5)" fill="#FBFAFF" stroke="#C3BBE8" strokeWidth="1.2" />
      <ellipse cx="30" cy="13.5" rx="4.3" ry="10.5" transform="rotate(10 30 13.5)" fill="#FBFAFF" stroke="#C3BBE8" strokeWidth="1.2" />
      <ellipse cx="18" cy="14" rx="1.8" ry="7" transform="rotate(-10 18 14)" fill="#F4C3CC" />
      <ellipse cx="30" cy="14" rx="1.8" ry="7" transform="rotate(10 30 14)" fill="#F4C3CC" />
      <ellipse cx="24" cy="31" rx="12.2" ry="10.6" fill="#FBFAFF" stroke="#C3BBE8" strokeWidth="1.2" />
      <circle cx="19.4" cy="29.4" r="1.8" fill="#14323A" />
      <circle cx="28.6" cy="29.4" r="1.8" fill="#14323A" />
      <ellipse cx="24" cy="33.2" rx="1.7" ry="1.25" fill="#E58A99" />
      <path d="M24 34.4v1.4M22.2 36.4c1 .6 2.6.6 3.6 0" stroke="#14323A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="16.2" cy="33.6" r="2.1" fill="#F7C9D2" opacity=".75" />
      <circle cx="31.8" cy="33.6" r="2.1" fill="#F7C9D2" opacity=".75" />
    </>
  ),
  GuineaPig: (
    <>
      <circle cx="12.6" cy="17.8" r="4.4" fill="#B9773F" />
      <circle cx="35.4" cy="17.8" r="4.4" fill="#B9773F" />
      <ellipse cx="24" cy="28.5" rx="16" ry="12.6" fill="#D99A5B" />
      <path d="M24 16.5c4 0 6.2 4 6.2 8.6 0 6.2-2.8 10.8-6.2 10.8s-6.2-4.6-6.2-10.8c0-4.6 2.2-8.6 6.2-8.6z" fill="#FFF3E2" />
      <circle cx="16.8" cy="26.4" r="1.9" fill="#14323A" />
      <circle cx="31.2" cy="26.4" r="1.9" fill="#14323A" />
      <ellipse cx="24" cy="31" rx="1.9" ry="1.35" fill="#C9705E" />
      <path d="M24 32.3v1.4M22.2 34.5c1 .6 2.6.6 3.6 0" stroke="#14323A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  ),
};

export function PetGlyph({ species, className }: { species: Species; className: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      {ILLUSTRATION[species]}
    </svg>
  );
}

export function PetAvatar({ species }: { species: Species }) {
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] ${BACKGROUND_CLASS[species]}`}
    >
      <PetGlyph species={species} className="size-9" />
    </span>
  );
}
