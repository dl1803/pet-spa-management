import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import type { ExecutionData } from "@/features/service-execution/execution";
import { formatAppointmentCode, formatTimeRange, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

// Câu mô tả nhóm kích cỡ: đang chờ xác nhận chi phí thì nêu nhóm hồ sơ và nhóm mới (UI-Screens SW-11 vùng 1).
function describeSizeGroup({ appointment }: ExecutionData) {
  const current = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const pending = appointment.pendingCostConfirmation;
  if (pending != null) {
    return `Hồ sơ nhóm ${current}, đang chờ khách xác nhận lên ${SIZE_GROUP_LABELS[pending.newSizeGroup]}.`;
  }
  const weight = appointment.actualWeightKg;
  return weight != null ? `Nhóm ${current} (cân thực tế ${formatWeight(weight)}).` : `Nhóm ${current}.`;
}

// SW-11 vùng 1 – Đầu trang (UI-Screens.md).
export function ExecutionHeader({ data }: { data: ExecutionData }) {
  const { appointment, pet } = data;
  const code = formatAppointmentCode(appointment.appointmentId);
  const details = [
    `${code}.`,
    appointment.customerName ? `Khách ${appointment.customerName}.` : null,
    appointment.slotStart && appointment.slotEnd ? `${formatTimeRange(appointment.slotStart, appointment.slotEnd)}.` : null,
    describeSizeGroup(data),
  ].filter((part) => part !== null);

  return (
    <header className="mb-4">
      <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href={ROUTES.appointments} className="hover:text-lagoon">
          Lịch hẹn
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <span aria-current="page">{code}</span>
      </nav>
      <div className="flex items-center gap-4">
        <PetAvatar species={pet.species} size="xl" />
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{`${pet.name}, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} ${pet.breed}`}</h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-1 text-muted">{details.join(" ")}</p>
        </div>
      </div>
    </header>
  );
}
