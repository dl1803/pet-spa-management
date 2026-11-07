"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toApiError } from "@/lib/api/errors";
import type { CounterPaymentRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import {
  COUNTER_METHOD_ORDER,
  FORM_MESSAGES,
  createCounterFormValues,
  isCounterMethod,
  toCounterPaymentRequest,
  validateReceivedAmount,
  type CounterFormValues,
} from "../forms";
import { describePayment, type PaymentRow } from "../list";

type CounterPaymentDialogProps = {
  payment: PaymentRow;
  // Có thể ném (hoặc từ chối Promise) ApiError: 409 AMOUNT_MISMATCH hiện dưới ô số tiền, lỗi khác hiện ở đầu form.
  onSubmit: (request: CounterPaymentRequest) => void | Promise<void>;
  onClose: () => void;
};

const METHOD_ICONS = { Cash: "cash", BankQR: "qr" } as const;

// MW-10·D1 – Ghi nhận thanh toán tại quầy (UI-Screens.md). Số tiền phải trả là `amount` của server, chỉ đọc;
// chỉ gửi { method, receivedAmount }, không gửi `amount`.
export function CounterPaymentDialog({ payment, onSubmit, onClose }: CounterPaymentDialogProps) {
  const id = useId();
  const receivedId = `${id}-received`;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CounterFormValues>({
    defaultValues: createCounterFormValues(payment.amount),
    mode: "onTouched",
  });

  // Lỗi gửi không gắn với một ô (Frontend-Conventions 4.1, 5.1): hiện bằng ErrorAlert đầu form.
  const [submitError, setSubmitError] = useState<unknown>(null);

  async function submit(values: CounterFormValues) {
    setSubmitError(null);
    try {
      await onSubmit(toCounterPaymentRequest(values));
    } catch (error) {
      // Giữ nguyên dữ liệu đã nhập (Frontend-Conventions 4.1).
      if (toApiError(error).code === "AMOUNT_MISMATCH") {
        setError("receivedAmount", { type: "server", message: FORM_MESSAGES.receivedAmountInsufficient }, { shouldFocus: true });
      } else {
        setSubmitError(error);
      }
    }
  }

  return (
    <Modal icon="wallet" title="Ghi nhận thanh toán tại quầy" description={describePayment(payment)} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit(submit)}>
        <div className="flex flex-col gap-4 px-6 py-5">
          <ErrorAlert error={submitError} />

          <div className="flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3.5">
            <span className="text-muted">Số tiền phải trả</span>
            <span className="text-[22px] font-bold leading-[28px] tabular-nums">{formatMoney(payment.amount)}</span>
          </div>

          <div>
            <div aria-hidden="true" className="mb-1.5 text-[13px] font-semibold leading-[18px]">Phương thức</div>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <SegmentedControl
                  label="Phương thức"
                  value={field.value}
                  onChange={(value) => {
                    if (isCounterMethod(value)) field.onChange(value);
                  }}
                  items={COUNTER_METHOD_ORDER.map((method) => ({
                    value: method,
                    label: (
                      <>
                        <Icon name={METHOD_ICONS[method]} className="size-4" />
                        {PAYMENT_METHOD_LABELS[method]}
                      </>
                    ),
                  }))}
                />
              )}
            />
          </div>

          <Field
            id={receivedId}
            label="Số tiền thực nhận"
            required
            hint="Phải bằng hoặc lớn hơn số tiền phải trả."
            error={errors.receivedAmount?.message}
          >
            <Input
              id={receivedId}
              suffix="đ"
              inputMode="numeric"
              autoComplete="off"
              aria-required="true"
              aria-invalid={errors.receivedAmount ? true : undefined}
              aria-describedby={describedBy(receivedId, { hasHint: true, hasError: Boolean(errors.receivedAmount) })}
              {...register("receivedAmount", { validate: validateReceivedAmount(payment.amount) })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2.5 px-6 pb-6">
          <Button variant="ghost" data-initial-focus onClick={onClose}>Hủy bỏ</Button>
          <Button type="submit">Xác nhận đã thanh toán</Button>
        </div>
      </form>
    </Modal>
  );
}
