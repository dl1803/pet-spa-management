"use client";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { EvidencePhotos } from "@/features/appointments/components/evidence-photos";
import { useAppointmentPhotos } from "@/lib/queries/appointments";

// MW-05 vùng 4 – Ảnh minh chứng của lịch spa thật (UI-Screens.md; FR-EXE-09). Chỉ xem.
export function LiveEvidencePhotos({ appointmentId, petName }: { appointmentId: string; petName: string }) {
  const { data, error, refetch } = useAppointmentPhotos(appointmentId);

  if (data !== undefined) {
    return <EvidencePhotos photos={data} petName={petName} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button variant="secondary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <p role="status" aria-busy="true" className="text-muted">
      Đang tải ảnh minh chứng…
    </p>
  );
}
