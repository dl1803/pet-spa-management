// features/appointments/components/appointment-header.tsx
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { describeSpaAppointment } from "@/features/appointments/evidence";
import type { AppointmentDetail, Species } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";

// MW-05 vùng 1 – Tiêu đề lịch spa (UI-Screens.md). Chưa có nút Đổi lịch và Hủy lịch (thuộc bước làm riêng).
export function AppointmentHeader({ appointment, species }: { appointment: AppointmentDetail; species: Species }) {
  const code = formatAppointmentCode(appointment.appointmentId);
  const petName = appointment.petName ?? "thú cưng";

  return (
    <header className="flex items-center gap-4">
      <PetAvatar species={species} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1>Lịch spa của {petName}</h1>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="mt-1 text-muted">{describeSpaAppointment(appointment, code)}</p>
      </div>
    </header>
  );
}
