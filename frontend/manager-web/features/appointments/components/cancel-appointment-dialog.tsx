"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Modal } from "@/components/ui/modal";
import type { AppointmentDetail, ManagerCancelReason } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useCancelAppointment } from "@/lib/queries/appointments";
import { CANCEL_MESSAGES, CANCEL_REASON_OPTIONS } from "../cancel";
import { isStaleAppointmentError } from "../intervention-error";

type CancelAppointmentDialogProps = {
  appointment: AppointmentDetail;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export function CancelAppointmentDialog({ appointment, onClose, fallbackFocusRef }: CancelAppointmentDialogProps) {
  const id = useId();
  const legendId = `${id}-legend`;
  const errorId = `${id}-error`;

  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<ManagerCancelReason | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const { showSuccess, showError } = useToast();
  const cancelMutation = useCancelAppointment();

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    if (!reason) {
      setValidationError(CANCEL_MESSAGES.reasonRequired);
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setValidationError(null);
    setSubmitError(null);

    try {
      await cancelMutation.mutateAsync({
        appointmentId: appointment.appointmentId,
        request: { reason },
      });
      showSuccess(CANCEL_MESSAGES.success);
      onClose();
    } catch (error) {
      if (isStaleAppointmentError(error)) {
        showError(error);
        onClose();
      } else {
        setSubmitError(error);
      }
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function close() {
    if (!submitting.current && !isSubmitting) onClose();
  }

  return (
    <Modal
      tone="danger"
      icon="x-circle"
      title={`Hủy lịch hẹn ${formatAppointmentCode(appointment.appointmentId)}`}
      description="Chọn lý do. Khách và nhân viên phụ trách nhận thông báo kèm lý do."
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form noValidate onSubmit={submitForm}>
        <div className="flex flex-col gap-4 px-6 py-5">
          <ErrorAlert error={submitError} />

          <fieldset aria-describedby={validationError ? errorId : undefined}>
            <legend id={legendId} className="mb-1.5 text-[13px] font-semibold leading-[18px]">
              Lý do hủy<span aria-hidden="true" className="text-danger">*</span>
            </legend>
            <div
              role="radiogroup"
              aria-labelledby={legendId}
              aria-required="true"
              aria-invalid={validationError ? true : undefined}
              className="flex flex-col gap-2"
            >
              {CANCEL_REASON_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  name={`${id}-reason`}
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => {
                    setReason(option.value);
                    setValidationError(null);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-muted">{option.hint}</span>
                  </span>
                </ChoiceCard>
              ))}
            </div>
            <FieldError id={errorId} message={validationError ?? undefined} />
          </fieldset>
        </div>

        <div className="flex justify-end gap-2.5 px-6 pb-6">
          <Button variant="ghost" data-initial-focus disabled={isSubmitting} onClick={close}>
            Quay lại
          </Button>
          <Button
            type="submit"
            variant="danger-solid"
            disabled={isSubmitting}
            aria-busy={isSubmitting ? "true" : undefined}
          >
            {isSubmitting ? "Đang hủy…" : "Hủy lịch hẹn"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
