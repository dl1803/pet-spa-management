"use client";

// SW-11 Thực hiện dịch vụ – UI-Screens.md

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { ButtonLink, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ExecutionWorkspace } from "@/features/service-execution/components/execution-workspace";
import { isForbiddenError, toApiError } from "@/lib/api/errors";
import { useAppointment, useAppointmentPhotos } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

// Chi tiết lịch đang Received/InProgress làm mới 30 giây, chỉ khi tab đang hiển thị (Frontend-Architecture mục 5.1) (Đề xuất).
const EXECUTION_REFETCH_MS = 30_000;

function NotFound() {
  return (
    <EmptyState
      icon="clipboard"
      title="Không tìm thấy lịch hẹn"
      description="Lịch hẹn không tồn tại hoặc không thuộc phạm vi được phân công cho bạn."
      action={
        <ButtonLink href={ROUTES.appointments} variant="secondary">
          Về danh sách lịch hẹn
        </ButtonLink>
      }
    />
  );
}

function LiveExecution({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const detail = useAppointment(appointmentId, { refetchInterval: EXECUTION_REFETCH_MS });
  const pet = usePet(detail.data?.petId ?? null);
  const photos = useAppointmentPhotos(appointmentId);

  if (detail.isPending) {
    return (
      <div>
        <Skeleton className="mb-4 h-24 w-full rounded-[28px]" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (detail.error && !detail.data) {
    if (isForbiddenError(detail.error)) return <ForbiddenState />;
    if (toApiError(detail.error).status === 404) return <NotFound />;
    return <ErrorAlert error={detail.error} />;
  }

  if (!detail.data) return null;

  if (pet.isPending || photos.isPending) {
    return (
      <div>
        <Skeleton className="mb-4 h-24 w-full rounded-[28px]" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!pet.data || !photos.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={pet.error ?? photos.error} className="w-full" />
        <Button
          variant="secondary"
          onClick={() => {
            if (!pet.data) void pet.refetch();
            if (!photos.data) void photos.refetch();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <ExecutionWorkspace
      key={appointmentId}
      data={{ appointment: detail.data, pet: pet.data, photos: photos.data }}
      todayKey={getStoreDateKey(now)}
      onCompleted={() => router.push(ROUTES.workHistory)}
    />
  );
}

export function ServiceExecutionScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();

  return <LiveExecution key={appointmentId} appointmentId={appointmentId} />;
}
