import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardBody } from "@/components/ui/card";
import type { AppointmentDetail, Payment } from "@/lib/api/types";
import {
  formatAppointmentCode,
  formatDate,
  formatMoney,
  formatShortDate,
  formatTime,
  formatTimeRange,
  lowerFirst,
} from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { countNights } from "@/lib/time";

type HistoryView = {
  date: string;
  sub: string;
  title: string;
  note: string;
};

const EMPTY_VIEW: HistoryView = { date: "—", sub: "", title: "", note: "" };

function describeAmount(payment: Payment) {
  if (payment.status === "Unpaid") return `${formatMoney(payment.amount)}, chưa thanh toán`;
  const method = payment.method ? `, ${lowerFirst(PAYMENT_METHOD_LABELS[payment.method])}` : "";
  return `${formatMoney(payment.amount)}${method}`;
}

function describeSpaPayment(payment: Payment | undefined) {
  if (!payment) return "";
  if (payment.status === "Unpaid") return `Chưa thanh toán ${formatMoney(payment.amount)}.`;
  return `Đã thanh toán ${describeAmount(payment)}.`;
}

function describeStayPayments(stay: Payment | undefined, lateFee: Payment | undefined) {
  const parts: string[] = [];
  if (stay) parts.push(`Tiền lưu trú ${describeAmount(stay)}.`);
  parts.push(lateFee ? `Phí trả muộn ${describeAmount(lateFee)}.` : "Không phát sinh phí trả muộn.");
  return parts.join(" ");
}

function getHistoryView(appointment: AppointmentDetail, payments: Payment[]): HistoryView {
  if (appointment.type === "Hotel") {
    const { plannedCheckIn, plannedCheckOut } = appointment;
    const checkOut = appointment.actualCheckOut ?? plannedCheckOut;
    if (!plannedCheckIn || !plannedCheckOut || !checkOut) return EMPTY_VIEW;
    return {
      date: formatDate(checkOut),
      sub: `${countNights(plannedCheckIn, plannedCheckOut)} đêm`,
      title: `Nhận ${formatShortDate(plannedCheckIn)} ${formatTime(plannedCheckIn)}, trả ${formatShortDate(checkOut)} ${formatTime(checkOut)}.`,
      note: describeStayPayments(
        payments.find((payment) => payment.kind === "Stay"),
        payments.find((payment) => payment.kind === "LateFee"),
      ),
    };
  }

  const { slotStart, slotEnd } = appointment;
  if (!slotStart || !slotEnd) return EMPTY_VIEW;
  const serviceNames = (appointment.services ?? []).flatMap((service) => (service.name ? [service.name] : []));
  const staffNames = (appointment.staff ?? []).flatMap((member) => (member.fullName ? [member.fullName] : []));
  const noteParts = [
    staffNames.length > 0 ? `Nhân viên ${staffNames.join(", ")}.` : "",
    describeSpaPayment(payments.find((payment) => payment.kind === "Spa")),
  ].filter(Boolean);
  return {
    date: formatDate(slotStart),
    sub: formatTimeRange(slotStart, slotEnd),
    title: serviceNames.join(", "),
    note: noteParts.join(" "),
  };
}

type HistoryCardProps = {
  appointment: AppointmentDetail;
  payments: Payment[];
};

export function HistoryCard({ appointment, payments }: HistoryCardProps) {
  const view = getHistoryView(appointment, payments);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-5 max-sm:flex-col max-sm:gap-3">
          <div className="w-[110px] shrink-0">
            <div className="font-semibold tabular-nums">{view.date}</div>
            {view.sub && <div className="text-xs text-muted">{view.sub}</div>}
          </div>
          <div className="min-w-0 grow">
            <div className="flex flex-wrap items-center gap-2">
              <AppointmentTypeLabel type={appointment.type} />
              <span className="text-xs text-muted">{formatAppointmentCode(appointment.appointmentId)}</span>
              <StatusBadge status={appointment.status} />
            </div>
            {view.title && <div className="mt-1 font-semibold">{view.title}</div>}
            {view.note && <div className="mt-1 text-xs leading-5 text-muted">{view.note}</div>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

