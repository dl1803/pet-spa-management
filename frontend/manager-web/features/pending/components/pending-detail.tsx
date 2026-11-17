"use client";

import { useId } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import { Card, CardBody } from "@/components/ui/card";
import type { Appointment } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";
import { usePet } from "@/lib/queries/pets";
import { countNights } from "@/lib/time";
import { getPetTitle } from "../pet-summary";
import { formatSlotRange } from "../spa-summary";
import { formatStayMoment } from "../stay-summary";
import { PetProfilePanel } from "./pet-profile-panel";
import { SpaAssignment } from "./spa-assignment";

function InfoCell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

// Ô thông tin chỉ dựng từ trường GET /appointments trả về; trường thiếu thì bỏ ô, không thay bằng số liệu giả.
function getInfoCells(appointment: Appointment) {
  const cells: { label: string; value: string; note?: string }[] = [];
  if (appointment.type === "Spa") {
    if (appointment.slotStart && appointment.slotEnd) {
      cells.push({ label: "Khung giờ", value: formatSlotRange(appointment.slotStart, appointment.slotEnd) });
    }
    if (appointment.staffRequired) cells.push({ label: "Số nhân viên cần", value: `${appointment.staffRequired} người` });
    return cells;
  }
  if (appointment.plannedCheckIn) cells.push({ label: "Nhận", value: formatStayMoment(appointment.plannedCheckIn) });
  if (appointment.plannedCheckOut) {
    const nights = appointment.plannedCheckIn ? countNights(appointment.plannedCheckIn, appointment.plannedCheckOut) : null;
    cells.push({
      label: "Trả",
      value: formatStayMoment(appointment.plannedCheckOut),
      note: nights !== null && nights > 0 ? `${nights} đêm` : undefined,
    });
  }
  return cells;
}

// MW-04 vùng 3, 4 và hồ sơ thú cưng của lịch đang chọn; lịch spa có thêm vùng 5, 6 (nhân viên, xác nhận, từ chối) ở SpaAssignment.
// Lịch lưu trú chưa có vùng 5 – 8 (chuồng, xác nhận, từ chối): nối API ở bước riêng. Tên khách, SĐT, dịch vụ, số tiền chưa có
// trong API cho Quản lý (UI-Screens G-05) nên không hiển thị.
type PendingDetailProps = {
  appointment: Appointment;
  // Gọi sau khi lịch spa được xác nhận hoặc từ chối thành công.
  onProcessed: () => void;
};

export function PendingDetail({ appointment, onProcessed }: PendingDetailProps) {
  const titleId = `${useId()}-title`;
  const { data: pet, error, isPending, refetch } = usePet(appointment.petId);
  const petName = appointment.petName ?? "Thú cưng";
  const title = pet ? getPetTitle(pet, appointment.sizeGroup) : `${petName}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`;
  const infoCells = getInfoCells(appointment);

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
          {pet ? (
            <PetAvatar species={pet.species} />
          ) : (
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-mist text-lagoon">
              <Icon name={appointment.type === "Spa" ? "droplet" : "bed"} className="size-6" />
            </span>
          )}
          <div className="min-w-0 grow">
            <h2 id={titleId} className="break-words">{title}</h2>
            <p className="text-xs text-muted">
              {formatAppointmentCode(appointment.appointmentId)}
              {appointment.customerName ? `. ${appointment.customerName}` : ""}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <CardBody>
          {infoCells.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-2.5 max-[640px]:grid-cols-1">
              {infoCells.map((cell) => (
                <InfoCell key={cell.label} {...cell} />
              ))}
            </div>
          )}
          <PetProfilePanel pet={pet} isPending={isPending} error={error} onRetry={() => void refetch()} />
        </CardBody>
        {appointment.type === "Spa" && <SpaAssignment appointment={appointment} onProcessed={onProcessed} />}
      </Card>
    </section>
  );
}
