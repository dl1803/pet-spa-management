"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CounterPaymentForm } from "@/features/reception-payments/components/counter-payment-form";
import { PaymentTicket } from "@/features/reception-payments/components/payment-ticket";
import { mockPayAtCounter } from "@/features/reception-payments/mock-api";
import {
  COUNTER_PAYMENTS_QUERY_KEY,
  describePaymentRow,
  NO_PAYMENTS_MESSAGE,
  resolveSelectedRow,
  type CounterPaymentsData,
} from "@/features/reception-payments/payment";
import type { CounterPaymentRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

type PaymentsWorkspaceProps = {
  data: CounterPaymentsData;
  // ?appointmentId=: chọn sẵn khoản của lịch hẹn đó nếu có.
  appointmentId: string | null;
  todayKey: string;
};

type PayVariables = {
  paymentId: string;
  amount: number;
  request: CounterPaymentRequest;
};

export function PaymentsWorkspace({ data, appointmentId, todayKey }: PaymentsWorkspaceProps) {
  const { rows, confirmerName } = data;
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const selected = resolveSelectedRow(rows, selectedPaymentId, appointmentId);

  const payMutation = useMutation({
    mutationFn: ({ paymentId, request }: PayVariables) => mockPayAtCounter(paymentId, request),
    onSuccess: (_result, variables) => {
      showSuccess(`Đã ghi nhận thanh toán ${formatMoney(variables.amount)}`);
      // Trả về Promise để nút giữ trạng thái đang gửi tới khi danh sách tải lại, tránh thu một khoản hai lần.
      return queryClient.invalidateQueries({ queryKey: COUNTER_PAYMENTS_QUERY_KEY });
    },
  });

  if (selected === null) {
    return (
      <Card>
        <EmptyState
          icon="wallet"
          title={NO_PAYMENTS_MESSAGE}
          description="Khoản đã thu xong hoặc chưa đến thời điểm thu sẽ không hiện ở đây."
        />
      </Card>
    );
  }

  const selectedPayment = selected.payment;

  return (
    <div className="grid grid-cols-[minmax(300px,400px)_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1">
      <Card>
        <CardHeader title="Khoản cần thu">
          <span className="text-xs text-muted">{rows.length} khoản</span>
        </CardHeader>
        <ul className="flex flex-col gap-3 p-4">
          {rows.map((row) => (
            <li key={row.payment.paymentId}>
              <PaymentTicket
                row={row}
                description={describePaymentRow(row, todayKey)}
                selected={row.payment.paymentId === selectedPayment.paymentId}
                onSelect={() => setSelectedPaymentId(row.payment.paymentId)}
              />
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CounterPaymentForm
          key={selectedPayment.paymentId}
          row={selected}
          confirmerName={confirmerName}
          isSubmitting={payMutation.isPending}
          onSubmit={(request) => {
            if (payMutation.isPending) return;
            payMutation.mutate({ paymentId: selectedPayment.paymentId, amount: selectedPayment.amount, request });
          }}
        />
      </Card>
    </div>
  );
}
