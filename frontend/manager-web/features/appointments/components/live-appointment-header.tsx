"use client";

import { useRef, useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { describeSpaAppointment } from "@/features/appointments/evidence";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatTime } from "@/lib/format";
import { usePet } from "@/lib/queries/pets";
import { canCancelAppointment } from "../cancel";
import { canRescheduleAppointment } from "../forms";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { RescheduleHotelDialog } from "./reschedule-hotel-dialog";
import { RescheduleSpaDialog } from "./reschedule-spa-dialog";

// “LH-… . Khách. Nhận 08/10/2026 09:00. Trả 10/10/2026 12:00.” – thiếu dữ liệu thì bỏ phần đó.
function describeHotelAppointment(appointment: AppointmentDetail, code: string): string {
  const parts = [code];
  if (appointment.customerName) parts.push(appointment.customerName);
  if (appointment.plannedCheckIn) {
    parts.push(`Nhận ${formatDate(appointment.plannedCheckIn)} ${formatTime(appointment.plannedCheckIn)}`);
  }
  if (appointment.plannedCheckOut) {
    parts.push(`Trả ${formatDate(appointment.plannedCheckOut)} ${formatTime(appointment.plannedCheckOut)}`);
  }
  return `${parts.join(". ")}.`;
}

// MW-05 vùng 1 – Tiêu đề lịch hẹn thật (UI-Screens.md).
export function LiveAppointmentHeader({ appointment }: { appointment: AppointmentDetail }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [activeModal, setActiveModal] = useState<"reschedule" | "cancel" | null>(null);

  const { data: pet } = usePet(appointment.petId);
  const code = formatAppointmentCode(appointment.appointmentId);
  const petName = appointment.petName ?? pet?.name ?? "thú cưng";
  const title = appointment.type === "Spa" ? `Lịch spa của ${petName}` : `Lịch lưu trú của ${petName}`;
  const description =
    appointment.type === "Spa"
      ? describeSpaAppointment(appointment, code)
      : describeHotelAppointment(appointment, code);

  const canReschedule = canRescheduleAppointment(appointment);
  const canCancel = canCancelAppointment(appointment);

  return (
    <>
      <header className="flex items-center gap-4">
        {pet && <PetAvatar species={pet.species} />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 ref={headingRef} tabIndex={-1}>
              {title}
            </h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-1 text-muted">{description}</p>
        </div>
        {(canReschedule || canCancel) && (
          <div className="ml-auto flex shrink-0 gap-2.5">
            {canReschedule && (
              <Button variant="secondary" onClick={() => setActiveModal("reschedule")}>
                Đổi lịch
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setActiveModal("cancel")}>
                Hủy lịch
              </Button>
            )}
          </div>
        )}
      </header>

      {activeModal === "reschedule" &&
        (appointment.type === "Spa" ? (
          <RescheduleSpaDialog
            appointment={appointment}
            onClose={() => setActiveModal(null)}
            fallbackFocusRef={headingRef}
          />
        ) : (
          <RescheduleHotelDialog
            appointment={appointment}
            onClose={() => setActiveModal(null)}
            fallbackFocusRef={headingRef}
          />
        ))}

      {activeModal === "cancel" && (
        <CancelAppointmentDialog
          appointment={appointment}
          onClose={() => setActiveModal(null)}
          fallbackFocusRef={headingRef}
        />
      )}
    </>
  );
}
