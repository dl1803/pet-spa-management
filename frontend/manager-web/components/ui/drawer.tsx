"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";

type DrawerProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Ngăn kéo phải 640px (Design-System 4.1). Dùng <dialog> modal: trình duyệt khóa nền và giữ focus trong ngăn kéo;
// khi gỡ khỏi cây, thành phần tự trả focus về nút đã mở. Chỉ đặt vào cây React khi cần mở; gỡ khỏi cây thì đóng.
export function Drawer({ title, onClose, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    // Gỡ <dialog> khỏi cây React làm trình duyệt đưa focus về BODY trước khi close() chạy,
    // nên phải nhớ nút đã mở và tự trả focus về đó.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc: để React quyết định đóng, không để trình duyệt tự đóng.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Bấm nền mờ: sự kiện có đích là chính <dialog>.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-[640px] max-w-full animate-drawer-in border-0 bg-white p-0 text-ink shadow-pop open:flex open:flex-col backdrop:bg-ink/40"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-4">
        <h2 id={titleId} className="grow break-words">{title}</h2>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] text-muted hover:bg-line-soft hover:text-ink"
        >
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
