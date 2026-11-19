import { PaymentBadge } from "@/components/domain/payment-badge";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Payment } from "@/lib/api/types";
import { formatDayAndTime, formatMoney } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";

type AppointmentPaymentCardProps = {
  // undefined khi chưa tải xong hoặc lịch chưa có khoản Spa.
  payment: Payment | undefined;
  isLoading: boolean;
  error: unknown;
  isRetrying: boolean;
  isOnlineActionHidden: boolean;
  onRetry: () => void;
  onPayOnline: () => void;
};

function PaymentCardSkeleton() {
  return (
    <Card>
      <CardHeader title="Thanh toán" />
      <CardBody>
        <div role="status" aria-busy="true">
          <span className="sr-only">Đang tải khoản thanh toán…</span>
          <Skeleton className="h-4 w-24 rounded-[10px]" />
          <Skeleton className="mt-2 h-7 w-40 rounded-[10px]" />
        </div>
      </CardBody>
    </Card>
  );
}

function PaidRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

// CW-09 vùng 7 (chỉ lịch spa Hoàn tất) – UI-Screens.md
export function AppointmentPaymentCard({
  payment,
  isLoading,
  error,
  isRetrying,
  isOnlineActionHidden,
  onRetry,
  onPayOnline,
}: AppointmentPaymentCardProps) {
  if (payment === undefined) {
    if (isLoading) return <PaymentCardSkeleton />;
    if (error !== null) {
      return (
        <Card>
          <CardHeader title="Thanh toán" />
          <CardBody>
            <ErrorAlert error={error} />
            <div className="mt-4">
              <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
                Thử lại
              </Button>
            </div>
          </CardBody>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card>
      <CardHeader title="Thanh toán" />
      <CardBody>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-muted">{PAYMENT_KIND_LABELS[payment.kind]}</div>
            <div className="text-[22px] font-bold leading-7 tabular-nums">{formatMoney(payment.amount)}</div>
          </div>
          <PaymentBadge status={payment.status} />
        </div>
        {payment.status === "Paid" ? (
          <dl className="mt-4 flex flex-col gap-1.5 border-t border-line-soft pt-3.5">
            {payment.method ? <PaidRow label="Phương thức" value={PAYMENT_METHOD_LABELS[payment.method]} /> : null}
            {payment.paidAt ? <PaidRow label="Thời điểm" value={formatDayAndTime(payment.paidAt)} /> : null}
          </dl>
        ) : (
          <>
            {!isOnlineActionHidden && (
              <div className="mt-4">
                <Button block onClick={onPayOnline}>
                  <Icon name="wallet" className="size-4" />
                  Thanh toán trực tuyến
                </Button>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">Hoặc thanh toán tại quầy (tiền mặt, chuyển khoản QR) khi đón bé.</p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
