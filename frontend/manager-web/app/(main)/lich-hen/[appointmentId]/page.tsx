// app/(main)/lich-hen/[appointmentId]/page.tsx
import { Suspense } from "react";
import { AppointmentDetailScreen } from "@/features/appointments/screens/appointment-detail-screen";

export default function Page() {
  return (
    <Suspense fallback={<p role="status" aria-busy="true" className="text-muted">Đang tải lịch hẹn…</p>}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}
