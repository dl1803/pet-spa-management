"use client";

import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PaymentBadge } from "@/components/domain/payment-badge";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CashPanel } from "@/features/reception-payments/components/cash-panel";
import { PaymentBreakdown } from "@/features/reception-payments/components/payment-breakdown";
import { QrPanel } from "@/features/reception-payments/components/qr-panel";
import {
  COUNTER_METHOD_ORDER,
  createCounterFormValues,
  getCounterFormState,
  isCounterMethod,
  toCounterPaymentRequest,
  validateReceivedAmount,
  type CounterFormValues,
} from "@/features/reception-payments/forms";
import {
  buildBreakdown,
  getPaymentSubtitle,
  getPaymentTitle,
  type CounterPaymentRow,
} from "@/features/reception-payments/payment";
import type { CounterPaymentRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

const METHOD_ICONS = { Cash: "cash", BankQR: "qr" } as const;

type CounterPaymentFormProps = {
  row: CounterPaymentRow;
  confirmerName: string;
  isSubmitting: boolean;
  onSubmit: (request: CounterPaymentRequest) => void;
};

// Vùng 2 đến 8 của một khoản đang chọn. Chỉ gửi { method, receivedAmount }; số tiền phải trả là `amount` do hệ thống tính.
export function CounterPaymentForm({ row, confirmerName, isSubmitting, onSubmit }: CounterPaymentFormProps) {
  const { payment } = row;
  const id = useId();
  const receivedId = `${id}-received`;
  const confirmId = `${id}-confirm`;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CounterFormValues>({
    defaultValues: createCounterFormValues(payment.amount),
    mode: "onChange",
  });

  const method = useWatch({ control, name: "method" });
  const receivedAmount = useWatch({ control, name: "receivedAmount" });
  const bankConfirmed = useWatch({ control, name: "bankConfirmed" });
  const state = getCounterFormState({ method, receivedAmount, bankConfirmed }, payment.amount);
  const receivedRegistration = register("receivedAmount", { validate: validateReceivedAmount(payment.amount) });
  const receivedError = errors.receivedAmount?.message;

  function submit(values: CounterFormValues) {
    if (isSubmitting || getCounterFormState(values, payment.amount).isLocked) return;
    onSubmit(toCounterPaymentRequest(values));
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <div className="flex items-start gap-3 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
        <div className="min-w-0 grow">
          <h2>{getPaymentTitle(row)}</h2>
          <p className="text-xs text-muted">{getPaymentSubtitle(row)}</p>
        </div>
        <PaymentBadge status={payment.status} />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <PaymentBreakdown lines={buildBreakdown(row)} />

        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">Số tiền phải trả</span>
          <span className="text-[28px] font-bold leading-9 tabular-nums">{formatMoney(payment.amount)}</span>
        </div>

        <div>
          <div aria-hidden="true" className="mb-1.5 text-[13px] font-semibold leading-[18px]">
            Phương thức
          </div>
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
                items={COUNTER_METHOD_ORDER.map((item) => ({
                  value: item,
                  label: (
                    <>
                      <Icon name={METHOD_ICONS[item]} className="size-4" />
                      {PAYMENT_METHOD_LABELS[item]}
                    </>
                  ),
                }))}
              />
            )}
          />
        </div>

        {method === "Cash" ? (
          <CashPanel id={receivedId} registration={receivedRegistration} error={receivedError} state={state} />
        ) : (
          <QrPanel
            appointmentId={payment.appointmentId}
            receivedId={receivedId}
            confirmId={confirmId}
            receivedRegistration={receivedRegistration}
            confirmRegistration={register("bankConfirmed")}
            error={receivedError}
          />
        )}
      </div>

      <CardFooter className="items-center justify-between">
        <span className="text-xs text-muted">Người xác nhận: {confirmerName}</span>
        <Button type="submit" disabled={state.isLocked} loading={isSubmitting} loadingText="Đang ghi nhận…">
          Xác nhận đã thanh toán
        </Button>
      </CardFooter>
    </form>
  );
}
