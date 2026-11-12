import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import type { AppointmentDetail, Species } from "@/lib/api/types";
import { describeSchedule } from "@/lib/appointments";
import { formatNameList } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

type CurrentAppointmentCardProps = {
  appointment: AppointmentDetail;
  petName: string;
  // null khi chưa tải được hồ sơ thú cưng.
  species: Species | null;
};

export function CurrentAppointmentCard({ appointment, petName, species }: CurrentAppointmentCardProps) {
  const serviceNames = (appointment.services ?? []).flatMap((service) => (service.name ? [service.name] : []));
  const schedule = describeSchedule(appointment);
  const summary = serviceNames.length > 0 ? `${schedule}. ${formatNameList(serviceNames)}` : schedule;

  return (
    <div className="mb-4 flex items-center gap-3.5 rounded-xl bg-mist px-4 py-3.5">
      {species !== null && <PetAvatar species={species} />}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">Lịch hiện tại</div>
        <div className="font-semibold">{`${petName} · ${APPOINTMENT_TYPE_LABELS[appointment.type]}`}</div>
        <div className="text-[13px] text-muted">{summary}</div>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
  );
}

