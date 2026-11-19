import { Alert } from "@/components/feedback/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Payment } from "@/lib/api/types";
import { formatDayAndTime, formatMoney } from "@/lib/format";
import { GATEWAY_LABELS } from "@/lib/labels";
import { ONLINE_PAYMENT_GATEWAY, type PaymentResultState } from "@/lib/payments";
import { ROUTES } from "@/lib/routes";

type PaymentResultAlertProps = {
  state: PaymentResultState;
  payment: Payment | undefined;
  onRetry: () => void;
};

// CW-09 vùng 9 – UI-Screens.md. Thành công chỉ khi server báo khoản Đã thanh toán, không dựa vào việc quay về từ cổng.
export function PaymentResultAlert({ state, payment, onRetry }: PaymentResultAlertProps) {
  if (state === "checking") {
    return (
      <Alert tone="info" icon="timer" title="Đang xác nhận thanh toán">
        Cổng thanh toán đang gửi kết quả cho cửa hàng, vui lòng đợi trong giây lát.
      </Alert>
    );
  }

  if (state === "success" && payment !== undefined) {
    // Payment không có trường cổng; chỉ có một cổng được hỗ trợ nên ghi theo hằng số khi khoản trả trực tuyến.
    const via = payment.method === "Online" ? ` qua ${GATEWAY_LABELS[ONLINE_PAYMENT_GATEWAY]}` : "";
    const at = payment.paidAt ? ` lúc ${formatDayAndTime(payment.paidAt)}` : "";
    return (
      <Alert tone="success" title="Thanh toán thành công">
        <p>{`Cửa hàng đã nhận ${formatMoney(payment.amount)}${via}${at}.`}</p>
        <div className="mt-3">
          <ButtonLink href={ROUTES.appointments} variant="secondary">
            Về lịch hẹn của tôi
          </ButtonLink>
        </div>
      </Alert>
    );
  }

  if (state === "failed") {
    return (
      <Alert tone="danger" title="Thanh toán chưa thành công">
        <p>
          Cổng thanh toán chưa xác nhận giao dịch. Khoản thanh toán vẫn là Chưa thanh toán, bạn chưa bị trừ tiền. Bạn có
          thể thử lại hoặc thanh toán tại quầy khi đón bé.
        </p>
        <div className="mt-3">
          <Button onClick={onRetry}>Thử lại</Button>
        </div>
      </Alert>
    );
  }

  return null;
}
