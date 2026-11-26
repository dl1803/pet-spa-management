// MW-05 Chi tiết lịch hẹn (quản lý) – UI-Screens.md
import { LiveAppointmentDetail } from "@/features/appointments/components/live-appointment-detail";

export function AppointmentDetailScreen({ appointmentId }: { appointmentId: string }) {
  return <LiveAppointmentDetail appointmentId={appointmentId} />;
}
