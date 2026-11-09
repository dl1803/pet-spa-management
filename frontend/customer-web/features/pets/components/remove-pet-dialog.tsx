"use client";

import type { RefObject } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type RemovePetDialogProps = {
  petName: string;
  isRemoving: boolean;
  // Lỗi 403/404 của thao tác gỡ hiện ngay trong hộp thoại.
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

// Hộp thoại xác nhận gỡ hồ sơ thú cưng.
export function RemovePetDialog({
  petName,
  isRemoving,
  error,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: RemovePetDialogProps) {
  // Không đóng khi đang gửi.
  function close() {
    if (!isRemoving) onClose();
  }

  return (
    <Modal
      icon="trash"
      tone="danger"
      title={`Gỡ hồ sơ ${petName}?`}
      description={`Bé ${petName} sẽ không còn trong danh sách của bạn.`}
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <ErrorAlert error={error} />
        <ul className="list-disc space-y-1 pl-[18px]">
          <li>Hồ sơ đã có lịch hẹn: chuyển sang ngừng hoạt động và ẩn đi. Cửa hàng vẫn giữ dữ liệu các lịch hẹn cũ.</li>
          <li>Hồ sơ chưa từng đặt lịch: xóa hẳn.</li>
        </ul>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6">
        <Button variant="ghost" data-initial-focus disabled={isRemoving} onClick={close}>
          Giữ hồ sơ
        </Button>
        <Button variant="danger-solid" loading={isRemoving} onClick={onConfirm}>
          Gỡ hồ sơ
        </Button>
      </div>
    </Modal>
  );
}

