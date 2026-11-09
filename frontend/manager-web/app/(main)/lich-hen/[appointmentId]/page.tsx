// app/(main)/lich-hen/[appointmentId]/page.tsx
import { Suspense } from "react";
import { AppointmentDetailContent } from "@/features/appointments/components/appointment-detail-content";

export default function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  return (
    <Suspense fallback={<p role="status" aria-busy="true" className="text-muted">Đang tải lịch hẹn…</p>}>
      {params.then(({ appointmentId }) => <AppointmentDetailContent appointmentId={appointmentId} />)}
    </Suspense>
  );
}
