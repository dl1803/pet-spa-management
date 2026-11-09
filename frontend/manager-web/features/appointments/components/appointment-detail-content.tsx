// features/appointments/components/appointment-detail-content.tsx
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentHeader } from "@/features/appointments/components/appointment-header";
import { EvidencePhotos } from "@/features/appointments/components/evidence-photos";
import { findMockSpaAppointment } from "@/features/appointments/evidence";
import { formatAppointmentCode } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

export function AppointmentDetailContent({ appointmentId }: { appointmentId: string }) {
  const found = findMockSpaAppointment(appointmentId);

  if (found === null) {
    return (
      <EmptyState
        icon="clipboard"
        title="Không tìm thấy lịch hẹn"
        description="Lịch hẹn không tồn tại hoặc chưa có trang chi tiết."
        action={
          <Link href={ROUTES.dashboard} className="font-semibold text-lagoon-700 underline">
            Về trang tổng quan
          </Link>
        }
      />
    );
  }

  const { appointment, species, photos } = found;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">Lịch hẹn › {formatAppointmentCode(appointment.appointmentId)}</p>
      <AppointmentHeader appointment={appointment} species={species} />
      <EvidencePhotos photos={photos} petName={appointment.petName ?? "thú cưng"} />
    </div>
  );
}
