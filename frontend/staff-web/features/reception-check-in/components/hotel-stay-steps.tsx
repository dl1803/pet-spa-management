import { PaymentBadge } from "@/components/domain/payment-badge";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { describeStayFormula, describeStayPaid, type StayCharge } from "@/features/reception-check-in/check-in";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";

const STEP_BOX_CLASS = "flex items-center gap-3 rounded-xl border px-4 py-3.5 max-[640px]:flex-wrap";

function TodoMark() {
  return <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-2 border-line" />;
}

type HotelStayPaymentStepProps = {
  stay: StayCharge;
  appointment: AppointmentDetail;
  // Đã đối chiếu cân nặng và không còn chờ khách xác nhận chi phí: được phép mở màn Thanh toán.
  canCollect: boolean;
  // Bước bị tô đậm khi tiếp nhận bị từ chối vì chưa thu tiền.
  isHighlighted: boolean;
};

export function HotelStayPaymentStep({ stay, appointment, canCollect, isHighlighted }: HotelStayPaymentStepProps) {
  const { payment } = stay;
  if (payment.status === "Paid") {
    const detail = describeStayPaid(payment);
    return (
      <div className={`${STEP_BOX_CLASS} border-[#BFE0CA] bg-success-50`}>
        <Icon name="check-circle" className="size-[18px] shrink-0 text-success" />
        <div className="min-w-0 grow">
          <div className="font-semibold">{`Đã thu tiền lưu trú: ${formatMoney(payment.amount)}`}</div>
          {detail !== null && <div className="text-xs text-muted">{detail}</div>}
        </div>
        <PaymentBadge status="Paid" />
      </div>
    );
  }

  const formula = describeStayFormula(appointment, stay);
  const note = "Thu tại quầy trước khi bé vào chuồng.";
  return (
    <div
      data-highlighted={isHighlighted ? "true" : undefined}
      className={`${STEP_BOX_CLASS} ${isHighlighted ? "border-lagoon ring-2 ring-lagoon/25" : "border-line"}`}
    >
      <TodoMark />
      <div className="min-w-0 grow">
        <div className="font-semibold">{`Thu tiền lưu trú: ${formatMoney(payment.amount)}`}</div>
        <div className="text-xs text-muted">{formula !== null ? `${formula}. ${note}` : note}</div>
      </div>
      {canCollect ? (
        <ButtonLink variant="secondary" href={withQuery(ROUTES.payments, { appointmentId: appointment.appointmentId })}>
          Thu tiền
        </ButtonLink>
      ) : (
        <Button variant="secondary" disabled>
          Thu tiền
        </Button>
      )}
    </div>
  );
}

export function HotelCageStep({ petName, cageCode }: { petName: string; cageCode: string | null }) {
  return (
    <div className={`${STEP_BOX_CLASS} border-line`}>
      <TodoMark />
      <div className="min-w-0 grow">
        <div className="font-semibold">{cageCode !== null ? `Đưa bé vào chuồng ${cageCode}` : "Đưa bé vào chuồng"}</div>
        <div className="text-xs text-muted">
          {cageCode !== null ? `Lịch chuyển sang Đang lưu trú, chuồng ${cageCode} hiển thị đang chứa ${petName}.` : "Lịch chuyển sang Đang lưu trú."}
        </div>
      </div>
    </div>
  );
}
