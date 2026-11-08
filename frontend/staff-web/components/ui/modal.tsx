"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Icon, type IconName } from "@/components/icons";

type ModalProps = {
  icon: IconName;
  tone?: "teal" | "warn" | "danger";
  title: string;
  description: string;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

const ICON_TONE_CLASS = {
  teal: "bg-lagoon-50 text-lagoon",
  warn: "bg-apricot-50 text-apricot-700",
  danger: "bg-danger-50 text-danger",
} as const;

function isBackdrop({ target, currentTarget, clientX, clientY }: MouseEvent<HTMLDialogElement>) {
  if (target !== currentTarget) return false;
  const { left, top, right, bottom } = currentTarget.getBoundingClientRect();
  return clientX < left || clientX >= right || clientY < top || clientY >= bottom;
}

export function Modal({ icon, tone = "teal", title, description, onClose, fallbackFocusRef, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackTarget = fallbackFocusRef?.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    }
    return () => {
      dialog?.close();
      const returnTarget = opener?.isConnected ? opener : fallbackTarget;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [fallbackFocusRef]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPressed.current = isBackdrop(event);
      }}
      onPointerCancel={() => {
        backdropPressed.current = false;
      }}
      onClick={(event) => {
        const shouldClose = backdropPressed.current && isBackdrop(event);
        backdropPressed.current = false;
        if (shouldClose) onClose();
      }}
      className="m-auto w-[480px] max-w-[calc(100%-32px)] animate-dialog-in rounded-2xl border-0 bg-white p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      <div className="flex items-start gap-3.5 px-6 pt-6">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${ICON_TONE_CLASS[tone]}`}>
          <Icon name={icon} className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-[18px] leading-[26px]">{title}</h2>
          <p className="text-muted">{description}</p>
        </div>
      </div>
      {children}
    </dialog>
  );
}
