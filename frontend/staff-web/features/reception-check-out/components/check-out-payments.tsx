import type { ReactNode } from "react";
import { PaymentBadge } from "@/components/domain/payment-badge";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { describePaid, findPayment } from "@/features/reception-check-out/check-out";
import type { Payment } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";

function PaymentRow({ title, note, payment }: { title: string; note: ReactNode; payment: Payment | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        {note !== null && <div className="text-xs text-muted">{note}</div>}
      </div>
      {payment !== null && (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="font-bold tabular-nums">{formatMoney(payment.amount)}</div>
          <PaymentBadge status={payment.status} />
        </div>
      )}
    </div>
  );
}

type CheckOutPaymentsCardProps = { payments: Payment[]; appointmentId: string };

export function CheckOutPaymentsCard({ payments, appointmentId }: CheckOutPaymentsCardProps) {
  const stay = findPayment(payments, "Stay");
  const lateFee = findPayment(payments, "LateFee");
  return (
    <Card>
      <CardHeader title="Thanh toán" />
      <CardBody>
        <div className="flex flex-col gap-4">
          {stay !== null && <PaymentRow title="Tiền lưu trú" note={stay.status === "Paid" ? describePaid(stay) : null} payment={stay} />}
          <PaymentRow
            title="Phí trả muộn"
            note={lateFee === null ? "Không phát sinh" : lateFee.status === "Paid" ? describePaid(lateFee) : null}
            payment={lateFee}
          />
          {lateFee !== null && lateFee.status !== "Paid" && (
            <ButtonLink variant="secondary" block href={withQuery(ROUTES.payments, { appointmentId })}>
              <Icon name="wallet" />
              Thu phí trả muộn
            </ButtonLink>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
