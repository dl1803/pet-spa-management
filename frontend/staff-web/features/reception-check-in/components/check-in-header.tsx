import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import type { CheckInData } from "@/features/reception-check-in/check-in";
import { formatAppointmentCode, formatShortDate, formatTime, formatTimeRange } from "@/lib/format";
import { SPECIES_LABELS } from "@/lib/labels";

function describeAppointment({ appointment, cageCode }: CheckInData) {
  const code = `${formatAppointmentCode(appointment.appointmentId)}.`;
  if (appointment.type === "Spa") {
    const staffNames = (appointment.staff ?? []).map((member) => member.fullName).filter((name) => name !== undefined);
    return [
      code,
      appointment.slotStart && appointment.slotEnd ? `Spa ${formatTimeRange(appointment.slotStart, appointment.slotEnd)}.` : null,
      staffNames.length > 0 ? `Nhân viên phụ trách: ${staffNames.join(", ")}` : null,
    ];
  }
  const dayAndTime = (value: string) => `${formatShortDate(value)} ${formatTime(value)}`;
  return [
    code,
    appointment.plannedCheckIn && appointment.plannedCheckOut
      ? `Lưu trú ${dayAndTime(appointment.plannedCheckIn)} → ${dayAndTime(appointment.plannedCheckOut)}.`
      : null,
    cageCode !== null ? `Chuồng ${cageCode}` : null,
  ];
}

export function CheckInHeader({ data }: { data: CheckInData }) {
  const { appointment, pet } = data;
  const details = describeAppointment(data).filter((part) => part !== null);

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

