// MW-05 Chi tiết lịch hẹn (quản lý) – UI-Screens.md
import { AppointmentDetailContent } from "@/features/appointments/components/appointment-detail-content";
import { LiveAppointmentDetail } from "@/features/appointments/components/live-appointment-detail";
import { findMockSpaAppointment } from "@/features/appointments/evidence";

export function AppointmentDetailScreen({ appointmentId }: { appointmentId: string }) {
  // Lịch trong dữ liệu mô phỏng của trang tổng quan vẫn dùng nhánh mô phỏng; nhánh này bỏ khi vùng ảnh/tiến độ nối API thật.
  if (findMockSpaAppointment(appointmentId) !== null) return <AppointmentDetailContent appointmentId={appointmentId} />;
  return <LiveAppointmentDetail appointmentId={appointmentId} />;
}
