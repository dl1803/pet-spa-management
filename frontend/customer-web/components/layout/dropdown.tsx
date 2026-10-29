"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type DropdownProps = {
  label: ReactNode;
  buttonClassName: string;
  align?: "left" | "right";
  children: ReactNode;
};

export function Dropdown({ label, buttonClassName, align = "left", children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className={buttonClassName}
      >
        {label}
      </button>
      <div
        id={menuId}
        hidden={!open}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            setOpen(false);
          }
        }}
        className={`absolute top-[calc(100%+6px)] z-[70] min-w-[220px] rounded-xl border border-line bg-white p-1.5 shadow-pop ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export const dropdownItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left text-sm text-ink hover:bg-mist";

