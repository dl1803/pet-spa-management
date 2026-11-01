"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icons";

type ConfirmDialogProps = {
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Hộp thoại xác nhận hành động nguy hiểm (SA 6.6; Design-System 4.1): nút xác nhận danger-solid nêu đúng hậu quả,
// nút còn lại là “Quay lại”. Dùng <dialog> modal; nút đầu chân hộp thoại nhận focus khi mở.
// Chỉ đặt vào cây React khi cần mở.
export function ConfirmDialog({
  icon,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Quay lại",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[480px] max-w-[calc(100%-32px)] animate-dialog-in rounded-2xl border-0 bg-white p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      <div className="flex items-start gap-3.5 px-6 pt-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-apricot-50 text-apricot-700">
          <Icon name={icon} className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-[18px] leading-[26px]">{title}</h2>
          <p className="text-muted">{description}</p>
        </div>
      </div>
      {children && <div className="px-6 pt-4">{children}</div>}
      <div className="flex justify-end gap-2.5 px-6 pb-6 pt-6">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant="danger-solid" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
