"use client";

import type { RefObject } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type RejectCostDialogProps = {
  // Ví dụ “Lịch spa LH-1029 của Bông”.
  subject: string;
  isRejecting: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export function RejectCostDialog({
  subject,
  isRejecting,
  error,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: RejectCostDialogProps) {
  function close() {
    if (!isRejecting) onClose();
  }

  return (
    <Modal
      icon="x-circle"
      tone="danger"
      title="Từ chối chi phí mới?"
      description={`${subject} sẽ bị hủy.`}
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <ErrorAlert error={error} />
        <p className="text-muted">
          Lịch chuyển sang Đã hủy với lý do không xác nhận chi phí mới. Thao tác không hoàn tác được, nếu cần bạn phải đặt lịch
          mới.
        </p>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6">
        <Button variant="ghost" data-initial-focus disabled={isRejecting} onClick={close}>
          Quay lại
        </Button>
        <Button variant="danger-solid" loading={isRejecting} onClick={onConfirm}>
          Từ chối và hủy lịch
        </Button>
      </div>
    </Modal>
  );
}
