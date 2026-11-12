"use client";

import type { RefObject } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type CancelAppointmentDialogProps = {
  isCancelling: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

// Không có ô nhập lý do vì API hủy lịch không nhận lý do.
export function CancelAppointmentDialog({
  isCancelling,
  error,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: CancelAppointmentDialogProps) {
  function close() {
    if (!isCancelling) onClose();
  }

  return (
    <Modal
      icon="x-circle"
      tone="danger"
      title="Hủy lịch hẹn này?"
      description="Bạn đang trong thời hạn tự hủy nên không mất phí."
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <ErrorAlert error={error} />
        <p className="text-muted">
          Lịch chuyển sang Đã hủy với lý do khách hàng chủ động hủy. Thao tác không hoàn tác được, nếu cần bạn phải đặt lịch
          mới.
        </p>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6">
        <Button variant="ghost" data-initial-focus disabled={isCancelling} onClick={close}>
          Giữ lịch
        </Button>
        <Button variant="danger-solid" loading={isCancelling} onClick={onConfirm}>
          Hủy lịch hẹn
        </Button>
      </div>
    </Modal>
  );
}

