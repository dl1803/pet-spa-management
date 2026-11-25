// MW-05 Chi tiết lịch hẹn (quản lý) – UI-Screens.md
import { AppointmentDetailContent } from "@/features/appointments/components/appointment-detail-content";
import { LiveAppointmentDetail } from "@/features/appointments/components/live-appointment-detail";
import { findMockSpaAppointment } from "@/features/appointments/evidence";

export function AppointmentDetailScreen({ appointmentId }: { appointmentId: string }) {
  // Trang Tổng quan đã dùng lịch thật nên không còn liên kết tới nhánh mô phỏng; nhánh này chỉ còn làm nơi đặt thẻ Cập nhật trạng thái cho tới khi thẻ nối API thật, rồi bỏ.
  if (findMockSpaAppointment(appointmentId) !== null) return <AppointmentDetailContent appointmentId={appointmentId} />;
  return <LiveAppointmentDetail appointmentId={appointmentId} />;
}
