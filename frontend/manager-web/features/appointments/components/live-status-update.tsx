"use client";

import { StatusUpdateCard } from "@/features/appointments/components/status-update-card";
import type { SpaStatusAction } from "@/features/appointments/status-update";
import type { AppointmentDetail } from "@/lib/api/types";
import { useAppointmentPhotos, useCompleteAppointment, useStartAppointment } from "@/lib/queries/appointments";

// MW-05 vùng 7 – Cập nhật trạng thái của lịch spa thật (FR-EXE-05). Chỉ hiện khi đã có danh sách ảnh để tính lý do khóa nút;
// lúc đang tải hoặc tải ảnh lỗi, vùng Ảnh minh chứng bên cạnh đã hiện trạng thái đang tải / lỗi kèm nút Thử lại.
export function LiveStatusUpdate({ appointment }: { appointment: AppointmentDetail }) {
  const { data: photos } = useAppointmentPhotos(appointment.appointmentId);
  const start = useStartAppointment();
  const complete = useCompleteAppointment();

  if (photos === undefined) return null;

  async function handleAdvance(action: SpaStatusAction) {
    if (action === "start") {
      await start.mutateAsync(appointment.appointmentId);
    } else {
      await complete.mutateAsync(appointment.appointmentId);
    }
  }

  return <StatusUpdateCard appointment={appointment} photos={photos} onAdvance={handleAdvance} />;
}
