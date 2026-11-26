"use client";

import Link from "next/link";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveAppointmentHeader } from "@/features/appointments/components/live-appointment-header";
import { LiveEvidencePhotos } from "@/features/appointments/components/live-evidence-photos";
import { LiveStatusUpdate } from "@/features/appointments/components/live-status-update";
import { isForbiddenError, toApiError } from "@/lib/api/errors";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";

export function LiveAppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const { data, error, isPending, refetch } = useAppointment(appointmentId);

  if (isPending && data === undefined) {
    return (
      <p role="status" aria-busy="true" className="text-muted">
        Đang tải lịch hẹn…
      </p>
    );
  }

  if (error) {
    if (isForbiddenError(error)) {
      return <ForbiddenState />;
    }
    if (toApiError(error).status === 404) {
      return (
        <EmptyState
          icon="clipboard"
          title="Không tìm thấy lịch hẹn"
          description="Lịch hẹn không tồn tại hoặc đã bị thay đổi."
          action={
            <Link href={ROUTES.dashboard} className="font-semibold text-lagoon-700 underline">
              Về trang tổng quan
            </Link>
          }
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button variant="secondary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">Lịch hẹn › {formatAppointmentCode(data.appointmentId)}</p>
      <LiveAppointmentHeader appointment={data} />
      {data.type === "Spa" && (
        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
          <LiveEvidencePhotos appointmentId={data.appointmentId} petName={data.petName ?? "thú cưng"} />
          <LiveStatusUpdate appointment={data} />
        </div>
      )}
    </div>
  );
}
