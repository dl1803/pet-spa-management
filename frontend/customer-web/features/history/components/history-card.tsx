"use client";

import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryPhotos } from "@/features/history/components/history-photos";
import { getErrorMessage } from "@/lib/api/errors";
import type { Appointment, AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatShortDate, formatTime, formatTimeRange } from "@/lib/format";
import { useAppointment, useAppointmentPhotos } from "@/lib/queries/appointments";
import { countNights } from "@/lib/time";

type HistoryView = {
  date: string;
  sub: string;
  title: string;
  note: string;
};

const EMPTY_VIEW: HistoryView = { date: "—", sub: "", title: "", note: "" };

function getHistoryView(appointment: AppointmentDetail): HistoryView {
  if (appointment.type === "Hotel") {
    const { plannedCheckIn, plannedCheckOut } = appointment;
    const checkOut = appointment.actualCheckOut ?? plannedCheckOut;
    if (!plannedCheckIn || !plannedCheckOut || !checkOut) return EMPTY_VIEW;
    return {
      date: formatDate(checkOut),
      sub: `${countNights(plannedCheckIn, plannedCheckOut)} đêm`,
      title: `Nhận ${formatShortDate(plannedCheckIn)} ${formatTime(plannedCheckIn)}, trả ${formatShortDate(checkOut)} ${formatTime(checkOut)}.`,
      note: "",
    };
  }

  const { slotStart, slotEnd } = appointment;
  if (!slotStart || !slotEnd) return EMPTY_VIEW;
  const serviceNames = (appointment.services ?? []).flatMap((service) => (service.name ? [service.name] : []));
  const staffNames = (appointment.staff ?? []).flatMap((member) => (member.fullName ? [member.fullName] : []));
  return {
    date: formatDate(slotStart),
    sub: formatTimeRange(slotStart, slotEnd),
    title: serviceNames.join(", "),
    note: staffNames.length > 0 ? `Nhân viên ${staffNames.join(", ")}.` : "",
  };
}

type HistoryCardProps = {
  appointment: Appointment;
};

export function HistoryCard({ appointment }: HistoryCardProps) {
  // Dịch vụ và nhân viên chỉ có ở chi tiết lịch spa (UI-Screens G-05); tải khi thẻ hiện ra. Lịch lưu trú không cần.
  const detail = useAppointment(appointment.type === "Spa" ? appointment.appointmentId : null);
  const view = getHistoryView(detail.data ?? appointment);
  // Ảnh nhỏ Trước/Sau chỉ có ở lịch spa; cũng tải khi thẻ hiện ra.
  const photos = useAppointmentPhotos(appointment.appointmentId, { enabled: appointment.type === "Spa" });

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
            {detail.isLoading && <Skeleton className="mt-2 h-4 w-48 rounded-[10px]" />}
            {detail.error !== null && (
              <div className="mt-1 flex items-center gap-2 text-xs leading-5 text-muted">
                <span>{getErrorMessage(detail.error)}</span>
                <button
                  type="button"
                  onClick={() => void detail.refetch()}
                  className="font-medium text-foreground underline hover:opacity-80"
                >
                  Thử lại
                </button>
              </div>
            )}
            {view.note && <div className="mt-1 text-xs leading-5 text-muted">{view.note}</div>}
          </div>
          {appointment.type === "Spa" && (
            <HistoryPhotos
              photos={photos.data}
              error={photos.error}
              isRetrying={photos.isFetching}
              onRetry={() => void photos.refetch()}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
