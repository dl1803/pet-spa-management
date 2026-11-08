"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Modal } from "@/components/ui/modal";
import { formatKg } from "@/features/reception-check-in/weight";
import type { CostConfirmation } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

type CostResponseDialogProps = {
  petName: string;
  appointmentCode: string;
  confirmation: CostConfirmation;
  isSubmitting: boolean;
  error: unknown;
  onSubmit: (accept: boolean) => void;
  onClose: () => void;
};

type Choice = "accept" | "reject";

export function CostResponseDialog({
  petName,
  appointmentCode,
  confirmation,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: CostResponseDialogProps) {
  const [choice, setChoice] = useState<Choice>("accept");

  function close() {
    if (!isSubmitting) onClose();
  }

  return (
    <Modal
      icon="phone"
      tone="warn"
      title="Ghi nhận phản hồi của khách"
      description={`${petName}, ${appointmentCode}. Chi phí mới ${formatMoney(confirmation.newAmount)} (trước ${formatMoney(confirmation.oldAmount)}).`}
      onClose={close}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <ErrorAlert error={error} />
        <div role="radiogroup" aria-label="Phản hồi của khách" className="flex flex-col gap-3">
          <ChoiceCard name="cost-response" value="accept" checked={choice === "accept"} onChange={() => setChoice("accept")}>
            <div>
              <div className="font-semibold">Khách đồng ý chi phí mới</div>
              <div className="text-xs text-muted">Lịch tiếp tục, hồ sơ cập nhật {formatKg(confirmation.actualWeightKg)}</div>
            </div>
          </ChoiceCard>
          <ChoiceCard name="cost-response" value="reject" checked={choice === "reject"} onChange={() => setChoice("reject")}>
            <div>
              <div className="font-semibold">Khách từ chối</div>
              <div className="text-xs text-muted">Lịch bị hủy, lý do không xác nhận chi phí mới</div>
            </div>
          </ChoiceCard>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-6">
        <Button variant="ghost" data-initial-focus disabled={isSubmitting} onClick={close}>
          Hủy bỏ
        </Button>
        <Button loading={isSubmitting} onClick={() => onSubmit(choice === "accept")}>
          Ghi nhận phản hồi
        </Button>
      </div>
    </Modal>
  );
}

