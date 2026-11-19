"use client";

import type { RefObject } from "react";
import { GatewayOption } from "@/components/domain/gateway-option";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/format";
import { ONLINE_PAYMENT_GATEWAY } from "@/lib/payments";

type OnlinePaymentDialogProps = {
  // Mô tả dưới tiêu đề, ví dụ "Lịch spa LH-2B8E5F04 của Mochi".
  appointmentLabel: string;
  amount: number;
  isPaying: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

// CW-09·D3 – UI-Screens.md. Số tiền chỉ để hiển thị; request không gửi số tiền.
export function OnlinePaymentDialog({
  appointmentLabel,
  amount,
  isPaying,
  error,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: OnlinePaymentDialogProps) {
  function close() {
    if (!isPaying) onClose();
  }

  return (
    <Modal
      icon="wallet"
      title="Thanh toán trực tuyến"
      description={`${appointmentLabel}.`}
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <ErrorAlert error={error} />
        <div className="flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3.5">
          <span className="text-muted">Số tiền</span>
          <span className="text-[22px] font-bold leading-7 tabular-nums">{formatMoney(amount)}</span>
        </div>
        <GatewayOption gateway={ONLINE_PAYMENT_GATEWAY} description="Thẻ ngân hàng, ví VNPAY, QR" />
        <p className="text-xs text-muted">
          Bạn sẽ được chuyển sang cổng thanh toán (môi trường thử nghiệm). Trạng thái chuyển Đã thanh toán khi cửa hàng
          nhận được xác nhận khớp đủ số tiền từ cổng.
        </p>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6">
        <Button variant="ghost" data-initial-focus disabled={isPaying} onClick={close}>
          Để sau
        </Button>
        <Button loading={isPaying} onClick={onConfirm}>
          Tiếp tục đến cổng thanh toán
        </Button>
      </div>
    </Modal>
  );
}
