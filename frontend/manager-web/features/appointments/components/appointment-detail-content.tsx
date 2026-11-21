import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { MockSpaDetail } from "@/features/appointments/components/mock-spa-detail";
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

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">Lịch hẹn › {formatAppointmentCode(found.appointment.appointmentId)}</p>
      <MockSpaDetail found={found} />
    </div>
  );
}
