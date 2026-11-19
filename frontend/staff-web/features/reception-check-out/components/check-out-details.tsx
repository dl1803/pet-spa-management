import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { describeCage, formatReturnMoment, type CheckOutCage, type CheckOutData } from "@/features/reception-check-out/check-out";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatTime } from "@/lib/format";
import { SPECIES_LABELS } from "@/lib/labels";

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
    </div>
  );
}

export function CheckOutHeader({ data }: { data: CheckOutData }) {
  const { appointment, pet, cage } = data;
  const details = [`${formatAppointmentCode(appointment.appointmentId)}.`, `Chủ: ${appointment.customerName ?? "—"}`];
  if (cage !== null) details.splice(1, 0, `Chuồng ${cage.code}.`);
  return (
    <div className="flex items-center gap-4 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
      <PetAvatar species={pet.species} size="xl" />
      <div className="min-w-0 grow">
        <h2>{`${pet.name}, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} ${pet.breed}`}</h2>
        <p className="mt-0.5 text-xs text-muted">{details.join(" ")}</p>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
  );
}

type StayInfoTilesProps = { appointment: AppointmentDetail; cage: CheckOutCage | null };

export function StayInfoTiles({ appointment, cage }: StayInfoTilesProps) {
  return (
    <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
      <Tile label="Chuồng" value={cage !== null ? describeCage(cage) : "—"} />
      <Tile label="Nhận" value={appointment.plannedCheckIn ? formatReturnMoment(appointment.plannedCheckIn) : "—"} />
      <Tile label="Trả dự kiến" value={appointment.plannedCheckOut ? formatReturnMoment(appointment.plannedCheckOut) : "—"} />
    </div>
  );
}

// Ngày và giờ trả thực tế là thời điểm hiện tại, chỉ đọc; API không nhận thời điểm trả từ web.
export function ActualReturnFields({ nowMs }: { nowMs: number }) {
  const nowIso = new Date(nowMs).toISOString();
  return (
    <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
      <Tile label="Ngày trả thực tế" value={formatDate(nowIso)} />
      <Tile label="Giờ trả thực tế" value={formatTime(nowIso)} />
    </div>
  );
}
